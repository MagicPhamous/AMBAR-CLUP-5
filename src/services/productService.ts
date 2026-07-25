/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  collection,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { Product, Category, Supplier, Purchase, InventoryMovement, MovementType, User } from '../types';

/**
 * Saves or updates a Category document in Firestore.
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const id = category.id || `cat-${Date.now()}`;
  const docRef = doc(db, 'categories', id);
  await setDoc(docRef, { ...category, id });
}

/**
 * Saves or updates a Supplier document in Firestore.
 */
export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  const id = supplier.id || `sup-${Date.now()}`;
  const docRef = doc(db, 'suppliers', id);
  await setDoc(docRef, { ...supplier, id });
}

/**
 * Saves a new product or updates an existing product.
 * If new, creates an initial Kardex movement.
 */
export async function saveProductToFirestore(product: Product, currentUser: User | null): Promise<void> {
  const isNew = !product.id;
  const id = product.id || `p-${Date.now()}`;
  const productRef = doc(db, 'products', id);

  await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productRef);
    const dateStr = new Date().toISOString();

    if (isNew) {
      const newProduct: Product = {
        ...product,
        id,
        internalCode: product.internalCode || `PROD-${Date.now().toString().slice(-6)}`,
        barCode: product.barCode || `740${Date.now().toString().slice(-10)}`,
        createdAt: dateStr,
        updatedAt: dateStr,
        isActive: true
      };

      transaction.set(productRef, newProduct);

      // Add first Kardex entry
      const movementId = `mov-${Date.now()}`;
      const initialEntry: InventoryMovement = {
        id: movementId,
        productId: id,
        productName: newProduct.name,
        type: MovementType.ENTRY,
        quantity: newProduct.quantity,
        userId: currentUser?.uid || 'system',
        userName: currentUser?.name || 'Sistema',
        date: dateStr,
        cost: newProduct.cost,
        balanceAfter: newProduct.quantity,
        observations: 'Apertura / Registro de producto nuevo'
      };
      const movementRef = doc(db, 'movements', movementId);
      transaction.set(movementRef, initialEntry);
    } else {
      const existingData = productDoc.data() as Product;
      const oldQty = existingData.quantity ?? 0;
      const newQty = Number(product.quantity) ?? 0;

      const updatedProduct: Product = {
        ...existingData,
        ...product,
        quantity: newQty,
        updatedAt: dateStr
      };
      transaction.set(productRef, updatedProduct);

      if (newQty !== oldQty) {
        const diff = newQty - oldQty;
        const movementId = `mov-${Date.now()}`;
        const adjustEntry: InventoryMovement = {
          id: movementId,
          productId: id,
          productName: product.name,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(diff),
          userId: currentUser?.uid || 'system',
          userName: currentUser?.name || 'Sistema',
          date: dateStr,
          cost: product.cost,
          balanceAfter: newQty,
          observations: `Ajuste de stock de ${oldQty} a ${newQty} un. desde edición de producto`
        };
        const movementRef = doc(db, 'movements', movementId);
        transaction.set(movementRef, adjustEntry);
      }
    }
  });
}

/**
 * Soft deletes/deactivates a product by setting isActive = false.
 */
export async function deleteProductFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, { isActive: false, updatedAt: new Date().toISOString() });
}

/**
 * Adjusts product stock manually (merma, mermas de botellas por ml, ajuste auditoría, etc.).
 * Guarantees that stock will NEVER drop below zero.
 * Atomically writes to Kardex.
 */
