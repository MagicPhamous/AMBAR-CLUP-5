/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDoc,
  runTransaction, 
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { Sale, CartItem, PaymentMethod, User, Product, InventoryMovement, MovementType, CashRegisterSession, WaiterReport, TableStatus, isPhysicalProduct } from '../types';
import { getRecipeIngredients, isOpeningControlledProduct } from '../utils/recipeUtils';
import { parsePaymentCategory } from '../utils/paymentUtils';

/**
 * Enterprise POS Sale transaction.
 * Runs atomically:
 * 1. Checks and deducts stock of each item (bottle units or milliliters).
 *    Fails the transaction if any product has insufficient stock (prevents negative stock).
 * 2. Updates the active cash session's expected balance and sales totals.
 * 3. Appends loyalty points to the customer if selected.
 * 4. Increments sales counts and commissions for the waiter/promoter if selected.
 * 5. Registers unalterable Kardex inventory movements.
 * 6. Creates the POS sale document.
 */
export async function processPOSSaleInFirestore(
  items: CartItem[],
  paymentMethod: PaymentMethod,
  amountPaid: number,
  discount: number,
  configTaxRate: number,
  currentUser: User | null,
  activeSessionId?: string,
  tableId?: string,
  clientId?: string,
  waiterId?: string,
  discountReason?: string,
  description?: string
): Promise<Sale> {
  const saleId = `sale-${Date.now()}`;
  const saleRef = doc(db, 'sales', saleId);
  
  // Calculate pricing first
  let subtotal = 0;
  items.forEach(it => {
    subtotal += it.subtotal;
  });
  
  const tax = Number((subtotal * configTaxRate).toFixed(2));
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, amountPaid - total);

  // We will run all DB operations inside a single, robust transaction
  return await runTransaction(db, async (transaction) => {
    // 1. Generate Ticket Number
    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = new Date().toISOString();
    
    // --- STAGE 1: ALL READS FIRST ---
    // A. Read unique product documents
    const productDocs: Record<string, { ref: any; snapshot: any }> = {};
    for (const it of items) {
      if (!productDocs[it.product.id]) {
        const prodRef = doc(db, 'products', it.product.id);
        productDocs[it.product.id] = {
          ref: prodRef,
          snapshot: await transaction.get(prodRef)
        };
      }
      if (it.isCocktail) {
        if (it.cocktailLiquorId && !productDocs[it.cocktailLiquorId]) {
          const lRef = doc(db, 'products', it.cocktailLiquorId);
          productDocs[it.cocktailLiquorId] = {
            ref: lRef,
            snapshot: await transaction.get(lRef)
          };
        }
        if (it.cocktailMixerId && !productDocs[it.cocktailMixerId]) {
          const mRef = doc(db, 'products', it.cocktailMixerId);
          productDocs[it.cocktailMixerId] = {
            ref: mRef,
            snapshot: await transaction.get(mRef)
          };
        }
      }
    }

    // B. Read Active Cash Session Document
    let sessionSnap = null;
    if (activeSessionId) {
      sessionSnap = await transaction.get(doc(db, 'cashSessions', activeSessionId));
    }

    // C. Read Client Document
    let clientSnap = null;
    if (clientId) {
      clientSnap = await transaction.get(doc(db, 'clients', clientId));
    }

    // D. Read Employee Document
    let empSnap = null;
    if (waiterId) {
      empSnap = await transaction.get(doc(db, 'employees', waiterId));
    }

    // --- STAGE 2: CALCULATIONS AND STATE TRACKING ---
    const activeSessionData = (sessionSnap && sessionSnap.exists()) ? sessionSnap.data() as CashRegisterSession : null;
    let fallbackCaja = 'Caja 1';
    if (currentUser?.username) {
      const num = currentUser.username.toLowerCase().match(/\d+/)?.[0];
      if (num) fallbackCaja = `Caja ${num}`;
    } else if (currentUser?.name) {
      const num = currentUser.name.toLowerCase().match(/\d+/)?.[0];
      if (num) fallbackCaja = `Caja ${num}`;
    }
    const cajaAsociada = activeSessionData?.cajaAsociada || fallbackCaja;

    // Initialize tracking of local product state to handle cases correctly
    const productStates: Record<
      string, 
      { 
        cajaStock: Record<string, number>; 
        cajaMl: Record<string, number>; 
        data: Product; 
      }
    > = {};

    for (const id in productDocs) {
      const snap = productDocs[id].snapshot;
      if (!snap.exists()) {
        const name = items.find(it => it.product.id === id || it.cocktailLiquorId === id || it.cocktailMixerId === id)?.product.name || 'Desconocido';
        throw new Error(`El producto con ID ${id} ("${name}") no existe en inventario.`);
      }
      const prod = snap.data() as Product;
      productStates[id] = {
        cajaStock: prod.cajaStock || {},
        cajaMl: prod.cajaMl || {},
        data: prod
      };
    }

    const movementWrites: Array<{ ref: any; data: InventoryMovement }> = [];
    const newSaleItems = items.map(it => ({
      productId: it.product.id,
      productName: it.product.name,
      quantity: it.quantity,
      price: it.customUnitPrice !== undefined 
        ? it.customUnitPrice 
        : (it.selectedShotMl ? (it.product.price * (it.selectedShotMl / it.product.bottleConfig!.capacityMl) * 1.5) : it.product.price),
      selectedShotMl: it.selectedShotMl,
      subtotal: it.subtotal,
      isCocktail: it.isCocktail,
      cocktailLiquorId: it.cocktailLiquorId,
      cocktailLiquorName: it.cocktailLiquorName,
      cocktailDoseMl: it.cocktailDoseMl,
      cocktailMixerId: it.cocktailMixerId,
      cocktailMixerName: it.cocktailMixerName
    }));

    for (const it of items) {
      if (it.isCocktail) {
        // Cocktail preparation: deduct base liquor by ml (with auto-descorche) and optionally a mixer
        if (it.cocktailLiquorId) {
          const state = productStates[it.cocktailLiquorId];
          const prod = state.data;
          const currentCajaStock = state.cajaStock[cajaAsociada] ?? 0;
          let updatedCajaStock = currentCajaStock;
          
          const currentCajaMl = state.cajaMl[cajaAsociada] ?? (prod.bottleConfig?.isBottle ? prod.bottleConfig.capacityMl : 0);
          let updatedCajaMl = currentCajaMl;

          const doseMl = it.cocktailDoseMl || 50;
          const shotUsageTotal = doseMl * it.quantity;
          updatedCajaMl -= shotUsageTotal;

          if (updatedCajaMl <= 0) {
            const bottleDeductions = Math.floor(Math.abs(updatedCajaMl) / prod.bottleConfig!.capacityMl) + 1;
            if (updatedCajaStock < bottleDeductions) {
              throw new Error(`Stock de botella base "${prod.name}" insuficiente en ${cajaAsociada} para preparar el cóctel: ${it.product.name}. Quedan 0 botellas.`);
            }
            updatedCajaStock = updatedCajaStock - bottleDeductions;
            
            if (updatedCajaStock > 0) {
              updatedCajaMl = prod.bottleConfig!.capacityMl - (Math.abs(updatedCajaMl) % prod.bottleConfig!.capacityMl);
            } else {
              updatedCajaMl = 0;
            }
          }

          state.cajaStock[cajaAsociada] = updatedCajaStock;
          state.cajaMl[cajaAsociada] = updatedCajaMl;

          // Kardex entry for base liquor consumption
          const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
          const mov: InventoryMovement = {
            id: movementId,
            productId: prod.id,
            productName: prod.name,
            type: MovementType.SALE,
            quantity: 0,
            mlDelta: -shotUsageTotal,
            userId: currentUser?.uid || 'system',
            userName: currentUser?.name || 'Sistema',
            date: dateStr,
            cost: prod.cost,
            balanceAfter: updatedCajaStock,
            observations: `Preparación cóctel ticket ${ticketNumber} en ${cajaAsociada}: -${shotUsageTotal}ml de ${prod.name}`
          };
          const movementRef = doc(db, 'movements', movementId);
          movementWrites.push({ ref: movementRef, data: mov });
        }

        if (it.cocktailMixerId) {
          const state = productStates[it.cocktailMixerId];
          if (state) {
            const prod = state.data;
            const currentCajaStock = state.cajaStock[cajaAsociada] ?? 0;
            if (currentCajaStock < it.quantity) {
              throw new Error(`Insumo mezclador "${prod.name}" insuficiente en ${cajaAsociada} para preparar el cóctel: ${it.product.name}.`);
            }
            const updatedCajaStock = currentCajaStock - it.quantity;
            state.cajaStock[cajaAsociada] = updatedCajaStock;

            // Kardex entry for mixer consumption
            const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
            const mov: InventoryMovement = {
              id: movementId,
              productId: prod.id,
              productName: prod.name,
              type: MovementType.SALE,
              quantity: it.quantity,
              userId: currentUser?.uid || 'system',
              userName: currentUser?.name || 'Sistema',
              date: dateStr,
              cost: prod.cost,
              balanceAfter: updatedCajaStock,
              observations: `Mezclador de cóctel ticket ${ticketNumber} en ${cajaAsociada}: -${it.quantity} un. de ${prod.name}`
            };
            const movementRef = doc(db, 'movements', movementId);
            movementWrites.push({ ref: movementRef, data: mov });
          }
        }
      } else {
        // Standard item or direct shot
        const state = productStates[it.product.id];
        const prod = state.data;
        
        const currentCajaStock = state.cajaStock[cajaAsociada] ?? 0;
        let updatedCajaStock = currentCajaStock;
        
        const currentCajaMl = state.cajaMl[cajaAsociada] ?? (prod.bottleConfig?.isBottle ? prod.bottleConfig.capacityMl : 0);
        let updatedCajaMl = currentCajaMl;

        if (it.selectedShotMl && prod.bottleConfig?.isBottle) {
          const shotUsageTotal = it.selectedShotMl * it.quantity;
          updatedCajaMl -= shotUsageTotal;

          if (updatedCajaMl <= 0) {
            const bottleDeductions = Math.floor(Math.abs(updatedCajaMl) / prod.bottleConfig.capacityMl) + 1;
            if (updatedCajaStock < bottleDeductions) {
              throw new Error(`Insumo insuficiente en ${cajaAsociada} para la venta de tragos: ${prod.name}. Quedan 0 botellas.`);
            }
            updatedCajaStock = updatedCajaStock - bottleDeductions;
            
            if (updatedCajaStock > 0) {
              updatedCajaMl = prod.bottleConfig.capacityMl - (Math.abs(updatedCajaMl) % prod.bottleConfig.capacityMl);
            } else {
              updatedCajaMl = 0;
            }
          }
        } else {
          if (isPhysicalProduct(prod)) {
            if (updatedCajaStock < it.quantity) {
              throw new Error(`Insumo insuficiente para la venta en ${cajaAsociada}: ${prod.name}. Stock actual en caja: ${updatedCajaStock}, Solicitado: ${it.quantity}`);
            }
            updatedCajaStock = updatedCajaStock - it.quantity;
          } else {
            if (updatedCajaStock > 0) {
              updatedCajaStock = Math.max(0, updatedCajaStock - it.quantity);
            }
          }
        }

        state.cajaStock[cajaAsociada] = updatedCajaStock;
        state.cajaMl[cajaAsociada] = updatedCajaMl;

        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
        const mov: InventoryMovement = {
          id: movementId,
          productId: prod.id,
          productName: prod.name,
          type: MovementType.SALE,
          quantity: it.quantity,
          mlDelta: it.selectedShotMl ? -(it.selectedShotMl * it.quantity) : undefined,
          userId: currentUser?.uid || 'system',
          userName: currentUser?.name || 'Sistema',
          date: dateStr,
          cost: prod.cost,
          balanceAfter: updatedCajaStock,
          observations: `Venta POS ticket ${ticketNumber} en ${cajaAsociada}`
        };
        const movementRef = doc(db, 'movements', movementId);
        movementWrites.push({ ref: movementRef, data: mov });
      }
    }

    const waiterName = (empSnap && empSnap.exists()) ? empSnap.data()?.name : undefined;
    const cashierCommission = Number((total * 0.01).toFixed(2));
    const waiterCommission = waiterId ? Number((total * 0.01).toFixed(2)) : 0;

    const newSale: Sale = {
      id: saleId,
      ticketNumber,
      items: newSaleItems,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      amountPaid,
      change,
      tableId,
      clientId,
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Cajero',
      waiterId: waiterId || undefined,
      waiterName,
      cashierCommission,
      waiterCommission,
      date: dateStr,
      discountReason,
      description: description?.trim() || undefined,
      cajaAsociada
    };

    // --- STAGE 3: ALL WRITES AFTER ALL READS ---
    // A. Update Product documents in Firestore
    for (const id in productStates) {
      const state = productStates[id];
      const prodRef = productDocs[id].ref;
      transaction.set(prodRef, {
        ...state.data,
        cajaStock: state.cajaStock,
        cajaMl: state.cajaMl,
        updatedAt: dateStr
      });
    }

    // B. Write all inventory movements
    for (const mw of movementWrites) {
      transaction.set(mw.ref, mw.data);
    }

    // C. Update Active Cash Session Tally
    if (activeSessionId && sessionSnap && sessionSnap.exists()) {
      const s = sessionSnap.data() as CashRegisterSession;
      const salesTotal = s.salesTotal + total;
      const expectedBalance = s.openingBalance + s.cashInflows - s.cashOutflows + salesTotal;
      transaction.update(doc(db, 'cashSessions', activeSessionId), {
        salesTotal,
        expectedBalance
      });
    }

    // D. Reward loyalty points to customer
    if (clientId && clientSnap && clientSnap.exists()) {
      const cl = clientSnap.data();
      const pointsEarned = Math.floor(total / 10); // 1 point per 10 BOB
      transaction.update(doc(db, 'clients', clientId), {
        points: (cl.points || 0) + pointsEarned
      });
    }

    // E. Record commissions for employee (waiter/bartender)
    if (waiterId && empSnap && empSnap.exists()) {
      const emp = empSnap.data();
      const comVal = Number((total * (emp.comissionsRate || 0)).toFixed(2));
      transaction.update(doc(db, 'employees', waiterId), {
        salesCount: (emp.salesCount || 0) + 1,
        totalSalesValue: (emp.totalSalesValue || 0) + total,
        totalComissions: (emp.totalComissions || 0) + comVal
      });
    }

    // F. Clear physical table consumption if tableId was billed
    if (tableId) {
      const tableRef = doc(db, 'tables', tableId);
      transaction.update(tableRef, {
        status: TableStatus.FREE,
        consumption: [],
        currentWaiterId: '',
        currentWaiterName: '',
        openedAt: ''
      });
    }

    // G. Create the POS sale record
    transaction.set(saleRef, newSale);

    return newSale;
  });
}

