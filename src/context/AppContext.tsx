/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';
import {
  User,
  UserRole,
  Product,
  Category,
  Supplier,
  Purchase,
  Sale,
  Table,
  TableReservation,
  TableStatus,
  CashRegisterSession,
  Client,
  Employee,
  AuditLog,
  SystemConfig,
  InventoryMovement,
  MovementType,
  CartItem,
  PaymentMethod,
  WaiterReport,
  CashExpense
} from '../types';

import { seedInitialDataIfNecessary, resetWarehouseWithOfficialProducts, purgeOperationalData } from '../services/seedService';
import { formatDateDDMMAAAA } from '../utils/dateUtils';
import { loginWithFirebase, logoutWithFirebase, listenToAuthState } from '../services/authService';
import { 
  saveProductToFirestore, 
  deleteProductFromFirestore, 
  saveCategoryToFirestore, 
  saveSupplierToFirestore, 
  adjustStockInFirestore, 
  registerPurchaseInFirestore,
  transferStockToCajaInFirestore,
  paleteoStockInFirestore,
  returnCajaStockToWarehouseInFirestore,
  openBottlesInFirestore,
  discardOpenBottleInFirestore,
  zeroOutAllProductStocksInFirestore
} from '../services/productService';
import { processPOSSaleInFirestore, cancelSaleInFirestore, submitWaiterReportToFirestore, resolveWaiterReportInFirestore } from '../services/salesService';
import { 
  updateTableStatusInFirestore, 
  addConsumptionToTableInFirestore, 
  removeConsumptionFromTableInFirestore, 
  transferConsumptionInFirestore, 
  clearTableConsumptionInFirestore,
  saveTableReservationInFirestore,
  deliverReservationCourtesyBottleInFirestore,
  cancelTableReservationInFirestore,
  verifyReservationPaymentInFirestore,
  updateReservationStatusInFirestore,
  moveTableInFirestore
} from '../services/tableService';
import { 
  openCashSessionInFirestore, 
  closeCashSessionInFirestore, 
  registerCashInflowInFirestore, 
  registerCashOutflowInFirestore 
} from '../services/cashService';
import { addAuditLogInFirestore } from '../services/auditService';

interface AppContextProps {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  movements: InventoryMovement[];
  tables: Table[];
  cashSessions: CashRegisterSession[];
  activeSession: CashRegisterSession | null;
  selectedCaja: string;
  setSelectedCaja: (caja: string) => void;
  clients: Client[];
  employees: Employee[];
  auditLogs: AuditLog[];
  config: SystemConfig;
  waiterReports: WaiterReport[];
  cashExpenses: CashExpense[];
  
  // Actions
  addCashExpense: (expense: Omit<CashExpense, 'id' | 'date' | 'registeredBy'>) => Promise<void>;
  login: (email: string, role: UserRole, password?: string) => Promise<User>;
  logout: () => void;
  registerSessionActivity: (action: string, details: string) => void;
  
  // Products & Categories
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (category: Category) => void;
  
  // Suppliers
  saveSupplier: (supplier: Supplier) => void;
  
  // Compras
  registerPurchase: (purchase: Omit<Purchase, 'id' | 'userId' | 'userName'>) => void;
  
  // Inventario & Kardex
  adjustStock: (productId: string, quantity: number, type: MovementType, observations: string, mlDelta?: number) => void;
  transferStockToCaja: (productId: string, caja: string, quantity: number) => Promise<void>;
  paleteoStock: (productId: string, fromLocation: string, toLocation: string, quantity: number, notes?: string) => Promise<void>;
  returnCajaStockToWarehouse: (cajaName: string, notes?: string) => Promise<{ returnedProductsCount: number; totalUnitsReturned: number }>;
  openBottles: (productIds: string[], cajaName: string) => Promise<void>;
  discardOpenBottle: (productId: string, cajaName: string) => Promise<void>;
  
  // POS & Ventas
  processPOSSale: (items: CartItem[], paymentMethod: PaymentMethod, amountPaid: number, discount: number, tableId?: string, clientId?: string, waiterId?: string, discountReason?: string, description?: string) => Sale;
  cancelSale: (saleId: string, observations: string) => void;
  