export async function adjustStockInFirestore(
  productId: string,
  qty: number,
  type: MovementType,
  observations: string,
  currentUser: User | null,
  mlDelta?: number
): Promise<void> {
  const productRef = doc(db, 'products', productId);

  await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productRef);
    if (!productDoc.exists()) {
      throw new Error('El producto no existe.');
    }

    const prod = productDoc.data() as Product;
    let updatedStock = prod.quantity;
    let updatedMl = prod.bottleConfig?.currentMl || 0;

    if (prod.bottleConfig?.isBottle && mlDelta !== undefined) {
      // Milliliter adjustment
      updatedMl += mlDelta;
      if (updatedMl < 0) {
        // Empty bottle! Deduct one full bottle from quantity and recycle ML
        const bottlesLost = Math.floor(Math.abs(updatedMl) / prod.bottleConfig.capacityMl) + 1;
        if (updatedStock < bottlesLost) {
          throw new Error(`Operación rechazada: Stock insuficiente para realizar el descuento de ${bottlesLost} botellas.`);
        }
        updatedStock = updatedStock - bottlesLost;
        // Recalculate remaining ml in the next opened bottle
        updatedMl = prod.bottleConfig.capacityMl - (Math.abs(updatedMl) % prod.bottleConfig.capacityMl);
      } else if (updatedMl >= prod.bottleConfig.capacityMl) {
        // Excess ml overflows to bottles
        const bottlesGained = Math.floor(updatedMl / prod.bottleConfig.capacityMl);
        updatedStock += bottlesGained;
        updatedMl = updatedMl % prod.bottleConfig.capacityMl;
      }
    } else {
      // Whole unit adjustment
      if (type === MovementType.ENTRY || type === MovementType.PURCHASE) {
        updatedStock += qty;
      } else {
        if (updatedStock < qty) {
          throw new Error(`Operación rechazada: No hay suficiente stock para realizar la salida. Stock actual: ${updatedStock}, Solicitado: ${qty}`);
        }
        updatedStock = updatedStock - qty;
      }
    }

    const dateStr = new Date().toISOString();
    const updatedProduct: Product = {
      ...prod,
      quantity: updatedStock,
      updatedAt: dateStr,
      bottleConfig: prod.bottleConfig ? {
        ...prod.bottleConfig,
        currentMl: updatedMl
      } : undefined
    };

    transaction.set(productRef, updatedProduct);

    // Register immutable inventory movement (Kardex)
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const mov: InventoryMovement = {
      id: movementId,
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: qty,
      mlDelta,
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Sistema',
      date: dateStr,
      cost: prod.cost,
      balanceAfter: updatedStock,
      observations
    };

    const movementRef = doc(db, 'movements', movementId);
    transaction.set(movementRef, mov);
  });
}

/**
 * Registers an inbound Supplier Purchase.
 * Atomically increments product stocks and adds Kardex entries for all purchased items.
 */
export async function registerPurchaseInFirestore(
  pData: Omit<Purchase, 'id' | 'userId' | 'userName'>,
  currentUser: User | null
): Promise<void> {
  const purchaseId = `purch-${Date.now()}`;
  const purchaseRef = doc(db, 'purchases', purchaseId);

  await runTransaction(db, async (transaction) => {
    const dateStr = new Date().toISOString();
    const newPurchase: Purchase = {
      ...pData,
      id: purchaseId,
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Sistema'
    };

    // --- STAGE 1: ALL READS FIRST ---
    const productDocs: Record<string, { ref: any; snapshot: any }> = {};
    for (const item of pData.items) {
      if (!productDocs[item.productId]) {
        const productRef = doc(db, 'products', item.productId);
        productDocs[item.productId] = {
          ref: productRef,
          snapshot: await transaction.get(productRef)
        };
      }
    }

    // --- STAGE 2: CALCULATIONS AND PREPARING WRITES ---
    const productUpdates: Array<{ ref: any; data: any }> = [];
    const movementWrites: Array<{ ref: any; data: InventoryMovement }> = [];

    for (const item of pData.items) {
      const prodData = productDocs[item.productId];
      if (prodData && prodData.snapshot.exists()) {
        const prod = prodData.snapshot.data() as Product;
        const beforeStock = prod.quantity;
        const updatedStock = beforeStock + item.quantity;

        // Prepare product update
        productUpdates.push({
          ref: prodData.ref,
          data: {
            ...prod,
            quantity: updatedStock,
            cost: item.cost, // update cost price to newest purchase cost
            updatedAt: dateStr
          }
        });

        // Prepare Kardex movement
        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const mov: InventoryMovement = {
          id: movementId,
          productId: prod.id,
          productName: prod.name,
          type: MovementType.PURCHASE,
          quantity: item.quantity,
          userId: currentUser?.uid || 'system',
          userName: currentUser?.name || 'Sistema',
          date: dateStr,
          cost: item.cost,
          balanceAfter: updatedStock,
          observations: `Compra según factura ${newPurchase.invoiceNumber}`
        };

        const movementRef = doc(db, 'movements', movementId);
        movementWrites.push({ ref: movementRef, data: mov });
      }
    }

    // --- STAGE 3: ALL WRITES AFTER ALL READS ---
    // A. Save purchase record
    transaction.set(purchaseRef, newPurchase);

    // B. Save updated product documents
    for (const pu of productUpdates) {
      transaction.set(pu.ref, pu.data);
    }

    // C. Write all inventory movements
    for (const mw of movementWrites) {
      transaction.set(mw.ref, mw.data);
    }
  });
}