/**
 * Cancels / Nullifies a completed POS Sale.
 * Restores product stock and ml, and registers compensating adjustments in the Kardex.
 */
export async function cancelSaleInFirestore(
  saleId: string,
  observations: string,
  currentUser: User | null
): Promise<void> {
  const saleRef = doc(db, 'sales', saleId);

  await runTransaction(db, async (transaction) => {
    // --- STAGE 1: ALL READS FIRST ---
    const saleDoc = await transaction.get(saleRef);
    if (!saleDoc.exists()) {
      throw new Error('La venta no existe.');
    }

    const sale = saleDoc.data() as Sale;
    const cajaAsociada = sale.cajaAsociada || 'Caja 1';

    // Fetch all related product snapshots first
    const productDocs: Record<string, { ref: any; snapshot: any }> = {};
    for (const item of sale.items) {
      if (!productDocs[item.productId]) {
        const prodRef = doc(db, 'products', item.productId);
        productDocs[item.productId] = {
          ref: prodRef,
          snapshot: await transaction.get(prodRef)
        };
      }
    }

    // --- STAGE 2: CALCULATIONS AND STATE TRACKING ---
    const productStates: Record<
      string, 
      { 
        cajaStock: Record<string, number>; 
        cajaMl: Record<string, number>; 
        data: Product; 
      }
    > = {};

    for (const id in productDocs) {
      const snap = productDocs[id].snapshot;
      if (snap.exists()) {
        const prod = snap.data() as Product;
        productStates[id] = {
          cajaStock: prod.cajaStock || {},
          cajaMl: prod.cajaMl || {},
          data: prod
        };
      }
    }

    const dateStr = new Date().toISOString();
    const movementWrites: Array<{ ref: any; data: InventoryMovement }> = [];

    for (const item of sale.items) {
      const state = productStates[item.productId];
      if (!state) continue;

      const prod = state.data;
      let currentCajaStock = state.cajaStock[cajaAsociada] ?? 0;
      let currentCajaMl = state.cajaMl[cajaAsociada] ?? (prod.bottleConfig?.isBottle ? prod.bottleConfig.capacityMl : 0);

      if (item.selectedShotMl && prod.bottleConfig?.isBottle) {
        currentCajaMl += item.selectedShotMl * item.quantity;
        if (currentCajaMl > prod.bottleConfig.capacityMl) {
          const bottlesCreated = Math.floor(currentCajaMl / prod.bottleConfig.capacityMl);
          currentCajaStock += bottlesCreated;
          currentCajaMl = currentCajaMl % prod.bottleConfig.capacityMl;
        }
      } else {
        currentCajaStock += item.quantity;
      }

      state.cajaStock[cajaAsociada] = currentCajaStock;
      state.cajaMl[cajaAsociada] = currentCajaMl;

      // Prepare compensating adjustment to Kardex
      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const mov: InventoryMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        type: MovementType.ADJUSTMENT,
        quantity: item.quantity,
        mlDelta: item.selectedShotMl ? (item.selectedShotMl * item.quantity) : undefined,
        userId: currentUser?.uid || 'system',
        userName: currentUser?.name || 'Sistema',
        date: dateStr,
        cost: prod.cost,
        balanceAfter: currentCajaStock,
        observations: `Anulación de ticket ${sale.ticketNumber} en ${cajaAsociada}. Motivo: ${observations}`
      };

      const movementRef = doc(db, 'movements', movementId);
      movementWrites.push({ ref: movementRef, data: mov });
    }

    // --- STAGE 3: ALL WRITES AFTER ALL READS ---
    for (const id in productStates) {
      const state = productStates[id];
      transaction.set(productDocs[id].ref, {
        ...state.data,
        cajaStock: state.cajaStock,
        cajaMl: state.cajaMl,
        updatedAt: dateStr
      });
    }

    for (const mw of movementWrites) {
      transaction.set(mw.ref, mw.data);
    }

    // Delete the sale document
    transaction.delete(saleRef);
  });
}