  // Mesas & Consumos
  updateTableStatus: (tableId: string, status: TableStatus, waiterId?: string) => void;
  addConsumptionToTable: (tableId: string, item: CartItem) => void;
  removeConsumptionFromTable: (tableId: string, productId: string, shotMl?: number) => void;
  transferConsumption: (fromTableId: string, toTableId: string) => void;
  clearTableConsumption: (tableId: string) => void;
  saveTableReservation: (
    tableId: string, 
    clientName: string, 
    phone: string, 
    time: string, 
    people: number, 
    coverPaid: number, 
    notes: string,
    date?: string,
    paymentVerified?: boolean,
    status?: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado',
    courtesyBottleId?: string,
    courtesyBottleName?: string,
    courtesyBottlePrice?: number,
    courtesyBottleUpgradePaid?: number,
    courtesyBottleDelivered?: boolean
  ) => void;
  deliverReservationCourtesyBottle: (tableId: string, targetDate?: string) => Promise<void>;
  verifyReservationPayment: (tableId: string, verified: boolean, targetDate?: string) => void;
  updateReservationStatus: (tableId: string, status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado', targetDate?: string) => void;
  cancelTableReservation: (tableId: string, targetDate?: string) => void;
  moveTableToAnother: (fromTableId: string, toTableId: string, targetDate?: string) => void;
  
  // Caja
  openCashSession: (openingBalance: number, observations?: string) => void;
  closeCashSession: (realBalance: number, observations?: string) => void;
  registerCashInflow: (amount: number, observations: string) => void;
  registerCashOutflow: (amount: number, observations: string) => void;
  
  // Clientes
  saveClient: (client: Client) => void;
  
  // Empleados
  saveEmployee: (employee: Employee) => void;
  registerEmployeeAttendance: (employeeId: string, status: string) => void;
  
  // Config
  saveConfig: (config: SystemConfig) => void;
  updateConfig: (config: SystemConfig) => void;
  
  // Gestión de usuarios
  addUser: (name: string, email: string, role: UserRole) => void;
  removeUser: (uid: string) => void;
  
  // Audit Logs
  addAuditLog: (module: string, action: string, beforeState: any, afterState: any) => void;
  
  // Reset database with official catalog
  resetWarehouse: () => Promise<void>;
  zeroOutProductStocks: () => Promise<number>;
  clearOperationalData: () => Promise<void>;
  clearMovementsOnly: () => Promise<void>;

  // Waiter reports
  submitWaiterReport: (report: Omit<WaiterReport, 'id' | 'waiterId' | 'waiterName' | 'status' | 'date'>) => Promise<void>;
  resolveWaiterReport: (reportId: string, status: 'aprobado' | 'rechazado') => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const initialConfig: SystemConfig = {
  companyName: 'AMBAR CLUB - VIP LOUNGE',
  nit: '4560934015',
  address: 'Equipetrol Calle 8 Oeste #20, Santa Cruz de la Sierra',
  currency: 'BOB',
  taxRate: 0.13,
  ticketHeader: '¡BIENVENIDO A AMBAR CLUB!\nEl lujo nocturno hecho realidad.',
  ticketFooter: 'Gracias por su preferencia.\nConservar su ticket para reclamos.\nBebidas alcohólicas prohibidas para menores.',
  printerSeries: 'AMB-POS-80MM-001'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- REAL-TIME DATA STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [cashSessions, setCashSessions] = useState<CashRegisterSession[]>([]);
  const [activeSession, setActiveSession] = useState<CashRegisterSession | null>(null);
  const [selectedCaja, setSelectedCaja] = useState<string>('Caja 1');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [waiterReports, setWaiterReports] = useState<WaiterReport[]>([]);
  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>([]);

  // --- SEED DATABASE ON MOUNT ---
  useEffect(() => {
    seedInitialDataIfNecessary(db).catch(err => {
      console.warn('Quietly caught startup seeding error (non-blocking):', err);
    });
  }, []);

  // --- ESTABLISH REAL-TIME FIRESTORE LISTENERS ONLY WHEN LOGGED IN ---
  useEffect(() => {
    if (!currentUser) {
      // Clear data states when logged out to prevent leaking secure info
      setUsers([]);
      setCategories([]);
      setSuppliers([]);
      setProducts([]);
      setTables([]);
      setClients([]);
      setEmployees([]);
      setSales([]);
      setPurchases([]);
      setMovements([]);
      setCashSessions([]);
      setActiveSession(null);
      setSelectedCaja('Caja 1');
      setAuditLogs([]);
      setWaiterReports([]);
      return;
    }

    // Sync admin profiles (e.g., u7) once logged in to guarantee database integrity
    seedInitialDataIfNecessary(db).catch(err => {
      console.warn('Quietly caught authenticated seeding error:', err);
    });

    let unsubs: (() => void)[] = [];

    // Establish listeners with error handlers to gracefully catch permission boundaries
    unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
      const list: User[] = [];
      snap.forEach(doc => list.push(doc.data() as User));
      setUsers(list);
    }, (error) => {
      console.error("Users listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'categories'), (snap) => {
      const list: Category[] = [];
      snap.forEach(doc => list.push(doc.data() as Category));
      setCategories(list);
    }, (error) => {
      console.error("Categories listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'suppliers'), (snap) => {
      const list: Supplier[] = [];
      snap.forEach(doc => list.push(doc.data() as Supplier));
      setSuppliers(list);
    }, (error) => {
      console.error("Suppliers listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      const seenIds = new Set<string>();
      snap.forEach(doc => {
        const prod = doc.data() as Product;
        const id = prod.id || doc.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          list.push({ ...prod, id });
        }
      });
      setProducts(list);
    }, (error) => {
      console.error("Products listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'tables'), (snap) => {
      const list: Table[] = [];
      snap.forEach(doc => list.push(doc.data() as Table));
      list.sort((a, b) => a.number.localeCompare(b.number));
      setTables(list);
    }, (error) => {
      console.error("Tables listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'clients'), (snap) => {
      const list: Client[] = [];
      snap.forEach(doc => list.push(doc.data() as Client));
      setClients(list);
    }, (error) => {
      console.error("Clients listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'employees'), (snap) => {
      const list: Employee[] = [];
      snap.forEach(doc => list.push(doc.data() as Employee));
      setEmployees(list);
    }, (error) => {
      console.error("Employees listener error:", error);
    }));

    unsubs.push(onSnapshot(doc(db, 'config', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as SystemConfig);
      }
    }, (error) => {
      console.error("Config listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'sales'), (snap) => {
      const list: Sale[] = [];
      snap.forEach(doc => list.push(doc.data() as Sale));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(list);
    }, (error) => {
      console.error("Sales listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'purchases'), (snap) => {
      const list: Purchase[] = [];
      snap.forEach(doc => list.push(doc.data() as Purchase));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPurchases(list);
    }, (error) => {
      console.error("Purchases listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'movements'), (snap) => {
      const list: InventoryMovement[] = [];
      snap.forEach(doc => list.push(doc.data() as InventoryMovement));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMovements(list);
    }, (error) => {
      console.error("Movements listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'cashSessions'), (snap) => {
      const list: CashRegisterSession[] = [];
      snap.forEach(doc => list.push(doc.data() as CashRegisterSession));
      list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
      setCashSessions(list);
    }, (error) => {
      console.error("CashSessions listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'waiterReports'), (snap) => {
      const list: WaiterReport[] = [];
      snap.forEach(doc => list.push(doc.data() as WaiterReport));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWaiterReports(list);
    }, (error) => {
      console.error("WaiterReports listener error:", error);
    }));

    unsubs.push(onSnapshot(collection(db, 'cashExpenses'), (snap) => {
      const list: CashExpense[] = [];
      snap.forEach(doc => list.push(doc.data() as CashExpense));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCashExpenses(list);
    }, (error) => {
      console.error("CashExpenses listener error:", error);
    }));

    if (currentUser && (
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.GERENTE ||
      currentUser.role === UserRole.AUDITOR
    )) {
      unsubs.push(onSnapshot(collection(db, 'auditLogs'), (snap) => {
        const list: AuditLog[] = [];
        snap.forEach(doc => list.push(doc.data() as AuditLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(list);
      }, (error) => {
        console.error("AuditLogs listener error:", error);
      }));
    } else {
      setAuditLogs([]);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [currentUser]);

  // --- REAL FIREBASE AUTH LISTENERS ---
  useEffect(() => {
    const unsubAuth = listenToAuthState((user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Synchronize selectedCaja based on the currentUser
  useEffect(() => {
    if (currentUser) {
      const str = `${currentUser.username || ''} ${currentUser.name || ''} ${currentUser.email || ''}`.toLowerCase();
      if (str.includes('caja')) {
        const num = str.match(/\d+/)?.[0];
        if (num) {
          setSelectedCaja(`Caja ${num}`);
        }
      }
    }
  }, [currentUser]);

  // Synchronize activeSession whenever cashSessions or selectedCaja changes
  useEffect(() => {
    const open = cashSessions.find(s => s.status === 'Abierta' && (s.cajaAsociada || 'Caja 1') === selectedCaja) || null;
    setActiveSession(open);
  }, [cashSessions, selectedCaja]);

  // --- ACTIONS IMPLEMENTATION ---

  // Security Audit Logging Wrapper
  const addAuditLog = useCallback((module: string, action: string, beforeState: any, afterState: any) => {
    addAuditLogInFirestore(module, action, beforeState, afterState, currentUser);
  }, [currentUser]);

  // Login via Firebase Auth
  const login = useCallback(async (email: string, role: UserRole, password?: string): Promise<User> => {
    try {
      const authUser = await loginWithFirebase(email, role, password);
      setCurrentUser(authUser);
      addAuditLogInFirestore('Seguridad', 'Inicio de Sesión', 'Offline', `Autenticado con Rol ${role}`, authUser);
      return authUser;
    } catch (error: any) {
      addAuditLogInFirestore('Seguridad', 'Fallo de Autenticación', 'Offline', `Fallo con correo ${email}: ${error.message}`, null);
      throw error;
    }
  }, []);

  // Logout via Firebase Auth
  const logout = useCallback(() => {
    if (currentUser) {
      addAuditLogInFirestore('Seguridad', 'Cierre de Sesión', 'Autenticado', 'Sesión finalizada', currentUser);
    }
    logoutWithFirebase().then(() => {
      setCurrentUser(null);
    });
  }, [currentUser]);

  const registerSessionActivity = useCallback((action: string, details: string) => {
    addAuditLogInFirestore('Actividad', action, null, details, currentUser);
  }, [currentUser]);

  // Save/Edit Product
  const saveProduct = useCallback((product: Product) => {
    const isNew = !product.id;
    const beforeState = isNew ? null : products.find(p => p.id === product.id);
    
    saveProductToFirestore(product, currentUser)
      .then(() => {
        addAuditLog('Productos', `${isNew ? 'Registro' : 'Modificación'} de Producto: ${product.name}`, beforeState, product);
      })
      .catch(err => {
        console.error('Failed to save product:', err);
      });
  }, [products, currentUser, addAuditLog]);

  // Delete/Deactivate Product
  const deleteProduct = useCallback((id: string) => {
    const match = products.find(p => p.id === id);
    if (!match) return;
    
    deleteProductFromFirestore(id)
      .then(() => {
        addAuditLog('Productos', `Inactivación de Producto: ${match.name}`, match, { ...match, isActive: false });
      })
      .catch(err => {
        console.error('Failed to delete product:', err);
      });
  }, [products, addAuditLog]);

  const saveCategory = useCallback((category: Category) => {
    const exists = categories.find(c => c.id === category.id);
    saveCategoryToFirestore(category)
      .then(() => {
        addAuditLog('Categorías', `Modificación/Guardado de Categoría: ${category.name}`, exists || null, category);
      })
      .catch(err => console.error('Failed to save category:', err));
  }, [categories, addAuditLog]);

  const saveSupplier = useCallback((supplier: Supplier) => {
    const exists = suppliers.find(s => s.id === supplier.id);
    saveSupplierToFirestore(supplier)
      .then(() => {
        addAuditLog('Proveedores', `Modificación/Guardado de Proveedor: ${supplier.company}`, exists || null, supplier);
      })
      .catch(err => console.error('Failed to save supplier:', err));
  }, [suppliers, addAuditLog]);

  // Supplier Purchases
  const registerPurchase = useCallback((purchaseData: Omit<Purchase, 'id' | 'userId' | 'userName'>) => {
    registerPurchaseInFirestore(purchaseData, currentUser)
      .then(() => {
        addAuditLog('Compras', `Registro de Compra Proveedor: ${purchaseData.supplierName}`, null, purchaseData);
      })
      .catch(err => console.error('Failed to register purchase:', err));
  }, [currentUser, addAuditLog]);

  // Adjust stock manually with unalterable Kardex
  const adjustStock = useCallback((productId: string, quantity: number, type: MovementType, observations: string, mlDelta?: number) => {
    const prod = products.find(p => p.id === productId);
    adjustStockInFirestore(productId, quantity, type, observations, currentUser, mlDelta)
      .then(() => {
        addAuditLog('Inventario', `Ajuste Inventario (${type}) - ${prod?.name || productId}`, prod || null, { quantity, mlDelta, type, observations });
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo de Ajuste - ${prod?.name || productId}`, prod || null, { error: err.message });
        alert(err.message); // Notify user about negative stock validation failures
      });
  }, [products, currentUser, addAuditLog]);

  const transferStockToCaja = useCallback((productId: string, caja: string, quantity: number): Promise<void> => {
    const prod = products.find(p => p.id === productId);
    return transferStockToCajaInFirestore(productId, caja, quantity, currentUser)
      .then(() => {
        addAuditLog('Inventario', `Traspaso a Caja - ${prod?.name || productId} (${quantity} unidades a ${caja})`, prod || null, { quantity, caja });
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo de Traspaso - ${prod?.name || productId}`, prod || null, { error: err.message });
        alert(err.message);
        throw err;
      });
  }, [products, currentUser, addAuditLog]);

  const paleteoStock = useCallback((productId: string, fromLocation: string, toLocation: string, quantity: number, notes?: string): Promise<void> => {
    const prod = products.find(p => p.id === productId);
    return paleteoStockInFirestore(productId, fromLocation, toLocation, quantity, currentUser, notes)
      .then(() => {
        addAuditLog('Inventario', `Paleteo de Cajas - ${prod?.name || productId} (${quantity} un. de ${fromLocation} a ${toLocation})`, prod || null, { quantity, fromLocation, toLocation, notes });
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo de Paleteo - ${prod?.name || productId}`, prod || null, { error: err.message });
        alert(err.message);
        throw err;
      });
  }, [products, currentUser, addAuditLog]);

  const returnCajaStockToWarehouse = useCallback((cajaName: string, notes?: string): Promise<{ returnedProductsCount: number; totalUnitsReturned: number }> => {
    return returnCajaStockToWarehouseInFirestore(cajaName, currentUser, notes)
      .then((res) => {
        addAuditLog('Inventario', `Retorno de productos a Almacén Central (${cajaName})`, null, {
          cajaName,
          returnedProductsCount: res.returnedProductsCount,
          totalUnitsReturned: res.totalUnitsReturned,
          notes
        });
        return res;
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo de Retorno de productos a Almacén (${cajaName})`, null, { error: err.message });
        alert(err.message);
        throw err;
      });
  }, [currentUser, addAuditLog]);

  const openBottles = useCallback((productIds: string[], cajaName: string): Promise<void> => {
    return openBottlesInFirestore(productIds, cajaName, currentUser)
      .then(() => {
        addAuditLog('Inventario', `Apertura de botellas en ${cajaName} (${productIds.length} botellas)`, null, { productIds, cajaName });
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo de apertura de botellas en ${cajaName}`, null, { error: err.message });
        alert(err.message);
        throw err;
      });
  }, [currentUser, addAuditLog]);

  const discardOpenBottle = useCallback((productId: string, cajaName: string): Promise<void> => {
    return discardOpenBottleInFirestore(productId, cajaName, currentUser)
      .then(() => {
        addAuditLog('Inventario', `Botella declarada vacía / desechada en ${cajaName}`, null, { productId, cajaName });
      })
      .catch(err => {
        addAuditLog('Inventario', `Fallo al declarar botella vacía en ${cajaName}`, null, { error: err.message });
        alert(err.message);
        throw err;
      });
  }, [currentUser, addAuditLog]);

  // Process POS Sale
  const processPOSSale = useCallback((
    items: CartItem[],
    paymentMethod: PaymentMethod,
    amountPaid: number,
    discount: number,
    tableId?: string,
    clientId?: string,
    waiterId?: string,
    discountReason?: string,
    description?: string
  ): Sale => {
    // Generate a temporary offline-visual record so interface doesn't lag
    const tempSaleId = `sale-${Date.now()}`;
    const tempSale: Sale = {
      id: tempSaleId,
      ticketNumber: `TKT-GENERANDO`,
      items: items.map(it => ({
        productId: it.product.id,
        productName: it.product.name,
        quantity: it.quantity,
        price: it.customUnitPrice !== undefined 
          ? it.customUnitPrice 
          : (it.isCocktail ? it.product.price : (it.selectedShotMl ? (it.product.price * (it.selectedShotMl / it.product.bottleConfig!.capacityMl) * 1.5) : it.product.price)),
        selectedShotMl: it.selectedShotMl,
        subtotal: it.subtotal,
        isCocktail: it.isCocktail,
        cocktailLiquorId: it.cocktailLiquorId,
        cocktailLiquorName: it.cocktailLiquorName,
        cocktailDoseMl: it.cocktailDoseMl,
        cocktailMixerId: it.cocktailMixerId,
        cocktailMixerName: it.cocktailMixerName
      })),
      subtotal: items.reduce((acc, it) => acc + it.subtotal, 0),
      discount,
      tax: 0,
      total: items.reduce((acc, it) => acc + it.subtotal, 0) - discount,
      paymentMethod,
      amountPaid,
      change: amountPaid - (items.reduce((acc, it) => acc + it.subtotal, 0) - discount),
      userId: currentUser?.uid || 'system',
      userName: currentUser?.name || 'Sistema',
      waiterId: waiterId || undefined,
      waiterName: waiterId ? employees.find(e => e.id === waiterId)?.name : undefined,
      cashierCommission: Number(((items.reduce((acc, it) => acc + it.subtotal, 0) - discount) * 0.01).toFixed(2)),
      waiterCommission: waiterId ? Number(((items.reduce((acc, it) => acc + it.subtotal, 0) - discount) * 0.01).toFixed(2)) : 0,
      date: new Date().toISOString(),
      discountReason,
      description: description?.trim() || undefined
    };

    // Optimistically update local product stock state immediately (targeting local Caja stocks)
    setProducts(prevProducts => {
      let updatedList = [...prevProducts];
      const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
      
      for (const cartItem of items) {
        if (cartItem.isCocktail) {
          // 1. Deduct liquor
          if (cartItem.cocktailLiquorId) {
            updatedList = updatedList.map(p => {
              if (p.id === cartItem.cocktailLiquorId) {
                const cajaStock = p.cajaStock || {};
                const cajaMl = p.cajaMl || {};
                
                let currentStock = cajaStock[currentCaja] ?? p.quantity ?? 0;
                let currentMl = cajaMl[currentCaja] ?? (p.bottleConfig?.isBottle ? p.bottleConfig.capacityMl : 750);
                
                const shotUsageTotal = (cartItem.cocktailDoseMl || 50) * cartItem.quantity;
                currentMl -= shotUsageTotal;

                if (currentMl <= 0) {
                  const capacity = p.bottleConfig?.capacityMl || 750;
                  const bottleDeductions = Math.floor(Math.abs(currentMl) / capacity) + 1;
                  currentStock = Math.max(0, currentStock - bottleDeductions);
                  if (currentStock > 0) {
                    currentMl = capacity - (Math.abs(currentMl) % capacity);
                  } else {
                    currentMl = 0;
                  }
                }
                
                return {
                  ...p,
                  cajaStock: {
                    ...cajaStock,
                    [currentCaja]: currentStock
                  },
                  cajaMl: {
                    ...cajaMl,
                    [currentCaja]: currentMl
                  }
                };
              }
              return p;
            });
          }
          
          // 2. Deduct mixer
          if (cartItem.cocktailMixerId) {
            updatedList = updatedList.map(p => {
              if (p.id === cartItem.cocktailMixerId) {
                const cajaStock = p.cajaStock || {};
                const currentStock = cajaStock[currentCaja] ?? p.quantity ?? 0;
                return {
                  ...p,
                  cajaStock: {
                    ...cajaStock,
                    [currentCaja]: Math.max(0, currentStock - cartItem.quantity)
                  }
                };
              }
              return p;
            });
          }
        } else {
          // Standard item
          updatedList = updatedList.map(p => {
            if (p.id === cartItem.product.id) {
              const cajaStock = p.cajaStock || {};
              const cajaMl = p.cajaMl || {};
              
              let currentStock = cajaStock[currentCaja] ?? p.quantity ?? 0;
              let currentMl = cajaMl[currentCaja] ?? (p.bottleConfig?.isBottle ? p.bottleConfig.capacityMl : 0);

              if (cartItem.selectedShotMl && p.bottleConfig?.isBottle) {
                const shotUsageTotal = cartItem.selectedShotMl * cartItem.quantity;
                currentMl -= shotUsageTotal;

                if (currentMl <= 0) {
                  const capacity = p.bottleConfig.capacityMl;
                  const bottleDeductions = Math.floor(Math.abs(currentMl) / capacity) + 1;
                  currentStock = Math.max(0, currentStock - bottleDeductions);
                  if (currentStock > 0) {
                    currentMl = capacity - (Math.abs(currentMl) % capacity);
                  } else {
                    currentMl = 0;
                  }
                }
              } else {
                currentStock = Math.max(0, currentStock - cartItem.quantity);
              }

              return {
                ...p,
                cajaStock: {
                  ...cajaStock,
                  [currentCaja]: currentStock
                },
                cajaMl: {
                  ...cajaMl,
                  [currentCaja]: currentMl
                }
              };
            }
            return p;
          });
        }
      }
      return updatedList;
    });

    if (tableId) {
      setTables(prev => prev.map(t => t.id === tableId ? {
        ...t,
        status: TableStatus.FREE,
        consumption: [],
        currentWaiterId: '',
        currentWaiterName: '',
        openedAt: ''
      } : t));
    }

    processPOSSaleInFirestore(
      items,
      paymentMethod,
      amountPaid,
      discount,
      config.taxRate,
      currentUser,
      activeSession?.id,
      tableId,
      clientId,
      waiterId,
      discountReason,
      description
    )
      .then((realSale) => {
        addAuditLog('Ventas', `Nueva Venta POS Realizada: ${realSale.ticketNumber}`, null, realSale);
      })
      .catch((err: any) => {
        addAuditLog('Ventas', 'Fallo de Procesamiento de Venta', null, { error: err.message });
        alert(`Error al procesar venta: ${err.message}`);
      });

    return tempSale;
  }, [currentUser, activeSession, config.taxRate, addAuditLog]);

  // Cancel sale
  const cancelSale = useCallback((saleId: string, observations: string) => {
    const match = sales.find(s => s.id === saleId);
    if (!match) return;

    cancelSaleInFirestore(saleId, observations, currentUser)
      .then(() => {
        addAuditLog('Ventas', `Venta POS ANULADA: ${match.ticketNumber}`, match, { status: 'ANULADO', motivo: observations });
        
        // Optimistically restore local product stock state immediately
        setProducts(prevProducts => {
          return prevProducts.map(p => {
            const saleItem = match.items.find(it => it.productId === p.id);
            if (saleItem) {
              let updatedStock = p.quantity;
              let updatedMl = p.bottleConfig?.currentMl || 0;

              if (saleItem.selectedShotMl && p.bottleConfig?.isBottle) {
                updatedMl += saleItem.selectedShotMl * saleItem.quantity;
                if (updatedMl > p.bottleConfig.capacityMl) {
                  const bottlesCreated = Math.floor(updatedMl / p.bottleConfig.capacityMl);
                  updatedStock += bottlesCreated;
                  updatedMl = updatedMl % p.bottleConfig.capacityMl;
                }
              } else {
                updatedStock += saleItem.quantity;
              }

              return {
                ...p,
                quantity: updatedStock,
                bottleConfig: p.bottleConfig ? {
                  ...p.bottleConfig,
                  currentMl: updatedMl
                } : undefined
              };
            }
            return p;
          });
        });
      })
      .catch(err => console.error('Failed to cancel sale:', err));
  }, [sales, currentUser, addAuditLog]);

  // Tables Management
  const updateTableStatus = useCallback((tableId: string, status: TableStatus, waiterId?: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      if (status === TableStatus.FREE) {
        return {
          ...t,
          status: TableStatus.FREE,
          consumption: [],
          reservationClient: '',
          reservationPhone: '',
          reservationTime: '',
          reservationDate: '',
          reservationPeople: 0,
          reservationCoverPaid: 0,
          reservationPaymentVerified: false,
          reservationStatus: 'atendido',
          notes: '',
          currentWaiterId: '',
          currentWaiterName: '',
          openedAt: ''
        };
      }
      return {
        ...t,
        status,
        currentWaiterId: waiterId !== undefined ? waiterId : (t.currentWaiterId || ''),
        openedAt: status === TableStatus.OCCUPIED ? new Date().toISOString() : t.openedAt
      };
    }));

    updateTableStatusInFirestore(tableId, status, waiterId)
      .catch(err => console.error('Failed to update table status:', err));
  }, []);

  const addConsumptionToTable = useCallback((tableId: string, item: CartItem) => {
    addConsumptionToTableInFirestore(tableId, item)
      .catch(err => console.error('Failed to add consumption to table:', err));
  }, []);

  const removeConsumptionFromTable = useCallback((tableId: string, productId: string, shotMl?: number) => {
    removeConsumptionFromTableInFirestore(tableId, productId, shotMl)
      .catch(err => console.error('Failed to remove consumption from table:', err));
  }, []);

  const transferConsumption = useCallback((fromTableId: string, toTableId: string) => {
    transferConsumptionInFirestore(fromTableId, toTableId)
      .then(() => {
        const fromTab = tables.find(t => t.id === fromTableId);
        const toTab = tables.find(t => t.id === toTableId);
        addAuditLog('Mesas', `Transferencia de Consumos: Mesa ${fromTab?.number} -> ${toTab?.number}`, fromTab?.consumption, { status: 'Transferido' });
      })
      .catch(err => console.error('Failed to transfer consumption:', err));
  }, [tables, addAuditLog]);

  const clearTableConsumption = useCallback((tableId: string) => {
    clearTableConsumptionInFirestore(tableId)
      .catch(err => console.error('Failed to clear table consumption:', err));
  }, []);

  const saveTableReservation = useCallback((
    tableId: string, 
    clientName: string, 
    phone: string, 
    time: string, 
    people: number, 
    coverPaid: number, 
    notes: string,
    date?: string,
    paymentVerified?: boolean,
    status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado' = 'pendiente',
    courtesyBottleId?: string,
    courtesyBottleName?: string,
    courtesyBottlePrice?: number,
    courtesyBottleUpgradePaid?: number,
    courtesyBottleDelivered?: boolean
  ) => {
    const isAllowed = 
      currentUser?.role === UserRole.GERENTE || 
      currentUser?.role === UserRole.ADMIN || 
      currentUser?.role === UserRole.CAJA;

    if (!isAllowed) {
      alert('🔒 Acceso Denegado: Únicamente el personal de Gerencia y Caja tiene autorización para realizar y gestionar reservaciones.');
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const targetTable = tables.find(tbl => tbl.id === tableId);
    if (targetTable) {
      let existingResList: TableReservation[] = targetTable.reservations ? [...targetTable.reservations] : [];
      if (existingResList.length === 0 && targetTable.reservationClient && targetTable.reservationClient.trim().length > 0) {
        existingResList.push({
          id: `${targetTable.id}_legacy`,
          tableId: targetTable.id,
          tableNumber: targetTable.number,
          clientName: targetTable.reservationClient,
          phone: targetTable.reservationPhone || '',
          time: targetTable.reservationTime || '22:00',
          date: targetTable.reservationDate || todayStr,
          people: targetTable.reservationPeople || 4,
          coverPaid: targetTable.reservationCoverPaid || 0,
          paymentVerified: Boolean(targetTable.reservationPaymentVerified),
          status: targetTable.reservationStatus || 'pendiente'
        });
      }

      const activeResOnDate = existingResList.find(r => r.date === targetDate && r.status !== 'cancelado');
      if (activeResOnDate) {
        alert(`⛔ La Mesa #${targetTable.number} ya cuenta con una reserva activa para la fecha ${formatDateDDMMAAAA(targetDate)} (${activeResOnDate.clientName}). No se permite reservar la misma mesa dos veces en la misma fecha.`);
        return;
      }
    }

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;

      let resList: TableReservation[] = t.reservations ? [...t.reservations] : [];
      if (resList.length === 0 && t.reservationClient && t.reservationClient.trim().length > 0) {
        resList.push({
          id: `${t.id}_legacy`,
          tableId: t.id,
          tableNumber: t.number,
          clientName: t.reservationClient,
          phone: t.reservationPhone || '',
          time: t.reservationTime || '22:00',
          date: t.reservationDate || todayStr,
          people: t.reservationPeople || 4,
          coverPaid: t.reservationCoverPaid || 0,
          paymentVerified: Boolean(t.reservationPaymentVerified),
          status: t.reservationStatus || 'pendiente'
        });
      }

      resList = resList.filter(r => r.date !== targetDate || r.status === 'cancelado');
      const newResItem: TableReservation = {
        id: `res_${Date.now()}`,
        tableId: t.id,
        tableNumber: t.number,
        clientName,
        phone,
        time,
        date: targetDate,
        people,
        coverPaid,
        paymentVerified: paymentVerified !== undefined ? paymentVerified : coverPaid > 0,
        status,
        notes: notes || `Reservada para ${clientName} a las ${time} (${targetDate})`,
        createdAt: new Date().toISOString(),
        courtesyBottleId,
        courtesyBottleName,
        courtesyBottlePrice,
        courtesyBottleUpgradePaid,
        courtesyBottleDelivered: courtesyBottleDelivered || false
      };
      resList.push(newResItem);

      const isToday = targetDate === todayStr;
      return {
        ...t,
        reservations: resList,
        status: isToday && (!t.consumption || t.consumption.length === 0) ? TableStatus.RESERVED : t.status,
        reservationClient: isToday ? clientName : (t.reservationClient || clientName),
        reservationPhone: isToday ? phone : (t.reservationPhone || phone),
        reservationTime: isToday ? time : (t.reservationTime || time),
        reservationDate: isToday ? targetDate : (t.reservationDate || targetDate),
        reservationPeople: isToday ? people : (t.reservationPeople || people),
        reservationCoverPaid: isToday ? coverPaid : (t.reservationCoverPaid || coverPaid),
        reservationPaymentVerified: isToday ? (paymentVerified !== undefined ? paymentVerified : coverPaid > 0) : (t.reservationPaymentVerified ?? false),
        reservationStatus: isToday ? status : (t.reservationStatus || status),
        notes: notes || `Reservada para ${clientName} a las ${time}`,
        reservationCourtesyBottleId: isToday ? (courtesyBottleId || '') : t.reservationCourtesyBottleId,
        reservationCourtesyBottleName: isToday ? (courtesyBottleName || '') : t.reservationCourtesyBottleName,
        reservationCourtesyBottlePrice: isToday ? (courtesyBottlePrice || 0) : t.reservationCourtesyBottlePrice,
        reservationCourtesyBottleUpgradePaid: isToday ? (courtesyBottleUpgradePaid || 0) : t.reservationCourtesyBottleUpgradePaid,
        reservationCourtesyBottleDelivered: isToday ? Boolean(courtesyBottleDelivered) : t.reservationCourtesyBottleDelivered
      };
    }));

    saveTableReservationInFirestore(
      tableId, 
      clientName, 
      phone, 
      time, 
      people, 
      coverPaid, 
      notes, 
      date, 
      paymentVerified, 
      status,
      courtesyBottleId,
      courtesyBottleName,
      courtesyBottlePrice,
      courtesyBottleUpgradePaid,
      courtesyBottleDelivered
    )
      .then(() => {
        const t = tables.find(tbl => tbl.id === tableId);
        addAuditLog('Mesas', `Nueva Reserva: Mesa ${t?.number || tableId} para ${clientName} (${targetDate})`, null, { 
          clientName, phone, time, date: targetDate, people, coverPaid, paymentVerified, status, notes, courtesyBottleName, courtesyBottleUpgradePaid
        });
      })
      .catch(err => console.error('Failed to save table reservation:', err));
  }, [currentUser, tables, addAuditLog]);

  const deliverReservationCourtesyBottle = useCallback(async (tableId: string, targetDate?: string) => {
    const isAllowed = 
      currentUser?.role === UserRole.GERENTE || 
      currentUser?.role === UserRole.ADMIN || 
      currentUser?.role === UserRole.CAJA ||
      currentUser?.role === UserRole.ALMACENERO;

    if (!isAllowed) {
      alert('🔒 Acceso Denegado: Únicamente el personal autorizado (Gerencia, Caja, Almacén) puede registrar la entrega de la botella de cortesía.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const searchDate = targetDate || todayStr;

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const resList = (t.reservations || []).map(r => {
        if (r.date === searchDate && r.status !== 'cancelado') {
          return { ...r, courtesyBottleDelivered: true };
        }
        return r;
      });
      const isToday = searchDate === todayStr || searchDate === t.reservationDate;
      return {
        ...t,
        reservations: resList,
        reservationCourtesyBottleDelivered: isToday ? true : t.reservationCourtesyBottleDelivered
      };
    }));

    try {
      await deliverReservationCourtesyBottleInFirestore(tableId, targetDate, currentUser);
      const t = tables.find(tbl => tbl.id === tableId);
      addAuditLog('Mesas', `Entrega Botella Cortesía de Almacén: Mesa ${t?.number || tableId}`, null, { tableId, searchDate });
    } catch (err: any) {
      console.error('Failed to deliver reservation courtesy bottle:', err);
      alert(`⚠️ ${err?.message || 'Error al procesar la entrega de la botella de cortesía.'}`);
    }
  }, [currentUser, tables, addAuditLog]);

  const verifyReservationPayment = useCallback((tableId: string, verified: boolean, targetDate?: string) => {
    const isAllowed = 
      currentUser?.role === UserRole.GERENTE || 
      currentUser?.role === UserRole.ADMIN || 
      currentUser?.role === UserRole.CAJA;

    if (!isAllowed) {
      alert('🔒 Acceso Denegado: Únicamente el personal de Gerencia y Caja tiene autorización para verificar pagos de reservaciones.');
      return;
    }

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const resList = (t.reservations || []).map(r => (!targetDate || r.date === targetDate) ? { ...r, paymentVerified: verified, status: (verified ? 'pagado' : 'pendiente') as any } : r);
      return {
        ...t,
        reservations: resList,
        reservationPaymentVerified: verified,
        reservationStatus: verified ? 'pagado' : 'pendiente'
      };
    }));

    verifyReservationPaymentInFirestore(tableId, verified, targetDate)
      .then(() => {
        const t = tables.find(tbl => tbl.id === tableId);
        addAuditLog('Caja', `Verificación Pago Reserva: Mesa ${t?.number || tableId}`, null, { verified, targetDate });
      })
      .catch(err => console.error('Failed to verify reservation payment:', err));
  }, [currentUser, tables, addAuditLog]);

  const updateReservationStatus = useCallback((
    tableId: string, 
    status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado',
    targetDate?: string
  ) => {
    const isAllowed = 
      currentUser?.role === UserRole.GERENTE || 
      currentUser?.role === UserRole.ADMIN || 
      currentUser?.role === UserRole.CAJA;

    if (!isAllowed) {
      alert('🔒 Acceso Denegado: Únicamente el personal de Gerencia y Caja tiene autorización para actualizar reservaciones.');
      return;
    }

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const resList = (t.reservations || []).map(r => (!targetDate || r.date === targetDate) ? { ...r, status } : r);
      return {
        ...t,
        reservations: resList,
        reservationStatus: status
      };
    }));

    updateReservationStatusInFirestore(tableId, status, targetDate)
      .then(() => {
        const t = tables.find(tbl => tbl.id === tableId);
        addAuditLog('Mesas', `Estado Reserva Actualizado: Mesa ${t?.number || tableId} -> ${status}`, null, { status, targetDate });
      })
      .catch(err => console.error('Failed to update reservation status:', err));
  }, [currentUser, tables, addAuditLog]);

  const cancelTableReservation = useCallback((tableId: string, targetDate?: string) => {
    const isAllowed = 
      currentUser?.role === UserRole.GERENTE || 
      currentUser?.role === UserRole.ADMIN || 
      currentUser?.role === UserRole.CAJA;

    if (!isAllowed) {
      alert('🔒 Acceso Denegado: Únicamente el personal de Gerencia y Caja tiene autorización para cancelar reservaciones.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;

      let resList = (t.reservations || []).filter(r => targetDate ? (r.date !== targetDate && r.status !== 'cancelado') : false);

      const isCancelingTodayOrAll = !targetDate || targetDate === todayStr || targetDate === t.reservationDate;

      if (isCancelingTodayOrAll) {
        const activeToday = resList.find(r => r.date === todayStr && r.status !== 'cancelado');
        if (activeToday) {
          return {
            ...t,
            reservations: resList,
            reservationClient: activeToday.clientName,
            reservationPhone: activeToday.phone,
            reservationTime: activeToday.time,
            reservationDate: activeToday.date,
            reservationPeople: activeToday.people,
            reservationCoverPaid: activeToday.coverPaid,
            reservationPaymentVerified: activeToday.paymentVerified,
            reservationStatus: activeToday.status,
            notes: activeToday.notes || ''
          };
        }

        return {
          ...t,
          reservations: resList,
          status: (t.status === TableStatus.RESERVED && (!t.consumption || t.consumption.length === 0)) ? TableStatus.FREE : t.status,
          reservationClient: '',
          reservationPhone: '',
          reservationTime: '',
          reservationDate: '',
          reservationPeople: 0,
          reservationCoverPaid: 0,
          reservationPaymentVerified: false,
          reservationStatus: 'cancelado',
          notes: ''
        };
      }

      return {
        ...t,
        reservations: resList
      };
    }));

    cancelTableReservationInFirestore(tableId, targetDate)
      .then(() => {
        const t = tables.find(tbl => tbl.id === tableId);
        addAuditLog('Mesas', `Reserva Cancelada: Mesa ${t?.number || tableId}`, null, { tableId, targetDate });
      })
      .catch(err => console.error('Failed to cancel table reservation:', err));
  }, [currentUser, tables, addAuditLog]);

  const moveTableToAnother = useCallback((fromTableId: string, toTableId: string, targetDate?: string) => {
    const fromTab = tables.find(t => t.id === fromTableId);
    const toTab = tables.find(t => t.id === toTableId);

    if (!fromTab || !toTab) return;
    const todayDateStr = new Date().toISOString().split('T')[0];
    const moveDate = targetDate || todayDateStr;

    // RULE 4: Cannot move if source table is currently OCCUPIED or has active consumption
    if (fromTab.status === TableStatus.OCCUPIED || (fromTab.consumption && fromTab.consumption.length > 0)) {
      alert(`⛔ No se puede mover la Mesa #${fromTab.number} porque se encuentra actualmente Ocupada o en atención.`);
      return;
    }

    const getNormalizedReservations = (t: Table): TableReservation[] => {
      let list = t.reservations ? [...t.reservations] : [];
      if (list.length === 0 && t.reservationClient && t.reservationClient.trim().length > 0) {
        list.push({
          id: `${t.id}_legacy`,
          tableId: t.id,
          tableNumber: t.number,
          clientName: t.reservationClient,
          phone: t.reservationPhone || '',
          time: t.reservationTime || '22:00',
          date: t.reservationDate || todayDateStr,
          people: t.reservationPeople || 4,
          coverPaid: t.reservationCoverPaid || 0,
          paymentVerified: Boolean(t.reservationPaymentVerified),
          status: t.reservationStatus || 'pendiente',
          notes: t.notes || ''
        });
      }
      return list;
    };

    const fromResList = getNormalizedReservations(fromTab);
    const toResList = getNormalizedReservations(toTab);

    // RULE 3: Cannot move to target table if it already has an active reservation for moveDate
    const isToReservedOnDate = toResList.some(r => r.date === moveDate && r.status !== 'cancelado') ||
      (toTab.reservationDate === moveDate && Boolean(toTab.reservationClient) && toTab.reservationStatus !== 'cancelado');

    if (isToReservedOnDate) {
      alert(`⛔ No se puede mover la reserva a la Mesa #${toTab.number} porque ya cuenta con una reserva activa para la fecha ${formatDateDDMMAAAA(moveDate)}.`);
      return;
    }

    if (moveDate === todayDateStr && (toTab.status === TableStatus.OCCUPIED || (toTab.consumption && toTab.consumption.length > 0))) {
      alert(`⛔ No se puede mover a la Mesa #${toTab.number} de destino porque está actualmente Ocupada.`);
      return;
    }

    // Identify reservation to move
    const resToMove = fromResList.find(r => r.date === moveDate && r.status !== 'cancelado') ||
      (fromTab.reservationDate === moveDate && fromTab.reservationClient ? {
        id: `${fromTab.id}_legacy`,
        tableId: fromTab.id,
        tableNumber: fromTab.number,
        clientName: fromTab.reservationClient,
        phone: fromTab.reservationPhone || '',
        time: fromTab.reservationTime || '22:00',
        date: moveDate,
        people: fromTab.reservationPeople || 4,
        coverPaid: fromTab.reservationCoverPaid || 0,
        paymentVerified: Boolean(fromTab.reservationPaymentVerified),
        status: fromTab.reservationStatus || 'pendiente',
        notes: fromTab.notes || ''
      } : null);

    // RULE 1: KEEP all reservations for OTHER dates intact on fromTab
    const newFromResList = fromResList.filter(r => !(r.date === moveDate && r.status !== 'cancelado'));
    
    // KEEP all reservations for OTHER dates intact on toTab
    const newToResList = [...toResList.filter(r => !(r.date === moveDate && r.status !== 'cancelado'))];
    if (resToMove) {
      newToResList.push({
        ...resToMove,
        tableId: toTab.id,
        tableNumber: toTab.number
      });
    }

    setTables(prev => prev.map(t => {
      if (t.id === fromTableId) {
        const activeTodayFrom = newFromResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');
        if (activeTodayFrom) {
          return {
            ...t,
            reservations: newFromResList,
            status: TableStatus.RESERVED,
            reservationClient: activeTodayFrom.clientName,
            reservationPhone: activeTodayFrom.phone || '',
            reservationTime: activeTodayFrom.time,
            reservationDate: activeTodayFrom.date,
            reservationPeople: activeTodayFrom.people,
            reservationCoverPaid: activeTodayFrom.coverPaid,
            reservationPaymentVerified: activeTodayFrom.paymentVerified,
            reservationStatus: activeTodayFrom.status,
            notes: activeTodayFrom.notes || ''
          };
        }
        return {
          ...t,
          reservations: newFromResList,
          status: TableStatus.FREE,
          consumption: [],
          reservationClient: '',
          reservationPhone: '',
          reservationTime: '',
          reservationDate: '',
          reservationPeople: 0,
          reservationCoverPaid: 0,
          reservationPaymentVerified: false,
          reservationStatus: 'cancelado',
          notes: '',
          currentWaiterId: '',
          currentWaiterName: '',
          openedAt: ''
        };
      }

      if (t.id === toTableId) {
        const activeTodayTo = newToResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');
        const newToConsumption = moveDate === todayDateStr ? [...(t.consumption || []), ...(fromTab.consumption || [])] : (t.consumption || []);
        const nextToStatus = newToConsumption.length > 0 ? TableStatus.OCCUPIED : (activeTodayTo ? TableStatus.RESERVED : TableStatus.FREE);

        return {
          ...t,
          reservations: newToResList,
          consumption: newToConsumption,
          status: nextToStatus,
          currentWaiterId: t.currentWaiterId || fromTab.currentWaiterId || '',
          currentWaiterName: t.currentWaiterName || fromTab.currentWaiterName || '',
          openedAt: t.openedAt || fromTab.openedAt || (nextToStatus === TableStatus.OCCUPIED ? new Date().toISOString() : ''),
          reservationClient: activeTodayTo ? activeTodayTo.clientName : '',
          reservationPhone: activeTodayTo ? activeTodayTo.phone : '',
          reservationTime: activeTodayTo ? activeTodayTo.time : '',
          reservationDate: activeTodayTo ? activeTodayTo.date : '',
          reservationPeople: activeTodayTo ? activeTodayTo.people : 0,
          reservationCoverPaid: activeTodayTo ? activeTodayTo.coverPaid : 0,
          reservationPaymentVerified: activeTodayTo ? activeTodayTo.paymentVerified : false,
          reservationStatus: activeTodayTo ? activeTodayTo.status : 'pendiente',
          notes: activeTodayTo ? (activeTodayTo.notes || '') : ''
        };
      }

      return t;
    }));

    addAuditLog('Mesas', `Mudar Mesa/Reserva (${moveDate}): #${fromTab.number} -> #${toTab.number}`, null, { fromTableId, toTableId, targetDate: moveDate });

    moveTableInFirestore(fromTableId, toTableId, moveDate)
      .catch(err => console.error('Failed to move table in Firestore:', err));
  }, [tables, addAuditLog]);

  // Cash / Shift Sessions
  const openCashSession = useCallback((openingBalance: number, observations?: string) => {
    if (activeSession) return;
    openCashSessionInFirestore(openingBalance, observations || '', currentUser, selectedCaja)
      .then((session) => {
        addAuditLog('Caja', 'Apertura de Caja', null, session);
      })
      .catch(err => console.error('Failed to open cash session:', err));
  }, [activeSession, currentUser, selectedCaja, addAuditLog]);

  const closeCashSession = useCallback((realBalance: number, observations?: string) => {
    if (!activeSession) return;
    const sessionToClose = { ...activeSession };
    closeCashSessionInFirestore(activeSession.id, realBalance, observations)
      .then(() => {
        const closedCaja = sessionToClose.cajaAsociada || 'Caja 1';
        try {
          localStorage.removeItem(`ambar_audit_sheet_draft_${closedCaja}`);
        } catch (e) {
          console.error('Failed to clear audit sheet draft on closeCashSession:', e);
        }

        addAuditLog('Caja', 'Cierre de Caja', sessionToClose, { realBalance, status: 'Cerrada' });
      })
      .catch(err => console.error('Failed to close cash session:', err));
  }, [activeSession, addAuditLog]);

  const registerCashInflow = useCallback((amount: number, observations: string) => {
    if (!activeSession) return;
    registerCashInflowInFirestore(activeSession.id, amount)
      .then(() => {
        addAuditLog('Caja', 'Ingreso Manual de Caja', null, { amount, observations });
      })
      .catch(err => console.error('Failed to register cash inflow:', err));
  }, [activeSession, addAuditLog]);

  const registerCashOutflow = useCallback((amount: number, observations: string) => {
    if (!activeSession) return;
    registerCashOutflowInFirestore(activeSession.id, amount)
      .then(() => {
        addAuditLog('Caja', 'Egreso Manual de Caja / Gasto', null, { amount, observations });
      })
      .catch(err => console.error('Failed to register cash outflow:', err));
  }, [activeSession, addAuditLog]);

  const addCashExpense = useCallback(async (expense: Omit<CashExpense, 'id' | 'date' | 'registeredBy'>) => {
    const id = `exp-${Date.now()}`;
    const expenseRef = doc(db, 'cashExpenses', id);
    const newExpense: CashExpense = {
      ...expense,
      id,
      date: new Date().toISOString(),
      registeredBy: currentUser?.name || 'Sistema'
    };

    await setDoc(expenseRef, newExpense);

    const targetSessionId = expense.sessionId || (activeSession ? activeSession.id : null);
    if (targetSessionId) {
      await registerCashOutflowInFirestore(targetSessionId, expense.amount);
    }

    addAuditLog('Gastos', `Nuevo Gasto de Caja Registrado: Bs ${expense.amount}`, null, newExpense);
  }, [currentUser, activeSession, addAuditLog]);

  // Clientes
  const saveClient = useCallback((client: Client) => {
    const id = client.id || `cl-${Date.now()}`;
    const clientRef = doc(db, 'clients', id);
    const exists = clients.find(c => c.id === client.id);

    const clientWithId = {
      ...client,
      id,
      createdAt: client.createdAt || new Date().toISOString()
    };

    setDoc(clientRef, clientWithId)
      .then(() => {
        addAuditLog('Clientes', `Modificación/Guardado de Cliente: ${client.name}`, exists || null, clientWithId);
      })
      .catch(err => console.error('Failed to save client:', err));
  }, [clients, addAuditLog]);

  // Empleados
  const saveEmployee = useCallback((employee: Employee) => {
    const id = employee.id || `emp-${Date.now()}`;
    const empRef = doc(db, 'employees', id);
    const exists = employees.find(e => e.id === employee.id);

    const employeeWithId: Employee = {
      ...employee,
      id,
      salesCount: employee.salesCount || 0,
      totalSalesValue: employee.totalSalesValue || 0,
      totalComissions: employee.totalComissions || 0,
      isActive: employee.isActive ?? true
    };

    setDoc(empRef, employeeWithId)
      .then(() => {
        addAuditLog('Empleados', `Modificación/Guardado de Empleado: ${employee.name}`, exists || null, employeeWithId);
      })
      .catch(err => console.error('Failed to save employee:', err));
  }, [employees, addAuditLog]);

  const registerEmployeeAttendance = useCallback((employeeId: string, status: string) => {
    addAuditLog('Empleados', `Registro de Asistencia Empleado (${status})`, null, { employeeId });
  }, [addAuditLog]);

  // System Configuration
  const saveConfig = useCallback((newConfig: SystemConfig) => {
    const before = { ...config };
    const configRef = doc(db, 'config', 'system');
    
    setDoc(configRef, newConfig)
      .then(() => {
        addAuditLog('Configuración', 'Modificación de Datos de Empresa / Impuestos', before, newConfig);
      })
      .catch(err => console.error('Failed to save config:', err));
  }, [config, addAuditLog]);

  const updateConfig = useCallback((newConfig: SystemConfig) => {
    saveConfig(newConfig);
  }, [saveConfig]);

  const addUser = useCallback((name: string, email: string, role: UserRole) => {
    const emailLower = email.trim().toLowerCase();
    const uid = `user-${Date.now()}`;
    const newUser: User = {
      uid,
      email: emailLower,
      name,
      role,
      isActive: true,
      permissions: ['all'],
      createdAt: new Date().toISOString()
    };
    
    setDoc(doc(db, 'users', uid), newUser)
      .then(() => {
        addAuditLog('Seguridad', `Creación de nuevo usuario: ${name} (${emailLower})`, null, newUser);
      })
      .catch(err => {
        console.error('Failed to add user to Firestore:', err);
      });
  }, [addAuditLog]);

  const removeUser = useCallback((uid: string) => {
    const userToDel = users.find(u => u.uid === uid);
    if (!userToDel) return;
    const updated = { ...userToDel, isActive: false };
    setDoc(doc(db, 'users', uid), updated)
      .then(() => {
        addAuditLog('Seguridad', `Inactivación de usuario: ${userToDel.name}`, userToDel, updated);
      })
      .catch(err => {
        console.error('Failed to disable user:', err);
      });
  }, [users, addAuditLog]);

  const resetWarehouse = useCallback(async () => {
    await resetWarehouseWithOfficialProducts(db);
    addAuditLog('Inventarios', 'Restablecer Catálogo', null, { 
      message: 'Catálogo de almacén restablecido al listado oficial de 61 productos de AMBAR CLUB' 
    });
  }, [addAuditLog]);

  const zeroOutProductStocks = useCallback(async () => {
    const updatedCount = await zeroOutAllProductStocksInFirestore();
    addAuditLog('Inventarios', 'Vaciar Stock Almacén', null, { 
      message: `Se estableció el stock a 0 para ${updatedCount} productos del catálogo sin borrar sus códigos ni precios.` 
    });
    return updatedCount;
  }, [addAuditLog]);

  const clearOperationalData = useCallback(async () => {
    await purgeOperationalData(db);
    addAuditLog('Sistema', 'Limpieza Base de Datos', null, {
      message: 'Limpieza total de datos operativos y transaccionales completada para inicio de operaciones.'
    });
  }, [addAuditLog]);

  const clearMovementsOnly = useCallback(async () => {
    await purgeOperationalData(db);
    addAuditLog('Sistema', 'Eliminación de Movimientos (Conservar Usuarios)', null, {
      message: 'Todos los movimientos, ventas y transacciones fueron eliminados de la base de datos sin afectar cuentas de usuarios.'
    });
  }, [addAuditLog]);

  const submitWaiterReport = useCallback(async (reportData: Omit<WaiterReport, 'id' | 'waiterId' | 'waiterName' | 'status' | 'date'>) => {
    try {
      await submitWaiterReportToFirestore(reportData, currentUser);
      addAuditLog('POS', 'Envío Reporte Venta', null, {
        waiter: currentUser?.name,
        targetCaja: reportData.targetCaja,
        total: reportData.total,
        paymentMethod: reportData.paymentMethod
      });
    } catch (error: any) {
      console.error('Error submitting waiter report:', error);
      throw error;
    }
  }, [currentUser, addAuditLog]);

  const resolveWaiterReport = useCallback(async (reportId: string, status: 'aprobado' | 'rechazado') => {
    try {
      await resolveWaiterReportInFirestore(reportId, status, currentUser, activeSession?.id, config.taxRate);
      const rep = waiterReports.find(r => r.id === reportId);
      addAuditLog('POS', `Resolución Reporte Venta (${status.toUpperCase()})`, rep, {
        resolvedBy: currentUser?.name,
        status,
        waiterName: rep?.waiterName,
        total: rep?.total
      });
    } catch (error: any) {
      console.error('Error resolving waiter report:', error);
      throw error;
    }
  }, [currentUser, activeSession, config.taxRate, waiterReports, addAuditLog]);

  const contextValue = useMemo(() => ({
    currentUser,
    setCurrentUser,
    users,
    setUsers,
    products,
    categories,
    suppliers,
    purchases,
    sales,
    movements,
    tables,
    cashSessions,
    activeSession,
    selectedCaja,
    setSelectedCaja,
    clients,
    employees,
    auditLogs,
    config,
    waiterReports,
    cashExpenses,
    addCashExpense,
    login,
    logout,
    registerSessionActivity,
    saveProduct,
    deleteProduct,
    saveCategory,
    saveSupplier,
    registerPurchase,
    adjustStock,
    transferStockToCaja,
    paleteoStock,
    returnCajaStockToWarehouse,
    processPOSSale,
    cancelSale,
    updateTableStatus,
    addConsumptionToTable,
    removeConsumptionFromTable,
    transferConsumption,
    clearTableConsumption,
    saveTableReservation,
    deliverReservationCourtesyBottle,
    verifyReservationPayment,
    updateReservationStatus,
    cancelTableReservation,
    moveTableToAnother,
    openCashSession,
    closeCashSession,
    registerCashInflow,
    registerCashOutflow,
    saveClient,
    saveEmployee,
    registerEmployeeAttendance,
    saveConfig,
    updateConfig,
    addUser,
    removeUser,
    addAuditLog,
    resetWarehouse,
    zeroOutProductStocks,
    clearOperationalData,
    clearMovementsOnly,
    submitWaiterReport,
    resolveWaiterReport,
    openBottles,
    discardOpenBottle
  }), [
    currentUser,
    users,
    products,
    categories,
    suppliers,
    purchases,
    sales,
    movements,
    tables,
    cashSessions,
    activeSession,
    selectedCaja,
    clients,
    employees,
    auditLogs,
    config,
    waiterReports,
    cashExpenses,
    addCashExpense,
    login,
    logout,
    registerSessionActivity,
    saveProduct,
    deleteProduct,
    saveCategory,
    saveSupplier,
    registerPurchase,
    adjustStock,
    transferStockToCaja,
    paleteoStock,
    returnCajaStockToWarehouse,
    processPOSSale,
    cancelSale,
    updateTableStatus,
    addConsumptionToTable,
    removeConsumptionFromTable,
    transferConsumption,
    clearTableConsumption,
    saveTableReservation,
    deliverReservationCourtesyBottle,
    verifyReservationPayment,
    updateReservationStatus,
    cancelTableReservation,
    moveTableToAnother,
    openCashSession,
    closeCashSession,
    registerCashInflow,
    registerCashOutflow,
    saveClient,
    saveEmployee,
    registerEmployeeAttendance,
    saveConfig,
    updateConfig,
    addUser,
    removeUser,
    addAuditLog,
    resetWarehouse,
    zeroOutProductStocks,
    clearOperationalData,
    clearMovementsOnly,
    submitWaiterReport,
    resolveWaiterReport,
    openBottles
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