/**
 * Transfers stock between any Origin (Caja 1, Caja 2, Almacén Central, etc.) and Destination.
 * "Paleteo de Cajas".
 */
export async function paleteoStockInFirestore(
  productId: string,
  fromLocation: string,
  toLocation: string,
  qty: number,
  currentUser: User | null,
  notes?: string
): Promise<void> {
  if (fromLocation === toLocation) {
    throw new Error('El origen y el destino del paleteo no pueden ser la misma ubicación.');
  }
  if (qty <= 0) {
    throw new Error('La cantidad a paletear debe ser mayor a 0.');
  }

  const productRef = doc(db, 'products', productId);

  await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productRef);
    if (!productDoc.exists()) {
      throw new Error('El producto no existe en el catálogo.');
    }

    const prod = productDoc.data() as Product;

    // Verify stock in origin location
    let originStock = 0;
    if (fromLocation === 'Almacén Central') {
      originStock = prod.quantity ?? 0;
    } else {
      originStock = prod.cajaStock?.[fromLocation] ?? 0;
    }

    if (originStock < qty) {
      throw new Error(`Operación rechazada: Stock insuficiente en ${fromLocation}. Stock disponible: ${originStock}, Solicitado: ${qty}`);
    }

    // Calculate new stocks
    let updatedWarehouseStock = prod.quantity ?? 0;
    const updatedCajaStockMap = { ...(prod.cajaStock || {}) };

    // Deduct from origin
    if (fromLocation === 'Almacén Central') {
      updatedWarehouseStock -= qty;
    } else {
      updatedCajaStockMap[fromLocation] = (updatedCajaStockMap[fromLocation] ?? 0) - qty;
    }

    // Add to destination
    if (toLocation === 'Almacén Central') {
      updatedWarehouseStock += qty;
    } else {
      updatedCajaStockMap[toLocation] = (updatedCajaStockMap[toLocation] ?? 0) + qty;
    }

    const dateStr = new Date().toISOString();
    const updatedProduct: Product = {
      ...prod,
      quantity: updatedWarehouseStock,
      cajaStock: updatedCajaStockMap,
      updatedAt: dateStr
    };

    transaction.set(productRef, updatedProduct);

    // Register immutable inventory movement (Kardex)
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const mov: InventoryMovement = {
      id: movementId,
      productId: prod.id,
      productName: prod.name,
      type: MovementType.TRANSFER,
      quantity: qty,
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Encargado de Caja',
      date: dateStr,
      cost: prod.cost,
      balanceAfter: updatedWarehouseStock,
      observations: `Paleteo de cajas: ${fromLocation} ➔ ${toLocation}${notes ? ` (${notes})` : ''}`
    };

    const movementRef = doc(db, 'movements', movementId);
    transaction.set(movementRef, mov);
  });
}

/**
 * Transfers stock from the main warehouse to a specific Caja.
 * Decreases general warehouse quantity and increases the selected Caja's stock.
 */
export async function transferStockToCajaInFirestore(
  productId: string,
  caja: string,
  qty: number,
  currentUser: User | null
): Promise<void> {
  return paleteoStockInFirestore(productId, 'Almacén Central', caja, qty, currentUser);
}

/**
 * Returns all stock from a specific Caja (or ALL Cajas) back to Almacén Central.
 * Sets cajaStock for that Caja (or all Cajas) to 0 and adds those quantities back to Almacén Central.
 * Registers Kardex movements for each returned product.
 */
