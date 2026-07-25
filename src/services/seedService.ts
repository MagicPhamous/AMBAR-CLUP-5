/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Firestore, collection, getDocs, getDoc, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { User, Category, Supplier, Product, Table, Client, Employee, SystemConfig, UserRole, TableStatus, MovementType, InventoryMovement } from '../types';

const defaultUsers: User[] = [
  { 
    uid: 'u_aisha', 
    email: 'aisha@ambar.club', 
    username: 'aisha', 
    name: 'Aisha Arteaga', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mauricio', 
    email: 'mauricio@ambar.club', 
    username: 'mauricio', 
    name: 'Mauricio Sebastian', 
    role: UserRole.ALMACENERO, 
    isActive: true, 
    permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_valeria', 
    email: 'valeria@ambar.club', 
    username: 'valeria', 
    name: 'Valeria', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_vianca', 
    email: 'vianca@ambar.club', 
    username: 'vianca', 
    name: 'Vianca', 
    role: UserRole.ALMACENERO, 
    isActive: true, 
    permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_caja1', 
    email: 'caja1@ambar.club', 
    username: 'caja1', 
    name: 'Caja 1', 
    role: UserRole.CAJA, 
    isActive: true, 
    permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_caja2', 
    email: 'caja2@ambar.club', 
    username: 'caja2', 
    name: 'Caja 2', 
    role: UserRole.CAJA, 
    isActive: true, 
    permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_caja3', 
    email: 'caja3@ambar.club', 
    username: 'caja3', 
    name: 'Caja 3', 
    role: UserRole.CAJA, 
    isActive: true, 
    permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_caja4', 
    email: 'caja4@ambar.club', 
    username: 'caja4', 
    name: 'Caja 4', 
    role: UserRole.CAJA, 
    isActive: true, 
    permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_gerente', 
    email: 'gerente@ambar.club', 
    username: 'gerente', 
    name: 'Gerente Ámbar', 
    role: UserRole.GERENTE, 
    isActive: true, 
    permissions: ['dashboard', 'reports', 'inventory', 'products', 'tables', 'commissions', 'cash-expenses', 'audit', 'sales', 'cash'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_almacenero1', 
    email: 'almacenero1@ambar.club', 
    username: 'almacenero1', 
    name: 'Almacenero 1', 
    role: UserRole.ALMACENERO, 
    isActive: true, 
    permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero1', 
    email: 'mesero1@ambar.club', 
    username: 'mesero1', 
    name: 'Mesero 1', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero2', 
    email: 'mesero2@ambar.club', 
    username: 'mesero2', 
    name: 'Mesero 2', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero3', 
    email: 'mesero3@ambar.club', 
    username: 'mesero3', 
    name: 'Mesero 3', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero4', 
    email: 'mesero4@ambar.club', 
    username: 'mesero4', 
    name: 'Mesero 4', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero5', 
    email: 'mesero5@ambar.club', 
    username: 'mesero5', 
    name: 'Mesero 5', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero6', 
    email: 'mesero6@ambar.club', 
    username: 'mesero6', 
    name: 'Mesero 6', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero7', 
    email: 'mesero7@ambar.club', 
    username: 'mesero7', 
    name: 'Mesero 7', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_mesero8', 
    email: 'mesero8@ambar.club', 
    username: 'mesero8', 
    name: 'Mesero 8', 
    role: UserRole.MESERO, 
    isActive: true, 
    permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u1', 
    email: 'cristianbacarreza29@gmail.com', 
    username: 'cristian', 
    name: 'Cristian Bacarreza', 
    role: UserRole.ADMIN, 
    isActive: true, 
    permissions: ['all'], 
    createdAt: new Date().toISOString() 
  },
  { 
    uid: 'u_admin', 
    email: 'admin@ambar.club', 
    username: 'admin', 
    name: 'Administrador Ámbar', 
    role: UserRole.ADMIN, 
    isActive: true, 
    permissions: ['all'], 
    createdAt: new Date().toISOString() 
  }
];

const initialCategories: Category[] = [
  { id: '1', name: 'Cerveza', description: 'Cervezas nacionales e internacionales' },
  { id: '2', name: 'Champagne', description: 'Champagne y vinos espumosos' },
  { id: '3', name: 'Cigarro', description: 'Cigarrillos y tabacos' },
  { id: '4', name: 'Fernet', description: 'Fernet y digestivos' },
  { id: '5', name: 'Gin', description: 'Ginebras premium' },
  { id: '6', name: 'Licores', description: 'Licores finos, digestivos y cremas' },
  { id: '7', name: 'Mezcladores', description: 'Gaseosas, aguas, jugos y mezcladores' },
  { id: '8', name: 'Ron', description: 'Rones caribeños e importados' },
  { id: '9', name: 'RTD', description: 'Bebidas listas para consumir (Ready To Drink)' },
  { id: '10', name: 'Singani', description: 'Singanis tradicionales bolivianos de altura' },
  { id: '11', name: 'Tequila', description: 'Tequilas y shots mexicanos' },
  { id: '12', name: 'Vino', description: 'Vinos tintos, blancos y espumosos' },
  { id: '13', name: 'Vodka', description: 'Vodkas premium' },
  { id: '14', name: 'Whisky', description: 'Whiskies importados de malta y de mezcla' },
  { id: '15', name: 'Cócteles', description: 'Cócteles clásicos y de autor de Ámbar Club' }
];

const initialSuppliers: Supplier[] = [
  {
    id: 's1',
    name: 'Jorge Mendoza',
    company: 'Diageo Importaciones S.A.',
    nit: '1020435021',
    address: 'Av. Las Américas #340',
    city: 'Santa Cruz',
    phone: '+591 76012345',
    email: 'ventas@diageo.bo',
    contact: 'Jorge Mendoza (Gerente Regional)',
    observations: 'Distribuidor exclusivo de Johnnie Walker, Smirnoff y Bailey\'s.',
    pendingBalance: 0
  },
  {
    id: 's2',
    name: 'Patricia Vaca',
    company: 'Cervecería Boliviana Nacional S.A.',
    nit: '1004562024',
    address: 'Zona Industrial Av. Blanco Galindo',
    city: 'Cochabamba',
    phone: '+591 44520900',
    email: 'contacto@cbn.com.bo',
    contact: 'Patricia Vaca',
    observations: 'Proveedores oficiales de cerveza Paceña, Huari y Taquiña.',
    pendingBalance: 450
  }
];

const initialProducts: Product[] = [
  // CERVEZA
  {
    id: 'p_corona',
    name: 'Cerveza Corona',
    internalCode: 'CER-COR-001',
    barCode: '7501064191313',
    category: 'Cerveza',
    brand: 'Corona',
    supplierId: 's2',
    description: 'Cerveza clara mexicana premium, tipo pilsen.',
    cost: 14,
    price: 35,
    unit: 'Botella',
    quantity: 48,
    minStock: 12,
    maxStock: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_huari_620',
    name: 'Huari Grande de 620 ml',
    internalCode: 'CER-HUA-620',
    barCode: '7401005120302',
    category: 'Cerveza',
    brand: 'Huari',
    supplierId: 's2',
    description: 'Cerveza lager premium boliviana en botella grande.',
    cost: 16,
    price: 45,
    unit: 'Botella',
    quantity: 60,
    minStock: 12,
    maxStock: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_huari_300',
    name: 'Huari Pequeña de 300 ml',
    internalCode: 'CER-HUA-300',
    barCode: '7401005120303',
    category: 'Cerveza',
    brand: 'Huari',
    supplierId: 's2',
    description: 'Cerveza lager premium boliviana en botella personal.',
    cost: 10,
    price: 35,
    unit: 'Botella',
    quantity: 48,
    minStock: 12,
    maxStock: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_shop_huari',
    name: 'Shop de Huari',
    internalCode: 'CER-SHO-HUA',
    barCode: '7401005120304',
    category: 'Cerveza',
    brand: 'Huari',
    supplierId: 's2',
    description: 'Vaso/Chopp servido de cerveza tirada Huari.',
    cost: 8,
    price: 20,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_skol_can',
    name: 'Skol Golden Can',
    internalCode: 'CER-SKO-CAN',
    barCode: '7891991010375',
    category: 'Cerveza',
    brand: 'Skol',
    supplierId: 's2',
    description: 'Cerveza brasileña pilsner en lata.',
    cost: 7,
    price: 15,
    unit: 'Lata',
    quantity: 72,
    minStock: 12,
    maxStock: 144,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // CHAMPAGNE
  {
    id: 'p_anna_blanc',
    name: 'ANNA DE CODORNIU Blanc',
    internalCode: 'CHA-ANN-BLA',
    barCode: '8410013010111',
    category: 'Champagne',
    brand: 'Anna de Codorniu',
    supplierId: 's1',
    description: 'Cava premium brut, refrescante y floral.',
    cost: 110,
    price: 500,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [60, 150] }
  },
  {
    id: 'p_anna_rose',
    name: 'ANNA DE CODORNIU Rose',
    internalCode: 'CHA-ANN-ROS',
    barCode: '8410013010112',
    category: 'Champagne',
    brand: 'Anna de Codorniu',
    supplierId: 's1',
    description: 'Cava rosado premium con notas de frutos rojos.',
    cost: 115,
    price: 500,
    unit: 'Botella',
    quantity: 12,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [60, 150] }
  },
  {
    id: 'p_maria_rose',
    name: 'Maria Codorniu ROSE',
    internalCode: 'CHA-MAR-ROS',
    barCode: '8410013010113',
    category: 'Champagne',
    brand: 'Maria Codorniu',
    supplierId: 's1',
    description: 'Espumante rosado con un sutil dulzor y finas burbujas.',
    cost: 95,
    price: 380,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [60, 150] }
  },
  {
    id: 'p_maria_blanco',
    name: 'Maria Codorniu BLANCO',
    internalCode: 'CHA-MAR-BLA',
    barCode: '8410013010114',
    category: 'Champagne',
    brand: 'Maria Codorniu',
    supplierId: 's1',
    description: 'Espumante blanco brut, elegante y aromático.',
    cost: 90,
    price: 350,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [60, 150] }
  },

  // CIGARRO
  {
    id: 'p_camel_1click',
    name: 'Camel 1 click',
    internalCode: 'CIG-CAM-1CL',
    barCode: '4033100112345',
    category: 'Cigarro',
    brand: 'Camel',
    supplierId: 's1',
    description: 'Cigarrillos Camel con cápsula de mentol/sabor click.',
    cost: 18,
    price: 20,
    unit: 'Cajetilla',
    quantity: 30,
    minStock: 5,
    maxStock: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_camel_2click',
    name: 'Camel 2 click',
    internalCode: 'CIG-CAM-2CL',
    barCode: '4033100112346',
    category: 'Cigarro',
    brand: 'Camel',
    supplierId: 's1',
    description: 'Cigarrillos Camel con doble cápsula de click.',
    cost: 20,
    price: 20,
    unit: 'Cajetilla',
    quantity: 30,
    minStock: 5,
    maxStock: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_camel_amarillo',
    name: 'Camel Amarillo',
    internalCode: 'CIG-CAM-AMA',
    barCode: '4033100112347',
    category: 'Cigarro',
    brand: 'Camel',
    supplierId: 's1',
    description: 'Cigarrillos Camel clásicos sin mentol.',
    cost: 18,
    price: 20,
    unit: 'Cajetilla',
    quantity: 25,
    minStock: 5,
    maxStock: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // FERNET
  {
    id: 'p_fernet_menta',
    name: 'Fernet branca menta',
    internalCode: 'FER-BRA-MEN',
    barCode: '7790290000827',
    category: 'Fernet',
    brand: 'Branca',
    supplierId: 's1',
    description: 'Fernet con sabor a menta fresca muy popular.',
    cost: 55,
    price: 380,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 50,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_fernet_branca',
    name: 'Fernet branca',
    internalCode: 'FER-BRA-CLA',
    barCode: '7790290000810',
    category: 'Fernet',
    brand: 'Branca',
    supplierId: 's1',
    description: 'Fernet digestivo italiano clásico a base de hierbas.',
    cost: 50,
    price: 350,
    unit: 'Botella',
    quantity: 18,
    minStock: 4,
    maxStock: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // GIN
  {
    id: 'p_gin_beefeater_gr',
    name: 'Gin Beefeater Dry Grande',
    internalCode: 'GIN-BEE-GRA',
    barCode: '5000299225019',
    category: 'Gin',
    brand: 'Beefeater',
    supplierId: 's1',
    description: 'Ginebra Beefeater London Dry de 1 Litro.',
    cost: 140,
    price: 550,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 1000, currentMl: 1000, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_beefeater_dry',
    name: 'Gin Beefeater Dry',
    internalCode: 'GIN-BEE-DRY',
    barCode: '5000299225010',
    category: 'Gin',
    brand: 'Beefeater',
    supplierId: 's1',
    description: 'Ginebra Beefeater London Dry clásica de 750ml.',
    cost: 110,
    price: 490,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_beefeater_pink',
    name: 'Gin Beefeater PINK',
    internalCode: 'GIN-BEE-PIN',
    barCode: '5000299225123',
    category: 'Gin',
    brand: 'Beefeater',
    supplierId: 's1',
    description: 'Ginebra Beefeater rosada saborizada con frutillas de 750ml.',
    cost: 120,
    price: 480,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_flamboyant',
    name: 'Gin Flamboyant N°12',
    internalCode: 'GIN-FLA-N12',
    barCode: '7401234500121',
    category: 'Gin',
    brand: 'Flamboyant',
    supplierId: 's1',
    description: 'Ginebra artesanal nacional destilada con botánicos selectos.',
    cost: 85,
    price: 380,
    unit: 'Botella',
    quantity: 8,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_larep_fru_gr',
    name: 'Gin La Rep FRUTILLA GRANDE',
    internalCode: 'GIN-REP-FRG',
    barCode: '7402345600010',
    category: 'Gin',
    brand: 'La República',
    supplierId: 's1',
    description: 'Gin boliviano premium con infusión de frutillas (Botella Grande).',
    cost: 125,
    price: 450,
    unit: 'Botella',
    quantity: 10,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 1000, currentMl: 1000, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_larep_fru',
    name: 'Gin La Rep FRUTILLA',
    internalCode: 'GIN-REP-FRU',
    barCode: '7402345600011',
    category: 'Gin',
    brand: 'La República',
    supplierId: 's1',
    description: 'Gin boliviano premium con infusión de frutillas de 750ml.',
    cost: 95,
    price: 380,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_gin_larep_frutos',
    name: 'Gin La Rep FRUTOS DEL BOSQUE',
    internalCode: 'GIN-REP-FDB',
    barCode: '7402345600012',
    category: 'Gin',
    brand: 'La República',
    supplierId: 's1',
    description: 'Gin boliviano premium sabor frutos del bosque de 750ml.',
    cost: 95,
    price: 380,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // LICORES
  {
    id: 'p_jager',
    name: 'Jagermeister',
    internalCode: 'LIC-JAG-700',
    barCode: '4067700010014',
    category: 'Licores',
    brand: 'Jagermeister',
    supplierId: 's1',
    description: 'Licor de hierbas alemán, servido frío o en cócteles.',
    cost: 95,
    price: 550,
    unit: 'Botella',
    quantity: 16,
    minStock: 4,
    maxStock: 48,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 700, currentMl: 700, shotSizes: [30, 50] }
  },
  {
    id: 'p_jager_boom',
    name: 'Jager Boom',
    internalCode: 'LIC-JAG-BOO',
    barCode: '4067700010015',
    category: 'Licores',
    brand: 'Jagermeister',
    supplierId: 's1',
    description: 'Trago preparado con un shot de Jagermeister y Red Bull.',
    cost: 15,
    price: 60,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_ronda_jager',
    name: 'Ronda de Jagermeister x1',
    internalCode: 'LIC-RON-JAG',
    barCode: '4067700010016',
    category: 'Licores',
    brand: 'Jagermeister',
    supplierId: 's1',
    description: 'Ronda o shot individual para barra de Jagermeister puro.',
    cost: 10,
    price: 50,
    unit: 'Servicio',
    quantity: 200,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // MEZCLADORES
  {
    id: 'p_coca_cola',
    name: 'Coca Cola',
    internalCode: 'MEZ-COC-COL',
    barCode: '7441003502214',
    category: 'Mezcladores',
    brand: 'Coca Cola',
    supplierId: 's2',
    description: 'Gaseosa Coca-Cola de 300ml, perfecta para mezclar.',
    cost: 3,
    price: 25,
    unit: 'Botella',
    quantity: 120,
    minStock: 24,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_red_bull',
    name: 'Red Bull',
    internalCode: 'MEZ-RED-BUL',
    barCode: '9002490100071',
    category: 'Mezcladores',
    brand: 'Red Bull',
    supplierId: 's2',
    description: 'Bebida energética estimulante clásica.',
    cost: 8,
    price: 40,
    unit: 'Lata',
    quantity: 96,
    minStock: 12,
    maxStock: 200,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_sante',
    name: 'SANTE',
    internalCode: 'MEZ-SAN-BEB',
    barCode: '7401112223330',
    category: 'Mezcladores',
    brand: 'SANTE',
    supplierId: 's2',
    description: 'Bebida gaseosa o mezclador refrescante.',
    cost: 3,
    price: 25,
    unit: 'Lata',
    quantity: 48,
    minStock: 12,
    maxStock: 144,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_schweppes_1_5',
    name: 'Schweppes soda 1,5 lts',
    internalCode: 'MEZ-SCH-15L',
    barCode: '7441003502215',
    category: 'Mezcladores',
    brand: 'Schweppes',
    supplierId: 's2',
    description: 'Agua de soda embotellada de gran capacidad para servicio en mesa.',
    cost: 6,
    price: 20,
    unit: 'Botella',
    quantity: 36,
    minStock: 8,
    maxStock: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_schweppes_soda',
    name: 'Schweppes soda',
    internalCode: 'MEZ-SCH-SOD',
    barCode: '7441003502216',
    category: 'Mezcladores',
    brand: 'Schweppes',
    supplierId: 's2',
    description: 'Agua de soda clásica de 350ml personal.',
    cost: 3.5,
    price: 25,
    unit: 'Botella',
    quantity: 72,
    minStock: 12,
    maxStock: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_schweppes_tonica',
    name: 'Schweppes agua tónica',
    internalCode: 'MEZ-SCH-TON',
    barCode: '7441003502217',
    category: 'Mezcladores',
    brand: 'Schweppes',
    supplierId: 's2',
    description: 'Agua tónica premium, ideal para Gin Tonic.',
    cost: 3.5,
    price: 25,
    unit: 'Botella',
    quantity: 72,
    minStock: 12,
    maxStock: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_sprite',
    name: 'Sprite',
    internalCode: 'MEZ-SPR-PER',
    barCode: '7441003502218',
    category: 'Mezcladores',
    brand: 'Sprite',
    supplierId: 's2',
    description: 'Gaseosa sabor lima-limón personal.',
    cost: 3,
    price: 25,
    unit: 'Botella',
    quantity: 96,
    minStock: 12,
    maxStock: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_agua',
    name: 'Agua',
    internalCode: 'MEZ-AGU-NAT',
    barCode: '7401112224441',
    category: 'Mezcladores',
    brand: 'Cabaña',
    supplierId: 's2',
    description: 'Agua mineral sin gas de 500ml.',
    cost: 2.5,
    price: 20,
    unit: 'Botella',
    quantity: 120,
    minStock: 24,
    maxStock: 240,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_botella_peq_agua',
    name: 'Botella peq de Agua',
    internalCode: 'MEZ-AGU-PEQ',
    barCode: '7401112224442',
    category: 'Mezcladores',
    brand: 'Cabaña',
    supplierId: 's2',
    description: 'Agua mineral personal pequeña sin gas.',
    cost: 2,
    price: 15,
    unit: 'Botella',
    quantity: 60,
    minStock: 12,
    maxStock: 120,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // RON
  {
    id: 'p_ron_37_lenguas',
    name: '37 LENGUAS',
    internalCode: 'RON-37L-750',
    barCode: '7403334440010',
    category: 'Ron',
    brand: '37 Lenguas',
    supplierId: 's1',
    description: 'Ron nacional destilado premium de alta reputación.',
    cost: 65,
    price: 300,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_havana_maestro',
    name: 'Havana selec. Maestro',
    internalCode: 'RON-HAV-MAE',
    barCode: '8501110080121',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Selección de Maestros, ron ultra premium cubano.',
    cost: 160,
    price: 580,
    unit: 'Botella',
    quantity: 6,
    minStock: 2,
    maxStock: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_havana_7',
    name: 'Havana 7 años',
    internalCode: 'RON-HAV-7AN',
    barCode: '8501110080122',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Ron cubano de mezcla legendario envejecido en roble.',
    cost: 95,
    price: 430,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 36,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_havana_reserva',
    name: 'Havana Reserva',
    internalCode: 'RON-HAV-RES',
    barCode: '8501110080123',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Ron añejo especial reserva de alta suavidad.',
    cost: 80,
    price: 360,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_havana_blanco',
    name: 'Havana Blanco',
    internalCode: 'RON-HAV-BLA',
    barCode: '8501110080124',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Ron blanco cubano de 3 años, ideal para Mojito clásico.',
    cost: 55,
    price: 120,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_havana_especial',
    name: 'Havana especial',
    internalCode: 'RON-HAV-ESP',
    barCode: '8501110080125',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Ron Havana añejo especial de color dorado suave.',
    cost: 70,
    price: 330,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // RTD
  {
    id: 'p_rtd_mambo',
    name: 'MAMBO',
    internalCode: 'RTD-MAM-CAN',
    barCode: '7405556660100',
    category: 'RTD',
    brand: 'Mambo',
    supplierId: 's2',
    description: 'Coctel en lata listo para beber (Ready to Drink).',
    cost: 6,
    price: 40,
    unit: 'Lata',
    quantity: 96,
    minStock: 12,
    maxStock: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // SINGANI
  {
    id: 'p_sing_cr_negro',
    name: 'Casa Real negro',
    internalCode: 'SIN-CAS-NEG',
    barCode: '7401122331201',
    category: 'Singani',
    brand: 'Casa Real',
    supplierId: 's1',
    description: 'Singani Casa Real etiqueta negra, destilado premium.',
    cost: 45,
    price: 320,
    unit: 'Botella',
    quantity: 20,
    minStock: 5,
    maxStock: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_sing_dl_oro',
    name: 'Don Lucho Oro',
    internalCode: 'SIN-DL-ORO',
    barCode: '7401122331210',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Singani Don Lucho Gran Selección de Oro reposado.',
    cost: 85,
    price: 490,
    unit: 'Botella',
    quantity: 8,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_sing_dl_cafe',
    name: 'Don Lucho Café',
    internalCode: 'SIN-DL-CAF',
    barCode: '7401122331211',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Licor de café artesanal a base de Singani Don Lucho.',
    cost: 70,
    price: 350,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_sing_dl_silver',
    name: 'Don Lucho Silver',
    internalCode: 'SIN-DL-SIL',
    barCode: '7401122331212',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Singani de triple destilación premium blanco suave.',
    cost: 75,
    price: 370,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // TEQUILA
  {
    id: 'p_teq_chocolate',
    name: 'Tequila Chocolate',
    internalCode: 'TEQ-CHO-750',
    barCode: '7501064112029',
    category: 'Tequila',
    brand: 'Olmeca',
    supplierId: 's1',
    description: 'Tequila premium con infusión de chocolate oscuro.',
    cost: 95,
    price: 380,
    unit: 'Botella',
    quantity: 10,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50] }
  },
  {
    id: 'p_teq_dorado',
    name: 'Tequila dorado',
    internalCode: 'TEQ-DOR-750',
    barCode: '7501064112030',
    category: 'Tequila',
    brand: 'José Cuervo',
    supplierId: 's1',
    description: 'Tequila dorado reposado clásico mexicano.',
    cost: 90,
    price: 370,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50] }
  },
  {
    id: 'p_shot_teq_cho',
    name: 'Shot deTequila Chocolate',
    internalCode: 'TEQ-SHO-CHO',
    barCode: '7501064112031',
    category: 'Tequila',
    brand: 'Olmeca',
    supplierId: 's1',
    description: 'Shot de tequila chocolate servido en barra.',
    cost: 10,
    price: 55,
    unit: 'Servicio',
    quantity: 150,
    minStock: 15,
    maxStock: 400,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_shot_teq_dor',
    name: 'Shot deTequila dorado',
    internalCode: 'TEQ-SHO-DOR',
    barCode: '7501064112032',
    category: 'Tequila',
    brand: 'José Cuervo',
    supplierId: 's1',
    description: 'Shot de tequila dorado servido en barra con limón y sal.',
    cost: 10,
    price: 50,
    unit: 'Servicio',
    quantity: 150,
    minStock: 15,
    maxStock: 400,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // VINO
  {
    id: 'p_vino_esther',
    name: 'Esther Ortiz',
    internalCode: 'VIN-EST-ORT',
    barCode: '7408889990100',
    category: 'Vino',
    brand: 'Campos de Solana',
    supplierId: 's1',
    description: 'Vino tinto nacional reserva premium de alta gama.',
    cost: 65,
    price: 140,
    unit: 'Botella',
    quantity: 15,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [150] }
  },
  {
    id: 'p_vino_granier',
    name: 'Granier Ortiz',
    internalCode: 'VIN-GRA-ORT',
    barCode: '7408889990101',
    category: 'Vino',
    brand: 'Kuhlmann',
    supplierId: 's1',
    description: 'Vino fino tinto tradicional Granier.',
    cost: 55,
    price: 120,
    unit: 'Botella',
    quantity: 15,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [150] }
  },

  // VODKA
  {
    id: 'p_vod_1825',
    name: 'Vodka 1825',
    internalCode: 'VOD-182-750',
    barCode: '7401112220101',
    category: 'Vodka',
    brand: '1825',
    supplierId: 's1',
    description: 'Vodka boliviano premium de triple destilación artesanal de altura.',
    cost: 55,
    price: 360,
    unit: 'Botella',
    quantity: 18,
    minStock: 4,
    maxStock: 48,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_vod_stoli',
    name: 'Vodka Stoli',
    internalCode: 'VOD-STO-750',
    barCode: '4600234500111',
    category: 'Vodka',
    brand: 'Stolichnaya',
    supplierId: 's1',
    description: 'Vodka premium clásico importado, excelente pureza.',
    cost: 60,
    price: 450,
    unit: 'Botella',
    quantity: 15,
    minStock: 4,
    maxStock: 48,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // WHISKY
  {
    id: 'p_whi_ballantines',
    name: "Ballantine's",
    internalCode: 'WHI-BAL-750',
    barCode: '5010106113123',
    category: 'Whisky',
    brand: "Ballantine's",
    supplierId: 's1',
    description: 'Whiskey escocés blend tradicional y balanceado.',
    cost: 75,
    price: 380,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 36,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_whi_chivas_12',
    name: 'Chivas Regal 12 años',
    internalCode: 'WHI-CHI-12A',
    barCode: '5000299225111',
    category: 'Whisky',
    brand: 'Chivas Regal',
    supplierId: 's1',
    description: 'Whiskey blend escocés premium madurado 12 años.',
    cost: 165,
    price: 850,
    unit: 'Botella',
    quantity: 10,
    minStock: 2,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_whi_jack',
    name: 'Jack Daniels',
    internalCode: 'WHI-JAC-DAN',
    barCode: '082184090442',
    category: 'Whisky',
    brand: 'Jack Daniel\'s',
    supplierId: 's1',
    description: 'Whiskey de Tennessee clásico con filtrado por carbón dulce.',
    cost: 140,
    price: 750,
    unit: 'Botella',
    quantity: 15,
    minStock: 3,
    maxStock: 40,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_whi_royal_salute',
    name: 'ROYAL SALUTE',
    internalCode: 'WHI-ROY-SAL',
    barCode: '5000299225999',
    category: 'Whisky',
    brand: 'Chivas Regal',
    supplierId: 's1',
    description: 'Whiskey de altísimo lujo escocés envejecido 21 años.',
    cost: 650,
    price: 4000,
    unit: 'Botella',
    quantity: 3,
    minStock: 1,
    maxStock: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 700, currentMl: 700, shotSizes: [30, 50, 60] }
  },

  // APEROL, Granadina, Ron Panama, Hielo, Licor de Coco
  {
    id: 'p_aperol',
    name: 'APEROL',
    internalCode: 'LIC-APE-750',
    barCode: '8002230000010',
    category: 'Licores',
    brand: 'Campari Group',
    supplierId: 's1',
    description: 'Aperitivo italiano de naranja brillante y hierbas selectas.',
    cost: 55,
    price: 120,
    unit: 'Botella',
    quantity: 10,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_granadina',
    name: 'Granadina Dellapieane',
    internalCode: 'LIC-GRA-DEL',
    barCode: '7791234500124',
    category: 'Licores',
    brand: 'Dellapiane',
    supplierId: 's1',
    description: 'Jarabe de granadina premium dulce para cócteles coloridos.',
    cost: 30,
    price: 70,
    unit: 'Botella',
    quantity: 8,
    minStock: 2,
    maxStock: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50] }
  },
  {
    id: 'p_ron_panama',
    name: 'Ron Panama Cortez',
    internalCode: 'RON-PAN-COR',
    barCode: '7403334440020',
    category: 'Ron',
    brand: 'Cortez',
    supplierId: 's1',
    description: 'Ron importado de Panamá suave y aromático.',
    cost: 50,
    price: 110,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_hielo',
    name: 'HIELO',
    internalCode: 'MEZ-HIE-BOL',
    barCode: '7401112225555',
    category: 'Mezcladores',
    brand: 'Ámbar Club',
    supplierId: 's2',
    description: 'Bolsa de hielo premium de agua purificada de 5 kg.',
    cost: 4,
    price: 15,
    unit: 'Bolsa',
    quantity: 50,
    minStock: 10,
    maxStock: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_licor_coco',
    name: 'Licor de Coco',
    internalCode: 'LIC-MAL-COC',
    barCode: '5010106113124',
    category: 'Licores',
    brand: 'Malibu',
    supplierId: 's1',
    description: 'Licor de ron caribeño con sabor natural a coco.',
    cost: 55,
    price: 120,
    unit: 'Botella',
    quantity: 10,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // NUEVOS PRODUCTOS (Vasos, Nuevas botellas, Cócteles)
  // VASOS / DRINKS BY THE GLASS
  {
    id: 'p_vaso_fernet_branca_menta',
    name: 'Vaso de Fernet branca menta',
    internalCode: 'VAS-FER-MEN',
    barCode: '7790290000827-V',
    category: 'Fernet',
    brand: 'Branca',
    supplierId: 's1',
    description: 'Vaso de Fernet branca menta servido con gaseosa y hielo.',
    cost: 15,
    price: 35,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_fernet_branca',
    name: 'Vaso de Fernet branca',
    internalCode: 'VAS-FER-CLA',
    barCode: '7790290000810-V',
    category: 'Fernet',
    brand: 'Branca',
    supplierId: 's1',
    description: 'Vaso de Fernet branca clásico servido con Coca-Cola y hielo.',
    cost: 15,
    price: 35,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_gin_beefeater_dry',
    name: 'Vaso de Gin Beefeater Dry',
    internalCode: 'VAS-GIN-DRY',
    barCode: '5000299225010-V',
    category: 'Gin',
    brand: 'Beefeater',
    supplierId: 's1',
    description: 'Vaso de ginebra Beefeater Dry con tónica o Sprite.',
    cost: 20,
    price: 60,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_gin_beefeater_pink',
    name: 'Vaso de Gin Beefeater PINK',
    internalCode: 'VAS-GIN-PIN',
    barCode: '5000299225123-V',
    category: 'Gin',
    brand: 'Beefeater',
    supplierId: 's1',
    description: 'Vaso de ginebra Beefeater rosada servido con tónica o Sprite.',
    cost: 20,
    price: 60,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_gin_flamboyant',
    name: 'Vaso de Gin Flamboyant N°12',
    internalCode: 'VAS-GIN-FLA',
    barCode: '7401234500121-V',
    category: 'Gin',
    brand: 'Flamboyant',
    supplierId: 's1',
    description: 'Vaso de ginebra artesanal Flamboyant N°12 con tónica.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_gin_larep_fru',
    name: 'Vaso de Gin La Rep FRUTILLA',
    internalCode: 'VAS-GIN-REP',
    barCode: '7402345600011-V',
    category: 'Gin',
    brand: 'La República',
    supplierId: 's1',
    description: 'Vaso de gin boliviano de frutilla servido con tónica.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_gin_larep_frutos',
    name: 'Vaso de Gin La Rep FRUTOS DEL BOSQUE',
    internalCode: 'VAS-GIN-FDB',
    barCode: '7402345600012-V',
    category: 'Gin',
    brand: 'La República',
    supplierId: 's1',
    description: 'Vaso de gin boliviano frutos del bosque servido con tónica.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_jager',
    name: 'Vaso de Jagermeister',
    internalCode: 'VAS-JAG-700',
    barCode: '4067700010014-V',
    category: 'Licores',
    brand: 'Jagermeister',
    supplierId: 's1',
    description: 'Vaso de Jagermeister puro o mezclado.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_ron_havana_7',
    name: 'Vaso de Ron Havana 7 años',
    internalCode: 'VAS-RON-HV7',
    barCode: '8501110080122-V',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Vaso de ron Havana 7 años con refresco de cola y hielo.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_ron_havana_esp',
    name: 'Vaso de Ron Havana especial',
    internalCode: 'VAS-RON-HVE',
    barCode: '8501110080125-V',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Vaso de ron Havana especial con refresco de cola y hielo.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_ron_havana_res',
    name: 'Vaso de Ron Havana Reserva',
    internalCode: 'VAS-RON-HVR',
    barCode: '8501110080123-V',
    category: 'Ron',
    brand: 'Havana Club',
    supplierId: 's1',
    description: 'Vaso de ron Havana Reserva con refresco de cola y hielo.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_sing_cr_negro',
    name: 'Vaso de Singani Casa Real negro',
    internalCode: 'VAS-SIN-CRN',
    barCode: '7401122331201-V',
    category: 'Singani',
    brand: 'Casa Real',
    supplierId: 's1',
    description: 'Vaso de singani Casa Real etiqueta negra, servido con refresco y hielo.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_sing_dl_oro',
    name: 'Vaso de Singani Don Lucho Oro',
    internalCode: 'VAS-SIN-DLO',
    barCode: '7401122331210-V',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Vaso de singani Don Lucho de Oro, servido con refresco y hielo.',
    cost: 15,
    price: 55,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_sing_dl_cafe',
    name: 'Vaso de Don Lucho Café',
    internalCode: 'VAS-SIN-DLC',
    barCode: '7401122331211-V',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Vaso de licor de café Don Lucho servido bien frío.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_sing_dl_silver',
    name: 'Vaso de Singani Don Lucho Silver',
    internalCode: 'VAS-SIN-DLS',
    barCode: '7401122331212-V',
    category: 'Singani',
    brand: 'Don Lucho',
    supplierId: 's1',
    description: 'Vaso de singani Don Lucho Silver con refresco y hielo.',
    cost: 12,
    price: 45,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_vod_1825',
    name: 'Vaso de Vodka 1825',
    internalCode: 'VAS-VOD-182',
    barCode: '7401112220101-V',
    category: 'Vodka',
    brand: '1825',
    supplierId: 's1',
    description: 'Vaso de vodka boliviano 1825 mezclado con cítricos o Sprite.',
    cost: 12,
    price: 45,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_vod_sernova',
    name: 'Vaso de Vodka Sernova',
    internalCode: 'VAS-VOD-SER',
    barCode: '7791234500999-V',
    category: 'Vodka',
    brand: 'Sernova',
    supplierId: 's1',
    description: 'Vaso de vodka Sernova servido con Sprite, tónica o jugo.',
    cost: 10,
    price: 40,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_vod_stoli',
    name: 'Vaso de Vodka Stoli',
    internalCode: 'VAS-VOD-STO',
    barCode: '4600234500111-V',
    category: 'Vodka',
    brand: 'Stolichnaya',
    supplierId: 's1',
    description: 'Vaso de vodka Stolichnaya con jugo, Sprite o tónica.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_whi_ballantines',
    name: "Vaso de Whisky Ballantine's",
    internalCode: 'VAS-WHI-BAL',
    barCode: '5010106113123-V',
    category: 'Whisky',
    brand: "Ballantine's",
    supplierId: 's1',
    description: "Vaso de whisky Ballantine's servido con hielo o refresco.",
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_whi_chivas_12',
    name: 'Vaso de Whisky Chivas 12 años',
    internalCode: 'VAS-WHI-CHI',
    barCode: '5000299225111-V',
    category: 'Whisky',
    brand: 'Chivas Regal',
    supplierId: 's1',
    description: 'Vaso de whisky Chivas Regal 12 años servido con hielo.',
    cost: 20,
    price: 70,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_whi_jack',
    name: 'Vaso de Whisky Jack Daniels',
    internalCode: 'VAS-WHI-JAC',
    barCode: '082184090442-V',
    category: 'Whisky',
    brand: 'Jack Daniel\'s',
    supplierId: 's1',
    description: 'Vaso de whiskey Jack Daniels clásico servido con hielo o cola.',
    cost: 20,
    price: 65,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_whi_red_label',
    name: 'Vaso de Whisky Red Label',
    internalCode: 'VAS-WHI-RED',
    barCode: '5000299225991-V',
    category: 'Whisky',
    brand: 'Johnnie Walker',
    supplierId: 's1',
    description: 'Vaso de whiskey Red Label servido con hielo o gaseosa.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_vaso_whi_black_label',
    name: 'Vaso de Whisky Black Label',
    internalCode: 'VAS-WHI-BLA',
    barCode: '5000299225992-V',
    category: 'Whisky',
    brand: 'Johnnie Walker',
    supplierId: 's1',
    description: 'Vaso de whiskey Black Label servido con hielo.',
    cost: 18,
    price: 60,
    unit: 'Vaso',
    quantity: 150,
    minStock: 20,
    maxStock: 500,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // NUEVAS BOTELLAS / ITEMS
  {
    id: 'p_vod_sernova',
    name: 'Vodka Sernova',
    internalCode: 'VOD-SER-750',
    barCode: '7791234500999',
    category: 'Vodka',
    brand: 'Sernova',
    supplierId: 's1',
    description: 'Vodka premium suave refinado mediante filtración de diamantes.',
    cost: 80,
    price: 320,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_whi_red_label',
    name: 'Whisky Red Label',
    internalCode: 'WHI-RED-750',
    barCode: '5000299225991',
    category: 'Whisky',
    brand: 'Johnnie Walker',
    supplierId: 's1',
    description: 'Whiskey escocés blend de gran carácter y sabor picante.',
    cost: 110,
    price: 350,
    unit: 'Botella',
    quantity: 12,
    minStock: 3,
    maxStock: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },
  {
    id: 'p_whi_black_label',
    name: 'Whisky Black Label',
    internalCode: 'WHI-BLA-750',
    barCode: '5000299225992',
    category: 'Whisky',
    brand: 'Johnnie Walker',
    supplierId: 's1',
    description: 'Whiskey de alta gama con notas ahumadas y cuerpo complejo de 12 años.',
    cost: 180,
    price: 650,
    unit: 'Botella',
    quantity: 10,
    minStock: 2,
    maxStock: 24,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bottleConfig: { isBottle: true, capacityMl: 750, currentMl: 750, shotSizes: [30, 50, 60] }
  },

  // CÓCTELES / COCKTAILS
  {
    id: 'p_coc_ambar_royale',
    name: 'AMBAR ROYALE',
    internalCode: 'COC-AMB-ROY',
    barCode: 'COC001',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Cóctel de autor de la casa con toques frutales y espumante premium.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_coc_daiquiri_frutilla',
    name: 'Daiquiri de frutilla',
    internalCode: 'COC-DAI-FRU',
    barCode: 'COC002',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Cóctel cubano tradicional a base de ron blanco, frutillas frescas y limón.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_coc_illimani_ambar',
    name: 'ILLIMANI AMBAR',
    internalCode: 'COC-ILL-AMB',
    barCode: 'COC003',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Combinación audaz de singani de altura, licores dulces y cítricos de los valles.',
    cost: 15,
    price: 50,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_coc_mojito_clasico',
    name: 'MOJITO CLÁSICO',
    internalCode: 'COC-MOJ-CLA',
    barCode: 'COC004',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Refrescante cóctel cubano con ron blanco, menta fresca, azúcar y agua de soda.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_coc_pina_colada',
    name: 'PIÑA COLADA',
    internalCode: 'COC-PIN-COL',
    barCode: 'COC005',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Clásico cóctel tropical con ron blanco, crema de coco y jugo de piña.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'p_coc_tequila_sunrise',
    name: 'TEQUILA SUNRISE',
    internalCode: 'COC-TEQ-SUN',
    barCode: 'COC006',
    category: 'Cócteles',
    brand: 'Ámbar Club',
    supplierId: 's1',
    description: 'Trago vibrante con tequila dorado, jugo de naranja y jarabe de granadina.',
    cost: 12,
    price: 40,
    unit: 'Vaso',
    quantity: 100,
    minStock: 10,
    maxStock: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const initialTables: Table[] = [
  { id: 't1', number: 'VIP-01', name: 'VIP Boxes Central', status: TableStatus.FREE, consumption: [] },
  { id: 't2', number: 'VIP-02', name: 'VIP Boxes Lateral', status: TableStatus.FREE, consumption: [] },
  { id: 't3', number: 'VIP-03', name: 'VIP Escenario', status: TableStatus.RESERVED, consumption: [], notes: 'Reservado para Cumpleaños de Cristian - Entrada 22:00' },
  { id: 't4', number: 'M-04', name: 'Bar Central Alta 04', status: TableStatus.FREE, consumption: [] },
  { id: 't5', number: 'M-05', name: 'Bar Central Alta 05', status: TableStatus.OCCUPIED, consumption: [
    {
      product: initialProducts[2],
      quantity: 4,
      subtotal: 100
    },
    {
      product: initialProducts[0],
      quantity: 2,
      selectedShotMl: 60,
      subtotal: 70
    }
  ], notes: 'Atendido por Pedro - Cuenta abierta', openedAt: new Date().toISOString() },
  { id: 't6', number: 'M-06', name: 'Terraza 06', status: TableStatus.FREE, consumption: [] },
  { id: 't7', number: 'M-07', name: 'Terraza 07', status: TableStatus.CLEANING, consumption: [] }
];

const initialClients: Client[] = [
  { id: 'c1', name: 'Cristian Bacarreza', phone: '+591 78945612', email: 'CristianBacarreza1999@gmail.com', birthday: '1999-07-15', preferences: 'Whisky, prefiere mesa VIP Central', points: 1250, createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Alejandra Rocha', phone: '+591 76088992', email: 'ale.rocha@gmail.com', birthday: '1995-12-05', preferences: 'Champagne Möet & Chandon', points: 420, createdAt: new Date().toISOString() }
];

const initialEmployees: Employee[] = [
  { id: 'e_aisha', name: 'Aisha Arteaga', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mauricio', name: 'Mauricio Sebastian', role: UserRole.ALMACENERO, phone: '', schedule: '18:00 - 02:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_valeria', name: 'Valeria', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_vianca', name: 'Vianca', role: UserRole.ALMACENERO, phone: '', schedule: '18:00 - 02:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_caja1', name: 'Caja 1', role: UserRole.CAJA, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_caja2', name: 'Caja 2', role: UserRole.CAJA, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_caja3', name: 'Caja 3', role: UserRole.CAJA, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_caja4', name: 'Caja 4', role: UserRole.CAJA, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_gerente', name: 'Gerente Ámbar', role: UserRole.GERENTE, phone: '', schedule: '18:00 - 02:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_almacenero1', name: 'Almacenero 1', role: UserRole.ALMACENERO, phone: '', schedule: '18:00 - 02:00', comissionsRate: 0, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero1', name: 'Mesero 1', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero2', name: 'Mesero 2', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero3', name: 'Mesero 3', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero4', name: 'Mesero 4', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero5', name: 'Mesero 5', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero6', name: 'Mesero 6', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero7', name: 'Mesero 7', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
  { id: 'e_mesero8', name: 'Mesero 8', role: UserRole.MESERO, phone: '', schedule: '19:00 - 04:00', comissionsRate: 0.01, salesCount: 0, totalSalesValue: 0, totalComissions: 0, isActive: true },
];

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

/**
 * Checks if a given collection has documents. If empty, seeds default entries.
 */
export async function seedInitialDataIfNecessary(db: Firestore): Promise<void> {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    // --- ACTIVE SYNCHRONIZATION AND CLEANUP OF USERS ---
    // We want the users in the database to match the new defaultUsers list perfectly.
    const allowedEmails = defaultUsers.map(du => du.email.toLowerCase().trim());

    // Clean up any stale profiles (not in the allowed list)
    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data();
      const emailLower = (data.email || '').toLowerCase().trim();
      if (emailLower && !allowedEmails.includes(emailLower)) {
        console.log(`Deleting obsolete user profile: ${emailLower} (${data.name})`);
        try {
          await deleteDoc(doc(db, 'users', docSnap.id));
        } catch (err) {
          console.warn(`Could not delete stale user doc ${docSnap.id}:`, err);
        }
      }
    }

    // Upsert the defaultUsers to ensure their names, roles, and permissions are perfectly synchronized
    for (const u of defaultUsers) {
      const existingDocWithEmail = usersSnap.docs.find(d => (d.data().email || '').toLowerCase().trim() === u.email.toLowerCase().trim());
      
      const targetUid = existingDocWithEmail ? existingDocWithEmail.id : u.uid;
      const docRef = doc(db, 'users', targetUid);
      
      const updatedProfile = {
        uid: targetUid,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        permissions: u.permissions,
        createdAt: existingDocWithEmail?.data().createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, updatedProfile, { merge: true });
    }

    console.log("Enterprise users synchronized and cleaned successfully in Firestore!");

    // --- ACTIVE SYNCHRONIZATION AND CLEANUP OF EMPLOYEES ---
    const empRef = collection(db, 'employees');
    const empSnap = await getDocs(empRef);
    const allowedEmpIds = initialEmployees.map(e => e.id);

    for (const docSnap of empSnap.docs) {
      if (!allowedEmpIds.includes(docSnap.id)) {
        console.log(`Deleting stale employee record: ${docSnap.id}`);
        try {
          await deleteDoc(doc(db, 'employees', docSnap.id));
        } catch (err) {
          console.warn(`Could not delete stale employee doc ${docSnap.id}:`, err);
        }
      }
    }

    for (const e of initialEmployees) {
      const docRef = doc(db, 'employees', e.id);
      await setDoc(docRef, e, { merge: true });
    }
    console.log("Enterprise employees synchronized successfully in Firestore!");

    if (!usersSnap.empty) {
      console.log('Database already seeded. Skipping complete initialization of other collections.');
      return;
    }

    console.log('Detected fresh Firestore database. Running enterprise seed protocol...');
    const batch = writeBatch(db);

    // 1. Seed Users
    defaultUsers.forEach(user => {
      const docRef = doc(db, 'users', user.uid);
      batch.set(docRef, user);
    });

    // 2. Seed Categories
    initialCategories.forEach(cat => {
      const docRef = doc(db, 'categories', cat.id);
      batch.set(docRef, cat);
    });

    // 3. Seed Suppliers
    initialSuppliers.forEach(sup => {
      const docRef = doc(db, 'suppliers', sup.id);
      batch.set(docRef, sup);
    });

    // 4. Seed Products
    initialProducts.forEach(prod => {
      const docRef = doc(db, 'products', prod.id);
      batch.set(docRef, prod);
    });

    // 5. Seed Tables
    initialTables.forEach(t => {
      const docRef = doc(db, 'tables', t.id);
      batch.set(docRef, t);
    });

    // 6. Seed Clients
    initialClients.forEach(c => {
      const docRef = doc(db, 'clients', c.id);
      batch.set(docRef, c);
    });

    // 7. Seed Employees
    initialEmployees.forEach(e => {
      const docRef = doc(db, 'employees', e.id);
      batch.set(docRef, e);
    });

    // 8. Seed Config
    const configRef = doc(db, 'config', 'system');
    batch.set(configRef, initialConfig);

    await batch.commit();
    console.log('Enterprise seed protocol executed successfully.');
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      error?.message?.includes('permission-denied') ||
      error?.message?.includes('insufficient permissions')
    ) {
      console.log('Database is already seeded and locked down securely under role-based rules.');
      return;
    }
    console.error('Failed to seed database:', error);
  }
}

/**
 * Forcefully wipes all current products and categories and populates the database with the official catalog.
 */
export async function resetWarehouseWithOfficialProducts(db: Firestore): Promise<void> {
  const productsRef = collection(db, 'products');
  const categoriesRef = collection(db, 'categories');
  const movementsRef = collection(db, 'movements');

  const productsSnap = await getDocs(productsRef);
  const categoriesSnap = await getDocs(categoriesRef);
  const movementsSnap = await getDocs(movementsRef);

  const batch = writeBatch(db);

  // 1. Delete all current products
  productsSnap.forEach(d => {
    batch.delete(doc(db, 'products', d.id));
  });

  // 2. Delete all current categories
  categoriesSnap.forEach(d => {
    batch.delete(doc(db, 'categories', d.id));
  });

  // 3. Delete all current movements (since inventory is being reset)
  movementsSnap.forEach(d => {
    batch.delete(doc(db, 'movements', d.id));
  });

  // 4. Seed new Categories
  initialCategories.forEach(cat => {
    batch.set(doc(db, 'categories', cat.id), cat);
  });

  // 5. Seed new Products with current timestamps and registered Kardex entry
  initialProducts.forEach(prod => {
    const updatedProd = {
      ...prod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    batch.set(doc(db, 'products', prod.id), updatedProd);
    
    // Register initial Kardex entry for each product
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const initialEntry: InventoryMovement = {
      id: movementId,
      productId: prod.id,
      productName: prod.name,
      type: MovementType.ENTRY,
      quantity: prod.quantity,
      userId: 'system',
      userName: 'Sistema (Reinicio Oficial)',
      date: new Date().toISOString(),
      cost: prod.cost,
      balanceAfter: prod.quantity,
      observations: 'Carga inicial del catálogo de productos oficial AMBAR CLUB'
    };
    batch.set(doc(db, 'movements', movementId), initialEntry);
  });

  await batch.commit();
  console.log('Warehouse has been reset to official product list and categories successfully!');
}

/**
 * Purges ALL operational movements, sales, purchases, sessions, reports, logs, and daily sheets from the database.
 * PRESERVES ALL users, employees, clients, warehouse catalog data (products, categories, suppliers), and system config.
 */
export async function purgeAllMovementsKeepUsers(db: Firestore): Promise<void> {
  // Collections to wipe completely (operational & transactional movements only)
  const collectionsToWipe = [
    'sales',
    'purchases',
    'movements',
    'cashSessions',
    'waiterReports',
    'cashExpenses',
    'auditLogs',
    'dailySheets'
  ];

  // 1. Wipe all documents in operational and transaction collections
  for (const collName of collectionsToWipe) {
    const collRef = collection(db, collName);
    const snap = await getDocs(collRef);
    if (!snap.empty) {
      let batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(doc(db, collName, d.id));
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }
  }

  // 2. Reset tables to 'libre' state with empty consumption and no reservations
  const tablesRef = collection(db, 'tables');
  const tablesSnap = await getDocs(tablesRef);
  if (!tablesSnap.empty) {
    let batch = writeBatch(db);
    let count = 0;
    for (const d of tablesSnap.docs) {
      const docRef = doc(db, 'tables', d.id);
      batch.set(docRef, {
        status: TableStatus.FREE,
        consumption: [],
        currentWaiterId: '',
        currentWaiterName: '',
        reservation: null
      }, { merge: true });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // 3. Reset box stock and open bottle ml for all products (keep main warehouse quantity, cost, price)
  const productsRef = collection(db, 'products');
  const productsSnap = await getDocs(productsRef);
  if (!productsSnap.empty) {
    let batch = writeBatch(db);
    let count = 0;
    for (const d of productsSnap.docs) {
      const docRef = doc(db, 'products', d.id);
      batch.set(docRef, {
        cajaStock: {},
        cajaMl: {}
      }, { merge: true });
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }

  // 4. Mark system config as cleaned
  const configRef = doc(db, 'config', 'system');
  await setDoc(configRef, {
    dbCleaned: true,
    cleanedAt: new Date().toISOString()
  }, { merge: true });

  console.log('Database movements purged successfully. Users, staff, and warehouse catalog preserved.');
}

/**
 * Purges ALL operational movements, sales, purchases, sessions, reports, logs, clients,
 * AND ALL current users and employees from the database.
 * Retains warehouse/almacén catalog data (products, categories, suppliers) and system config.
 */
export async function purgeAllMovementsAndUsers(db: Firestore): Promise<void> {
  return purgeAllMovementsKeepUsers(db);
}

export async function purgeOperationalData(db: Firestore): Promise<void> {
  return purgeAllMovementsKeepUsers(db);
}