/**
 * Waiter submits a sale report to Firestore.
 */
export async function submitWaiterReportToFirestore(
  reportData: Omit<WaiterReport, 'id' | 'waiterId' | 'waiterName' | 'status' | 'date'>,
  currentUser: User | null
): Promise<void> {
  if (!currentUser) throw new Error('Usuario no autenticado.');
  const id = `report-${Date.now()}`;
  const report: WaiterReport = {
    ...reportData,
    id,
    waiterId: currentUser.uid,
    waiterName: currentUser.name,
    status: 'pendiente',
    date: new Date().toISOString()
  };
  const reportRef = doc(db, 'waiterReports', id);
  await setDoc(reportRef, report);
}

/**
 * Cashier resolves (approves or rejects) a waiter sale report.
 * If approved, stock is deducted from the specified target Caja.
 */
export async function resolveWaiterReportInFirestore(
  reportId: string,
  status: 'aprobado' | 'rechazado',
  currentUser: User | null,
  activeSessionId?: string,
  taxRate: number = 0.13
): Promise<void> {
  if (!currentUser) throw new Error('Usuario no autenticado.');
  const reportRef = doc(db, 'waiterReports', reportId);
  
  if (status === 'rechazado') {
    await runTransaction(db, async (transaction) => {
      const reportSnap = await transaction.get(reportRef);
      if (!reportSnap.exists()) throw new Error('El reporte de venta no existe.');
      const rData = reportSnap.data() as WaiterReport;
      if (rData.status !== 'pendiente') throw new Error('El reporte ya ha sido resuelto.');
      transaction.update(reportRef, { status: 'rechazado' });
    });
    return;
  }
  
  await runTransaction(db, async (transaction) => {
    // 1. Get report
    const reportSnap = await transaction.get(reportRef);
    if (!reportSnap.exists()) throw new Error('El reporte de venta no existe.');
    const rData = reportSnap.data() as WaiterReport;
    if (rData.status !== 'pendiente') throw new Error('El reporte ya ha sido resuelto.');
    
    const cajaAsociada = rData.targetCaja || 'Caja 1';
    
    // 2. Get products
    const productDocs: Record<string, { ref: any; snapshot: any }> = {};
    for (const it of rData.items) {
      if (!productDocs[it.productId]) {
        const prodRef = doc(db, 'products', it.productId);
        productDocs[it.productId] = {
          ref: prodRef,
          snapshot: await transaction.get(prodRef)
        };
      }
    }
    
    // 3. Get cash session
    let sessionSnap = null;
    if (activeSessionId) {
      sessionSnap = await transaction.get(doc(db, 'cashSessions', activeSessionId));
    }
    
    // --- calculations & state tracking ---
    const productStates: Record<
      string,
      {
        cajaStock: Record<string, number>;
        cajaMl: Record<string, number>;
        data: Product;
      }
    > = {};
    
    for (const id in productDocs) {
      const snap = productDocs[id].snapshot;
      if (!snap.exists()) {
        const name = rData.items.find(it => it.productId === id)?.productName || 'Desconocido';
        throw new Error(`El producto ${name} no existe en inventario.`);
      }
      const prod = snap.data() as Product;
      productStates[id] = {
        cajaStock: prod.cajaStock || {},
        cajaMl: prod.cajaMl || {},
        data: prod
      };
    }
    
    const movementWrites: Array<{ ref: any; data: InventoryMovement }> = [];
    const dateStr = new Date().toISOString();
    
    for (const it of rData.items) {
      const state = productStates[it.productId];
      const prod = state.data;
      
      let updatedCajaStock = state.cajaStock[cajaAsociada] ?? 0;
      if (isPhysicalProduct(prod)) {
        if (updatedCajaStock < it.quantity) {
          throw new Error(`Stock insuficiente en ${cajaAsociada} para ${prod.name}. Stock actual: ${updatedCajaStock} unidades, solicitado: ${it.quantity} unidades.`);
        }
        
        updatedCajaStock = updatedCajaStock - it.quantity;
        state.cajaStock[cajaAsociada] = updatedCajaStock;
      } else {
        if (updatedCajaStock > 0) {
          updatedCajaStock = Math.max(0, updatedCajaStock - it.quantity);
          state.cajaStock[cajaAsociada] = updatedCajaStock;
        }
      }
      
      // Also write unalterable Kardex movement
      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const mov: InventoryMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        type: MovementType.SALE,
        quantity: it.quantity,
        userId: rData.waiterId,
        userName: rData.waiterName,
        date: dateStr,
        cost: prod.cost,
        balanceAfter: updatedCajaStock, // stock balance inside the Caja
        observations: `Venta Disco Mesero: ${rData.waiterName} - Caja: ${cajaAsociada} - Reporte: ${rData.id}`
      };
      
      const movementRef = doc(db, 'movements', movementId);
      movementWrites.push({ ref: movementRef, data: mov });
    }
    
    // 4. Create Sale
    const saleId = `sale-${Date.now()}`;
    const saleRef = doc(db, 'sales', saleId);
    const ticketNumber = `TKT-W${Math.floor(100000 + Math.random() * 900000)}`;
    
    const newSale: Sale = {
      id: saleId,
      ticketNumber,
      items: rData.items.map(it => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        subtotal: it.subtotal
      })),
      subtotal: rData.total,
      discount: 0,
      tax: Number((rData.total * taxRate).toFixed(2)),
      total: rData.total,
      paymentMethod: rData.paymentMethod as PaymentMethod,
      amountPaid: rData.total,
      change: 0,
      tableId: `ZONA DISCO - ${rData.waiterName}`,
      userId: currentUser?.uid || rData.waiterId,
      userName: currentUser?.name || rData.waiterName,
      waiterId: rData.waiterId,
      waiterName: rData.waiterName,
      waiterCommission: Number((rData.total * 0.01).toFixed(2)),
      cashierCommission: Number((rData.total * 0.01).toFixed(2)),
      date: dateStr,
      cajaAsociada
    };
    
    // 5. Update Cash Session expected balance
    if (sessionSnap && sessionSnap.exists()) {
      const sData = sessionSnap.data() as CashRegisterSession;
      const additionalInflow = parsePaymentCategory(rData.paymentMethod) === 'efectivo' ? rData.total : 0;
      transaction.update(doc(db, 'cashSessions', activeSessionId!), {
        expectedBalance: Number(((sData.expectedBalance ?? sData.openingBalance) + additionalInflow).toFixed(2)),
        salesTotal: Number(((sData.salesTotal ?? 0) + rData.total).toFixed(2))
      });
    }
    
    // Write all changes in transaction
    for (const id in productStates) {
      const state = productStates[id];
      transaction.update(productDocs[id].ref, {
        cajaStock: state.cajaStock,
        updatedAt: dateStr
      });
    }
    
    for (const mw of movementWrites) {
      transaction.set(mw.ref, mw.data);
    }
    
    transaction.set(saleRef, newSale);
    transaction.update(reportRef, { status: 'aprobado' });
  });
}