export async function openBottlesInFirestore(
  productIds: string[],
  cajaName: string,
  currentUser: User | null
): Promise<void> {
  if (!productIds || productIds.length === 0) return;

  await runTransaction(db, async (transaction) => {
    const dateStr = new Date().toISOString();

    // Stage 1: Reads
    const prodDocs: Record<string, { ref: any; snapshot: any }> = {};
    for (const pid of productIds) {
      if (!prodDocs[pid]) {
        const productRef = doc(db, 'products', pid);
        prodDocs[pid] = {
          ref: productRef,
          snapshot: await transaction.get(productRef)
        };
      }
    }

    // Stage 2: Writes
    for (const pid of productIds) {
      const pDoc = prodDocs[pid];
      if (!pDoc || !pDoc.snapshot.exists()) continue;

      const prod = pDoc.snapshot.data() as Product;

      const currentCajaStock = prod.cajaStock?.[cajaName] ?? prod.quantity ?? 0;
      let newCajaStock = currentCajaStock;

      // Deduct 1 unit from physical inventory stock
      if (newCajaStock > 0) {
        newCajaStock -= 1;
      }

      let newWarehouseStock = prod.quantity ?? 0;
      if (prod.cajaStock?.[cajaName] === undefined) {
        newWarehouseStock = Math.max(0, newWarehouseStock - 1);
      }

      const capacity = prod.bottleConfig?.capacityMl || 750;

      const updatedCajaStockMap = { ...(prod.cajaStock || {}) };
      updatedCajaStockMap[cajaName] = newCajaStock;

      const updatedCajaMlMap = { ...(prod.cajaMl || {}) };
      updatedCajaMlMap[cajaName] = capacity;

      const updatedOpenBottlesMap = { ...(prod.openBottles || {}) };
      updatedOpenBottlesMap[cajaName] = true;

      const updatedOpenBottlesCountMap = { ...(prod.cajaOpenBottlesCount || {}) };
      updatedOpenBottlesCountMap[cajaName] = (updatedOpenBottlesCountMap[cajaName] || 0) + 1;

      const updatedProd: Product = {
        ...prod,
        quantity: newWarehouseStock,
        cajaStock: updatedCajaStockMap,
        cajaMl: updatedCajaMlMap,
        openBottles: updatedOpenBottlesMap,
        cajaOpenBottlesCount: updatedOpenBottlesCountMap,
        updatedAt: dateStr,
        bottleConfig: prod.bottleConfig ? {
          ...prod.bottleConfig,
          currentMl: capacity
        } : undefined
      };

      transaction.set(pDoc.ref, updatedProd);

      // Register Kardex movement
      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const mov: InventoryMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        type: MovementType.EXIT,
        quantity: 1,
        userId: currentUser?.uid || 'system',
        userName: currentUser?.name || 'Sistema',
        date: dateStr,
        cost: prod.cost,
        balanceAfter: newCajaStock,
        observations: `Apertura de botella obligatoria en ${cajaName} antes de confirmar venta POS`
      };

      transaction.set(doc(db, 'movements', movementId), mov);
    }
  });
}

/**
  * Declares an open bottle as empty/finished/discarded by bartender.
  * Decrements cajaOpenBottlesCount for that Caja by 1, and increments cajaFinishedBottlesCount.
  * If count reaches 0, sets openBottles map to false and resets cajaMl level to 0.
  */
export async function discardOpenBottleInFirestore(
  productId: string,
  cajaName: string,
  currentUser: User | null
): Promise<void> {
  if (!productId || !cajaName) return;

  await runTransaction(db, async (transaction) => {
    const dateStr = new Date().toISOString();
    const productRef = doc(db, 'products', productId);
    const pSnap = await transaction.get(productRef);

    if (!pSnap.exists()) {
      throw new Error('Producto no encontrado');
    }

    const prod = pSnap.data() as Product;
    
    // Calculate current open count safely
    let currentOpenCount = 0;
    if (prod.cajaOpenBottlesCount && typeof prod.cajaOpenBottlesCount[cajaName] === 'number') {
      currentOpenCount = prod.cajaOpenBottlesCount[cajaName];
    } else if (typeof prod.openBottles === 'object' && prod.openBottles !== null && prod.openBottles[cajaName]) {
      currentOpenCount = 1;
    } else if (typeof prod.openBottles === 'boolean' && prod.openBottles) {
      currentOpenCount = 1;
    } else if (prod.cajaMl && typeof prod.cajaMl[cajaName] === 'number' && prod.cajaMl[cajaName] > 0) {
      currentOpenCount = 1;
    }

    const newOpenCount = Math.max(0, currentOpenCount - 1);
    const currentFinishedCount = prod.cajaFinishedBottlesCount?.[cajaName] ?? 0;
    const newFinishedCount = currentFinishedCount + 1;

    const updatedOpenBottlesCountMap = { ...(prod.cajaOpenBottlesCount || {}) };
    updatedOpenBottlesCountMap[cajaName] = newOpenCount;

    const updatedFinishedBottlesCountMap = { ...(prod.cajaFinishedBottlesCount || {}) };
    updatedFinishedBottlesCountMap[cajaName] = newFinishedCount;

    let updatedOpenBottlesMap: Record<string, boolean> = {};
    if (typeof prod.openBottles === 'object' && prod.openBottles !== null) {
      updatedOpenBottlesMap = { ...prod.openBottles };
    }
    updatedOpenBottlesMap[cajaName] = newOpenCount > 0;

    const updatedCajaMlMap = { ...(prod.cajaMl || {}) };
    if (newOpenCount === 0) {
      updatedCajaMlMap[cajaName] = 0;
    }

    const updatedProd: Product = {
      ...prod,
      openBottles: updatedOpenBottlesMap,
      cajaMl: updatedCajaMlMap,
      cajaOpenBottlesCount: updatedOpenBottlesCountMap,
      cajaFinishedBottlesCount: updatedFinishedBottlesCountMap,
      updatedAt: dateStr
    };

    transaction.set(productRef, updatedProd);

    // Register Kardex movement log
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const currentCajaStock = prod.cajaStock?.[cajaName] ?? 0;
    const mov: InventoryMovement = {
      id: movementId,
      productId: prod.id,
      productName: prod.name,
      type: MovementType.EXIT,
      quantity: 1,
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Bartender',
      date: dateStr,
      cost: prod.cost,
      balanceAfter: currentCajaStock,
      observations: `Botella declarada vacía / desechada en ${cajaName} (Quedan ${newOpenCount} abiertas, ${newFinishedCount} vacías en turno)`
    };

    transaction.set(doc(db, 'movements', movementId), mov);
  });
}

