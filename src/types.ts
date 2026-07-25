/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'Administrador',
  GERENTE = 'Gerente',
  SUPERVISOR = 'Supervisor',
  CAJA = 'Caja',
  BARTENDER = 'Bartender',
  ALMACENERO = 'Almacenero',
  MESERO = 'Mesero',
  AUDITOR = 'Auditor'
}

export interface User {
  uid: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  nit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  contact: string;
  observations?: string;
  pendingBalance: number;
}

export interface BottleConfig {
  isBottle: boolean;         // True if tracked as a bottle by ml
  capacityMl: number;        // e.g. 750, 1000
  currentMl: number;         // remaining ml
  shotSizes: number[];       // allowed shot sizes e.g. [30, 50, 60]
}

export interface RecipeIngredient {
  productId: string;
  productName?: string;
  isOpeningControlled?: boolean;
}

export interface Recipe {
  id?: string;
  name?: string;
  ingredients: RecipeIngredient[];
}

export interface Product {
  id: string;
  name: string;
  internalCode: string;
  barCode: string;
  category: string; // e.g. Whisky, Ron, Vodka, Refrescos
  brand: string;
  supplierId: string;
  description: string;
  cost: number;
  price: number;
  specialPrice?: number;
  unit: string; // e.g. Botella, Unidad, Lata, Trago
  quantity: number; // For non-bottle items, count. For bottle items, count of bottles.
  minStock: number;
  maxStock: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isPhysical?: boolean;               // True if physically stored in Warehouse (bottles, cans, mixers, inputs)
  isOpeningControlled?: boolean;      // True if opening control (apertura de botella) is active for this item
  bottleConfig?: BottleConfig; // Bottle configuration for shot tracking
  cajaStock?: Record<string, number>; // Local stock per Caja
  cajaMl?: Record<string, number>;    // Local open-bottle ml level per Caja
  openBottles?: Record<string, boolean>; // True if bottle is currently open per Caja
  cajaOpenBottlesCount?: Record<string, number>; // Count of open bottles currently with Bartender per Caja
  cajaFinishedBottlesCount?: Record<string, number>; // Count of open bottles declared empty/finished per Caja
  recipe?: Recipe;                    // Recipe stored in Firestore specifying ingredients for this beverage
}

/**
 * Determines if a product is a physical warehouse item (vs POS-only item like Vaso, Shot, Coctel, Servicio)
 */
export function isPhysicalProduct(p: Partial<Product>): boolean {
  if (p.isPhysical === false) return false;
  if (p.isPhysical === true) return true;

  const categoryLower = (p.category || '').toLowerCase().trim();
  const nameLower = (p.name || '').toLowerCase().trim();
  const unitLower = (p.unit || '').toLowerCase().trim();

  // Non-physical categories
  const nonPhysicalCategories = [
    'coctel', 'cóctel', 'cocteles', 'cócteles', 'cocteleria', 'coctelería',
    'vasos', 'vaso', 'shots', 'shot', 'servicios', 'servicio',
    'promociones', 'promos', 'combos', 'tragos', 'trago'
  ];

  if (nonPhysicalCategories.some(cat => categoryLower.includes(cat))) {
    return false;
  }

  // Non-physical name prefixes
  if (
    nameLower.startsWith('vaso') ||
    nameLower.startsWith('shot') ||
    nameLower.startsWith('coctel') ||
    nameLower.startsWith('cóctel') ||
    nameLower.startsWith('trago') ||
    nameLower.startsWith('promo') ||
    nameLower.startsWith('servicio') ||
    nameLower.startsWith('combo')
  ) {
    return false;
  }

  // Non-physical units
  if (['trago', 'servicio', 'shot', 'vaso', 'combo', 'promo', 'porción', 'porcion'].includes(unitLower)) {
    return false;
  }

  return true;
}

export enum MovementType {
  ENTRY = 'Entrada',
  EXIT = 'Salida',
  TRANSFER = 'Transferencia',
  ADJUSTMENT = 'Ajuste',
  SALE = 'Venta',
  PURCHASE = 'Compra'
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // count of items
  mlDelta?: number; // milliliter change if a shot was served
  userId: string;
  userName: string;
  date: string;
  cost: number;
  balanceAfter: number; // inventory quantity balance after movement
  observations: string;
}

export interface KardexEntry {
  id: string;
  productId: string;
  date: string;
  userName: string;
  movementType: string;
  quantity: number;
  balance: number;
  cost: number;
  observations: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedShotMl?: number; // if serving a shot instead of a bottle
  customUnitPrice?: number; // custom unit price set by cashier (e.g. for combos/discounts)
  subtotal: number;
  isCocktail?: boolean;
  cocktailLiquorId?: string;
  cocktailLiquorName?: string;
  cocktailDoseMl?: number;
  cocktailMixerId?: string | null;
  cocktailMixerName?: string;
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  CARD = 'Tarjeta',
  QR = 'Pago QR',
  TRANSFER = 'Transferencia'
}