export async function returnCajaStockToWarehouseInFirestore(
  cajaName: string, // 'Caja 1', 'Caja 2', etc. or 'ALL'
  currentUser: User | null,
  notes?: string
): Promise<{ returnedProductsCount: number; totalUnitsReturned: number }> {
  const productsSnap = await getDocs(collection(db, 'products'));
  if (productsSnap.empty) {
    return { returnedProductsCount: 0, totalUnitsReturned: 0 };
  }

  let returnedProductsCount = 0;
  let totalUnitsReturned = 0;
  const dateStr = new Date().toISOString();
  const batch = writeBatch(db);

  productsSnap.docs.forEach(docSnap => {
    const prod = docSnap.data() as Product;
    const cajaStockMap = { ...(prod.cajaStock || {}) };
    let totalQtyToReturnForProd = 0;

    if (cajaName === 'ALL') {
      Object.keys(cajaStockMap).forEach(k => {
        const qty = Number(cajaStockMap[k]) || 0;
        if (qty > 0) {
          totalQtyToReturnForProd += qty;
          cajaStockMap[k] = 0;
        }
      });
    } else {
      const qty = Number(cajaStockMap[cajaName]) || 0;
      if (qty > 0) {
        totalQtyToReturnForProd += qty;
        cajaStockMap[cajaName] = 0;
      }
    }

    if (totalQtyToReturnForProd > 0) {
      returnedProductsCount += 1;
      totalUnitsReturned += totalQtyToReturnForProd;

      const newWarehouseStock = (prod.quantity || 0) + totalQtyToReturnForProd;
      const updatedProd: Product = {
        ...prod,
        quantity: newWarehouseStock,
        cajaStock: cajaStockMap,
        updatedAt: dateStr
      };

      batch.set(docSnap.ref, updatedProd);

      // Register Kardex movement
      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const mov: InventoryMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        type: MovementType.TRANSFER,
        quantity: totalQtyToReturnForProd,
        userId: currentUser?.uid || 'system',
        userName: currentUser?.name || 'Encargado de Caja',
        date: dateStr,
        cost: prod.cost,
        balanceAfter: newWarehouseStock,
        observations: `Retorno de productos al Almacén Central (${cajaName === 'ALL' ? 'Todas las Cajas' : cajaName})${notes ? ` - ${notes}` : ''}`
      };

      batch.set(doc(db, 'movements', movementId), mov);
    }
  });

  if (returnedProductsCount > 0) {
    await batch.commit();
  }

  return { returnedProductsCount, totalUnitsReturned };
}

/**
 * Sets stock (quantity in warehouse and all cajaStock) to 0 for all products,
 * keeping their product definitions, codes, barcodes, prices, and categories intact.
 */
export async function zeroOutAllProductStocksInFirestore(): Promise<number> {
  const productsRef = collection(db, 'products');
  const snap = await getDocs(productsRef);
  if (snap.empty) return 0;

  const docs = snap.docs;
  let count = 0;
  const dateStr = new Date().toISOString();

  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 400);

    chunk.forEach(docSnap => {
      const p = docSnap.data() as Product;
      const updatedCajaStock: Record<string, number> = {};
      if (p.cajaStock) {
        Object.keys(p.cajaStock).forEach(k => {
          updatedCajaStock[k] = 0;
        });
      }

      batch.update(docSnap.ref, {
        quantity: 0,
        cajaStock: updatedCajaStock,
        openBottles: {},
        updatedAt: dateStr
      });
      count++;
    });

    await batch.commit();
  }

  return count;
}