export interface Sale {
  id: string;
  ticketNumber: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    selectedShotMl?: number;
    subtotal: number;
    isCocktail?: boolean;
    cocktailLiquorId?: string;
    cocktailLiquorName?: string;
    cocktailDoseMl?: number;
    cocktailMixerId?: string | null;
    cocktailMixerName?: string;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  tableId?: string; // If associated with a table consumption
  clientId?: string;
  userId: string;
  userName: string;
  waiterId?: string;
  waiterName?: string;
  cashierCommission?: number;
  waiterCommission?: number;
  date: string;
  discountReason?: string;
  description?: string;
  cajaAsociada?: string;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    subtotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  date: string;
  userId: string;
  userName: string;
}

export enum TableStatus {
  FREE = 'Libre',
  OCCUPIED = 'Ocupada',
  RESERVED = 'Reservada',
  CLEANING = 'En limpieza'
}

export interface TableReservation {
  id: string;
  tableId?: string;
  tableNumber?: string;
  clientName: string;
  phone?: string;
  time: string; // HH:mm
  date: string; // YYYY-MM-DD
  people: number;
  coverPaid: number;
  paymentVerified: boolean;
  status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado';
  notes?: string;
  createdAt?: string;
  courtesyBottleId?: string;
  courtesyBottleName?: string;
  courtesyBottlePrice?: number;
  courtesyBottleUpgradePaid?: number;
  courtesyBottleDelivered?: boolean;
}

export interface Table {
  id: string;
  number: string;
  name: string;
  status: TableStatus;
  currentWaiterId?: string;
  currentWaiterName?: string;
  consumption: CartItem[]; // Items added to the table account
  notes?: string;
  openedAt?: string;
  reservations?: TableReservation[]; // Multiple reservations indexed by date/id
  // Legacy or active single reservation fields
  reservationClient?: string;
  reservationPhone?: string;
  reservationTime?: string;
  reservationDate?: string; // e.g. "2026-07-26" (YYYY-MM-DD)
  reservationPeople?: number;
  reservationCoverPaid?: number;
  reservationPaymentVerified?: boolean; // Verified by Cashier
  reservationStatus?: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado';
  reservationCourtesyBottleId?: string;
  reservationCourtesyBottleName?: string;
  reservationCourtesyBottlePrice?: number;
  reservationCourtesyBottleUpgradePaid?: number;
  reservationCourtesyBottleDelivered?: boolean;
  reservationDrinkAlert?: boolean;
  floor?: number; // 0 for Piso 0, 1 for Piso 1
  type?: 'C' | 'M' | 'A' | 'S' | 'K'; // C=Circle, M=Mesa cuadrada, A=Alta/Rect, S=Sillón/Sofa VIP, K=Karaoke
}

export interface CashRegisterSession {
  id: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  realBalance?: number;
  difference?: number;
  status: 'Abierta' | 'Cerrada';
  cashInflows: number; // positive cash transactions
  cashOutflows: number; // manual cash withdrawals or expenses
  salesTotal: number;
  observations?: string;
  cajaAsociada?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  preferences: string;
  points: number;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  schedule: string; // e.g. "18:00 - 02:00"
  comissionsRate: number; // e.g. 5% = 0.05
  salesCount: number;
  totalSalesValue: number;
  totalComissions: number;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  role: UserRole;
  action: string; // e.g. "Apertura de Caja", "Modificación de Producto"
  module: string; // e.g. "Productos", "POS", "Caja"
  timestamp: string;
  ipAddress: string;
  ip?: string;
  deviceInfo: string;
  beforeState: string; // JSON string of state before changes, or "N/A"
  afterState: string;  // JSON string of state after changes, or "N/A"
  details?: string;
}

export interface SystemConfig {
  companyName: string;
  logoUrl?: string;
  nit: string;
  address: string;
  currency: string; // e.g. "BOB", "USD"
  taxRate: number;  // e.g. 13% = 0.13
  ticketHeader: string;
  ticketFooter: string;
  printerSeries: string;
}

export interface WaiterReport {
  id: string;
  waiterId: string;
  waiterName: string;
  targetCaja: string; // 'Caja 1', 'Caja 2', etc.
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  paymentMethod: string; // 'Efectivo' | 'Pago QR' | 'Transferencia' | etc.
  status: 'pendiente' | 'aprobado' | 'rechazado';
  imageUrl?: string; // base64 string of the uploaded proof
  total: number;
  date: string; // ISO format string
  observations?: string;
}

export interface CashExpense {
  id: string;
  amount: number;
  description: string;
  authorizedBy: string;
  recipient: string;
  category: string;
  date: string;
  cajaAsociada: string;
  sessionId?: string;
  registeredBy: string;
}


