/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { Product, Supplier, PaymentMethod, Purchase, isPhysicalProduct } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Building2, 
  Hash, 
  DollarSign, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  PackagePlus, 
  History, 
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Truck,
  ArrowRightLeft,
  Layers,
  Store,
  Coins,
  Send,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  FileText,
  PackageCheck
} from 'lucide-react';
import ReturnToWarehouseModal from '../components/ReturnToWarehouseModal';
import WarehouseShiftReportModal from '../components/WarehouseShiftReportModal';

interface RestockItem {
  product: Product;
  quantity: number;
  cost: number;
}

interface DispatchItem {
  product: Product;
  quantity: number;
}

export default function WarehouseRestock() {
  const { products, suppliers, saveSupplier, registerPurchase, purchases, resetWarehouse, zeroOutProductStocks, transferStockToCaja } = useApp();

  // Navigation state
  const [activeTab, setActiveTab] = useState<'compras' | 'distribucion' | 'historial'>('compras');

  // Zero stock confirmation state
  const [showZeroConfirm, setShowZeroConfirm] = useState(false);
  const [isZeroing, setIsZeroing] = useState(false);

  // Search and filter states for catalog
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Active restock receipt state
  const [receiptItems, setReceiptItems] = useState<RestockItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  // States for distribution/filling cajas
  const [selectedCaja, setSelectedCaja] = useState<string>('Caja 1');
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [distSearchQuery, setDistSearchQuery] = useState('');
  const debouncedDistSearchQuery = useDebounce(distSearchQuery, 300);
  const [distSelectedCategory, setDistSelectedCategory] = useState('all');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  
  // Dynamic supplier addition (if needed)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupCompany, setNewSupCompany] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');

  // Status and visibility
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Only physical warehouse items
  const physicalProducts = useMemo(() => products.filter(p => isPhysicalProduct(p)), [products]);

  // Categories present in physical catalog for filters
  const categoriesList = useMemo(() => Array.from(new Set(physicalProducts.map(p => p.category))), [physicalProducts]);

  // Filter products for restock
  const filteredProducts = useMemo(() => {
    const term = debouncedSearchQuery.toLowerCase().trim();
    return physicalProducts.filter(p => {
      if (!p.isActive) return false;
      const matchesSearch = !term || 
                            (p.name || '').toLowerCase().includes(term) || 
                            (p.internalCode || '').toLowerCase().includes(term) ||
                            (p.barCode || '').includes(term);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [physicalProducts, debouncedSearchQuery, selectedCategory]);

  // Filter products for distribution
  const distFilteredProducts = useMemo(() => {
    const term = debouncedDistSearchQuery.toLowerCase().trim();
    return physicalProducts.filter(p => {
      if (!p.isActive) return false;
      const matchesSearch = !term ||
                            (p.name || '').toLowerCase().includes(term) || 
                            (p.internalCode || '').toLowerCase().includes(term);
      const matchesCategory = distSelectedCategory === 'all' || p.category === distSelectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [physicalProducts, debouncedDistSearchQuery, distSelectedCategory]);

  // Handle adding product to active receipt
  const handleAddProduct = (product: Product) => {
    const existing = receiptItems.find(item => item.product.id === product.id);
    if (existing) {
      setReceiptItems(receiptItems.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setReceiptItems([...receiptItems, { product, quantity: 1, cost: product.cost }]);
    }
    setSuccessMessage(null);
  };

  // Adjust item quantity in receipt
  const handleUpdateQty = (productId: string, val: number) => {
    if (val <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setReceiptItems(receiptItems.map(item => 
      item.product.id === productId ? { ...item, quantity: val } : item
    ));
  };

  // Adjust item cost in receipt
  const handleUpdateCost = (productId: string, val: number) => {
    setReceiptItems(receiptItems.map(item => 
      item.product.id === productId ? { ...item, cost: Math.max(0, val) } : item
    ));
  };

  // Remove item from receipt
  const handleRemoveItem = (productId: string) => {
    setReceiptItems(receiptItems.filter(item => item.product.id !== productId));
  };

  // Quick helper to fill a random Invoice Number
  const handleGenerateInvoiceNum = () => {
    const num = `FAC-${Math.floor(100000 + Math.random() * 900000)}`;
    setInvoiceNumber(num);
  };

  // Create supplier on the fly
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupCompany.trim()) return;

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupContact || 'Contacto General',
      company: newSupCompany,
      nit: `${Math.floor(1000000 + Math.random() * 9000000)}`,
      address: 'Dirección Comercial Registrada',
      city: 'Santa Cruz',
      phone: newSupPhone || '70000000',
      email: `${newSupCompany.toLowerCase().replace(/\s+/g, '')}@proveedor.com`,
      contact: newSupContact || 'Encargado de Ventas',
      pendingBalance: 0
    };

    saveSupplier(newSup);
    setSelectedSupplierId(newSup.id);
    setNewSupCompany('');
    setNewSupContact('');
    setNewSupPhone('');
    setShowAddSupplierModal(false);
  };

  // Submit complete restock receipt
  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (receiptItems.length === 0) {
      setErrorMessage('Agregue al menos un producto para registrar el ingreso.');
      return;
    }

    if (!selectedSupplierId) {
      setErrorMessage('Debe seleccionar o registrar un proveedor.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setErrorMessage('Por favor ingrese el número de factura o recibo.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      setErrorMessage('El proveedor seleccionado no es válido.');
      return;
    }

    const subtotal = receiptItems.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
    const tax = subtotal * 0.13; // default tax
    const total = subtotal; // matching total with subtotals

    const pItems = receiptItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      cost: item.cost,
      subtotal: item.quantity * item.cost
    }));

    const purchaseData = {
      invoiceNumber: invoiceNumber.trim(),
      supplierId: selectedSupplierId,
      supplierName: supplier.company,
      items: pItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      date: new Date().toISOString()
    };

    try {
      registerPurchase(purchaseData);
      setSuccessMessage(`¡Ingreso registrado con éxito! Se cargaron ${receiptItems.length} productos al almacén central.`);
      setReceiptItems([]);
      setInvoiceNumber('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Error al procesar el ingreso: ${err.message}`);
    }
  };

  // Handle adding product to active dispatch list
  const handleAddToDispatch = (product: Product) => {
    const existing = dispatchItems.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        setErrorMessage(`No se puede añadir más de este producto. El stock disponible en almacén central es de ${product.quantity} unidades.`);
        return;
      }
      setDispatchItems(dispatchItems.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      if (product.quantity <= 0) {
        setErrorMessage(`No hay stock disponible de ${product.name} en almacén central.`);
        return;
      }
      setDispatchItems([...dispatchItems, { product, quantity: 1 }]);
    }
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // Adjust item quantity in active dispatch list
  const handleUpdateDispatchQty = (productId: string, val: number, maxQty: number) => {
    if (val <= 0) {
      handleRemoveFromDispatch(productId);
      return;
    }
    if (val > maxQty) {
      setErrorMessage(`No se puede enviar más del stock disponible en el almacén central (${maxQty} unidades).`);
      return;
    }
    setDispatchItems(dispatchItems.map(item => 
      item.product.id === productId ? { ...item, quantity: val } : item
    ));
    setErrorMessage(null);
  };

  // Remove item from active dispatch list
  const handleRemoveFromDispatch = (productId: string) => {
    setDispatchItems(dispatchItems.filter(item => item.product.id !== productId));
  };

  // Confirm and execute the dispatch to the selected Caja
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchItems.length === 0) {
      setErrorMessage('Seleccione al menos un producto para realizar la distribución.');
      return;
    }

    try {
      setIsSubmittingTransfer(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      // Perform transfers sequentially
      for (const item of dispatchItems) {
        await transferStockToCaja(item.product.id, selectedCaja, item.quantity);
      }

      setSuccessMessage(`¡Distribución exitosa! Se enviaron correctamente los productos a la ${selectedCaja}.`);
      setDispatchItems([]);
    } catch (err: any) {
      setErrorMessage(`Error al procesar la distribución: ${err.message || err}`);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Calculate receipt totals
  const subtotalSum = receiptItems.reduce((acc, item) => acc + (item.quantity * item.cost), 0);

  return (
    <div className="space-y-6" id="warehouse-restock-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans flex items-center gap-2.5">
            <PackagePlus className="w-7 h-7 text-indigo-500" />
            <span>Ingreso de Mercadería al Almacén</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">REABASTECIMIENTO DE BEBIDAS, CRISTALERÍA, INSUMOS Y ENTRADAS POR COMPRA</p>
        </div>
        
        <div className="flex shrink-0 items-center gap-2 flex-wrap">
          {!showZeroConfirm ? (
            <button
              type="button"
              disabled={isZeroing || isResetting}
              onClick={() => {
                setSuccessMessage(null);
                setErrorMessage(null);
                setShowZeroConfirm(true);
              }}
              className="bg-zinc-900 border border-amber-900/40 hover:border-amber-500 hover:text-amber-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-amber-400 flex items-center gap-2 cursor-pointer transition-all uppercase"
            >
              <PackagePlus className={`w-4 h-4 text-amber-400 ${isZeroing ? 'animate-spin' : ''}`} />
              <span>{isZeroing ? 'Vaciando...' : 'Vaciar Stock Almacén (0 un.)'}</span>
            </button>
          ) : (
            <div className="bg-zinc-900 border border-amber-900/50 p-2 px-3 rounded-xl flex items-center gap-3 animate-fade-in">
              <span className="text-[10px] font-mono text-amber-300 uppercase font-bold">¿Poner stock a 0 conservando códigos?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsZeroing(true);
                      setShowZeroConfirm(false);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                      const count = await zeroOutProductStocks();
                      setSuccessMessage(`¡ÉXITO! Stock vaciado a 0 unidades para ${count} productos. Todos sus códigos y precios se conservaron.`);
                    } catch (err: any) {
                      setErrorMessage('Error al vaciar stock: ' + (err.message || err));
                    } finally {
                      setIsZeroing(false);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer"
                >
                  Sí, Vaciar
                </button>
                <button
                  type="button"
                  onClick={() => setShowZeroConfirm(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {!showResetConfirm ? (
            <button
              type="button"
              disabled={isResetting || isZeroing}
              onClick={() => {
                setSuccessMessage(null);
                setErrorMessage(null);
                setShowResetConfirm(true);
              }}
              className="bg-zinc-900 border border-zinc-800 hover:border-red-900/60 hover:text-red-400 px-4 py-2 rounded-xl text-xs font-mono font-bold text-zinc-400 flex items-center gap-2 cursor-pointer transition-all uppercase"
            >
              <RefreshCw className={`w-4 h-4 text-red-500 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Restableciendo...' : 'Cargar Catálogo Oficial (61 Prods)'}</span>
            </button>
          ) : (
            <div className="bg-zinc-900 border border-red-900/40 p-2 px-3 rounded-xl flex items-center gap-3 animate-fade-in">
              <span className="text-[10px] font-mono text-red-400 uppercase font-bold animate-pulse">¿Confirmas borrar todo y restablecer?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsResetting(true);
                      setShowResetConfirm(false);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                      await resetWarehouse();
                      setSuccessMessage('¡ÉXITO! Almacén restablecido con la lista de 61 productos oficiales y sincronizado con el Kardex.');
                    } catch (err: any) {
                      setErrorMessage('Error al restablecer catálogo: ' + (err.message || err));
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer"
                >
                  Sí, Reiniciar
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Notifications */}
      {successMessage && (
        <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-2 gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
          <button
            type="button"
            onClick={() => {
              setActiveTab('compras');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'compras'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>Ingresar Mercadería</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('distribucion');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'distribucion'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Llenar / Cargar Cajas</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('historial');
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Compras</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShiftReportOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-bold text-xs font-mono rounded-xl shadow-lg shadow-amber-950/30 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            title="Generar reporte de inventario de Inicio y Cierre de Jornada de Almacén"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Reporte de Jornada (Inicio / Cierre)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs font-mono rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
            title="Devolver todo el stock de las cajas registradoras al Almacén Central"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retorno de Productos al Almacén</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Catalog Search + Current Intake Receipt */}
      {activeTab === 'compras' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Product Selector (Lg: 7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
            <h3 className="text-xs font-mono text-zinc-400 mb-3 uppercase tracking-wider">Catálogo Central de Productos</h3>
            
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, código interno..." 
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-800/80"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-800/80"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas las Categorías</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 font-mono text-xs">
                No se encontraron productos que coincidan.
              </div>
            ) : (
              filteredProducts.map(prod => (
                <div 
                  key={prod.id} 
                  className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 hover:border-indigo-900/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="bg-zinc-900 border border-zinc-800 text-[8px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                        {prod.category}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        Cod: {prod.internalCode}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1.5 line-clamp-1">{prod.name}</h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      Stock actual: <span className={`font-semibold ${prod.quantity <= prod.minStock ? 'text-red-400' : 'text-zinc-300'}`}>{prod.quantity} {prod.unit}s</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase">Costo actual</span>
                      <span className="text-indigo-400 font-bold font-mono text-xs">{prod.cost.toFixed(2)} BOB</span>
                    </div>
                    <button
                      onClick={() => handleAddProduct(prod)}
                      className="bg-indigo-900/30 border border-indigo-800/40 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold uppercase flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Restock Receipt Workspace (Lg: 5 columns) */}
        <form onSubmit={handleSubmitReceipt} className="lg:col-span-5 space-y-4" id="restock-workspace">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            
            {/* Receipt Header */}
            <div className="p-4 bg-indigo-950/20 border-b border-zinc-900">
              <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <span>Hoja de Recepción Activa</span>
              </h3>
            </div>

            {/* Receipt Config fields */}
            <div className="p-4 space-y-3 border-b border-zinc-900 bg-zinc-950">
              {/* Supplier Dropdown */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase">Proveedor de Mercadería</label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono font-bold uppercase transition-all"
                  >
                    + Nuevo Proveedor
                  </button>
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-xl focus:outline-none"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.company} ({sup.contact})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Invoice & Payment Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase">Factura / Recibo #</label>
                    <button
                      type="button"
                      onClick={handleGenerateInvoiceNum}
                      className="text-[8px] text-zinc-500 hover:text-zinc-400 font-mono"
                    >
                      Generar aleatorio
                    </button>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. F-9345"
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-xl focus:outline-none"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Método de Pago</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value={PaymentMethod.CASH}>Efectivo</option>
                    <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                    <option value={PaymentMethod.CARD}>Tarjeta de Débito/Crédito</option>
                    <option value={PaymentMethod.QR}>Pago QR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Receipt Items Workspace */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[300px]">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Detalle de Mercadería</span>
              
              {receiptItems.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-900 rounded-xl text-zinc-600 font-mono text-xs">
                  Añada productos del catálogo de la izquierda para comenzar el ingreso.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {receiptItems.map((item, idx) => (
                    <div 
                      key={item.product.id} 
                      className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-3 flex flex-col gap-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="pr-6">
                        <h5 className="text-xs font-semibold text-white leading-tight">{item.product.name}</h5>
                        <span className="text-[9px] text-zinc-500 font-mono">Cod: {item.product.internalCode}</span>
                      </div>

                      {/* Adjustment Fields */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Qty Adjustment */}
                        <div>
                          <label className="block text-[8px] font-mono text-zinc-500 uppercase mb-0.5">Cantidad ({item.product.unit}s)</label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                              className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 w-7 h-7 rounded-l-lg flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              className="w-12 h-7 bg-zinc-900 border-y border-zinc-800 text-center font-mono text-xs text-white focus:outline-none"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(item.product.id, Number(e.target.value))}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                              className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 w-7 h-7 rounded-r-lg flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Cost Price Adjustment */}
                        <div>
                          <label className="block text-[8px] font-mono text-zinc-500 uppercase mb-0.5">Costo Unitario (BOB)</label>
                          <div className="relative">
                            <span className="absolute left-1.5 top-1.5 text-[10px] font-mono text-zinc-600">Bs</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-full h-7 bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-1 font-mono text-xs text-white focus:outline-none"
                              value={item.cost}
                              onChange={(e) => handleUpdateCost(item.product.id, Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-900/40">
                        Subtotal: <span className="font-bold text-indigo-400">{(item.quantity * item.cost).toFixed(2)} BOB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receipt Summary and Register Button */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-4">
              <div className="space-y-1.5 font-mono text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal Compra:</span>
                  <span>{subtotalSum.toFixed(2)} BOB</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Impuestos Declaración (13%):</span>
                  <span>{(subtotalSum * 0.13).toFixed(2)} BOB</span>
                </div>
                <div className="flex justify-between text-sm text-white font-bold border-t border-zinc-900 pt-2">
                  <span>TOTAL INGRESADO:</span>
                  <span className="text-indigo-400 font-mono">{subtotalSum.toFixed(2)} BOB</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={receiptItems.length === 0}
                className={`w-full text-center py-2.5 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  receiptItems.length === 0 
                    ? 'bg-zinc-900 text-zinc-600 border border-zinc-850 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/20'
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                <span>Confirmar e Ingresar a Almacén</span>
              </button>
            </div>

          </div>
        </form>

      </div>
      )}

      {/* Tab: Distribution/Fill Cajas */}
      {activeTab === 'distribucion' && (
        <div className="space-y-6 animate-fade-in" id="distribucion-tab-view">
          {/* Dashboard with the 4 Cajas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'].map((cajaName) => {
              // Count how many products have stock in this Caja
              const uniqueProdsInCaja = products.filter(p => (p.cajaStock?.[cajaName] ?? 0) > 0).length;
              const totalUnitsInCaja = products.reduce((acc, p) => acc + (p.cajaStock?.[cajaName] ?? 0), 0);
              const isActive = selectedCaja === cajaName;

              return (
                <button
                  key={cajaName}
                  type="button"
                  onClick={() => {
                    setSelectedCaja(cajaName);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/40'
                      : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Seleccionar Destino</span>
                    <h4 className={`text-base font-bold mt-1 ${isActive ? 'text-white' : 'text-zinc-300'}`}>{cajaName}</h4>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1">
                      {uniqueProdsInCaja} tipos de bebidas • <span className="text-indigo-400 font-semibold">{totalUnitsInCaja} uds</span>
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isActive ? 'bg-indigo-900/30 border-indigo-800 text-indigo-400' : 'bg-zinc-900 border-zinc-850 text-zinc-500'}`}>
                    <Store className="w-5 h-5" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Catalog & active dispatch column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Warehouse Inventory Catalogue */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Inventario del Almacén Central</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">SELECCIONA PRODUCTOS PARA ENVIAR A LA {selectedCaja.toUpperCase()}</p>
                  </div>
                  <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">
                    Caja Destino: {selectedCaja}
                  </span>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, código..." 
                      className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-800/80"
                      value={distSearchQuery}
                      onChange={(e) => setDistSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-800/80"
                    value={distSelectedCategory}
                    onChange={(e) => setDistSelectedCategory(e.target.value)}
                  >
                    <option value="all">Todas las Categorías</option>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid of Central Warehouse products */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {(() => {
                  if (distFilteredProducts.length === 0) {
                    return (
                      <div className="col-span-2 text-center py-12 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 font-mono text-xs">
                        No se encontraron productos disponibles en el almacén.
                      </div>
                    );
                  }

                  return distFilteredProducts.map(prod => {
                    const currentInCaja = prod.cajaStock?.[selectedCaja] ?? 0;
                    const isAdded = dispatchItems.some(item => item.product.id === prod.id);

                    return (
                      <div 
                        key={prod.id} 
                        className={`bg-zinc-950 border rounded-xl p-4 transition-all flex flex-col justify-between ${
                          isAdded ? 'border-indigo-500/40 bg-zinc-950/80' : 'border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="bg-zinc-900 border border-zinc-800 text-[8px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded uppercase">
                              {prod.category}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              Central: <span className="font-bold text-zinc-300">{prod.quantity} uds</span>
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-1.5 line-clamp-1">{prod.name}</h4>
                          <div className="flex justify-between items-center text-[10px] font-mono mt-2 text-zinc-500">
                            <span>En {selectedCaja}:</span>
                            <span className={`font-semibold ${currentInCaja > 0 ? 'text-indigo-400' : 'text-zinc-500'}`}>{currentInCaja} unidades</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 font-mono">Bs {prod.price.toFixed(2)}</span>
                          <button
                            type="button"
                            disabled={prod.quantity <= 0}
                            onClick={() => handleAddToDispatch(prod)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                              prod.quantity <= 0
                                ? 'bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed'
                                : isAdded
                                  ? 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                                  : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isAdded ? 'Añadir Más' : 'Cargar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: Active Dispatch Sheet */}
            <form onSubmit={handleConfirmDispatch} className="lg:col-span-5 space-y-4">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div className="p-4 bg-indigo-950/20 border-b border-zinc-900 flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-500" />
                    <span>Hoja de Despacho de Cajas</span>
                  </h3>
                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">
                    {selectedCaja}
                  </span>
                </div>

                {/* Dispatch Items List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Detalle de Distribución</span>

                  {dispatchItems.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-900 rounded-xl text-zinc-600 font-mono text-xs flex flex-col items-center gap-2">
                      <Layers className="w-8 h-8 text-zinc-800" />
                      <div>
                        <p>No hay productos en la hoja de despacho.</p>
                        <p className="text-[10px] text-zinc-700 mt-1">Seleccione productos de la izquierda para enviarlos a la {selectedCaja}.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dispatchItems.map((item) => (
                        <div
                          key={item.product.id}
                          className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-3 flex flex-col gap-2 relative"
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveFromDispatch(item.product.id)}
                            className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="pr-6">
                            <h5 className="text-xs font-semibold text-white leading-tight">{item.product.name}</h5>
                            <div className="flex items-center gap-2 text-[9px] font-mono mt-0.5">
                              <span className="text-zinc-500">Stock Central: {item.product.quantity} uds</span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-500">Caja Actual: {item.product.cajaStock?.[selectedCaja] ?? 0} uds</span>
                            </div>
                          </div>

                          {/* Dispatch Quantity adjustment */}
                          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-zinc-900/40">
                            <span className="text-[10px] text-zinc-500 font-mono">Cantidad a Enviar:</span>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => handleUpdateDispatchQty(item.product.id, item.quantity - 1, item.product.quantity)}
                                className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 w-7 h-7 rounded-l-lg flex items-center justify-center cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.product.quantity}
                                className="w-12 h-7 bg-zinc-900 border-y border-zinc-800 text-center font-mono text-xs text-white focus:outline-none"
                                value={item.quantity}
                                onChange={(e) => handleUpdateDispatchQty(item.product.id, Number(e.target.value), item.product.quantity)}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateDispatchQty(item.product.id, item.quantity + 1, item.product.quantity)}
                                className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 w-7 h-7 rounded-r-lg flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dispatch Actions */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-3">
                  <div className="font-mono text-[10px] text-zinc-500 flex justify-between">
                    <span>Total Ítems a Distribuir:</span>
                    <span className="text-white font-bold">{dispatchItems.reduce((acc, i) => acc + i.quantity, 0)} unidades</span>
                  </div>

                  <button
                    type="submit"
                    disabled={dispatchItems.length === 0 || isSubmittingTransfer}
                    className={`w-full text-center py-2.5 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      dispatchItems.length === 0 || isSubmittingTransfer
                        ? 'bg-zinc-900 text-zinc-600 border border-zinc-850 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/20'
                    }`}
                  >
                    {isSubmittingTransfer ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando Despacho...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        <span>Confirmar Envío a {selectedCaja}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-indigo-950/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Crear Nuevo Proveedor</h3>
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="text-zinc-500 hover:text-white font-semibold text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Nombre Comercial / Empresa</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Distribuidora del Oriente"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={newSupCompany}
                  onChange={(e) => setNewSupCompany(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Contacto de Ventas</label>
                <input 
                  type="text" 
                  placeholder="e.g. Carlos Mendoza"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Teléfono / Celular</label>
                <input 
                  type="text" 
                  placeholder="e.g. 78945612"
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-mono py-2 px-3 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono py-2 px-4 rounded-lg"
                >
                  Registrar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Purchases Log */}
      {activeTab === 'historial' && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg animate-fade-in">
          <div className="p-4 border-b border-zinc-900 bg-zinc-950">
            <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" />
              <span>Registro de Abastecimientos Recientes</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900/40 border-b border-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                  <th className="p-4 w-10">Detalle</th>
                  <th className="p-4">Fecha de Ingreso</th>
                  <th className="p-4">Nro. Factura</th>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Método de Pago</th>
                  <th className="p-4 text-right">Cant. Referencias</th>
                  <th className="p-4 text-right">Total Inversión</th>
                  <th className="p-4">Usuario Autor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-zinc-600 font-mono text-xs">
                      No se registran compras o abastecimientos recientes.
                    </td>
                  </tr>
                ) : (
                  purchases.map(pur => {
                    const pDate = new Date(pur.date);
                    const isExpanded = expandedPurchaseId === pur.id;
                    return (
                      <React.Fragment key={pur.id}>
                        <tr className="hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => setExpandedPurchaseId(isExpanded ? null : pur.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-xs cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="p-4 font-mono text-zinc-400 whitespace-nowrap">
                            {pDate.toLocaleDateString('es-ES')} {pDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-4 font-mono text-white font-semibold">{pur.invoiceNumber}</td>
                          <td className="p-4 font-sans font-medium text-zinc-200">{pur.supplierName}</td>
                          <td className="p-4">
                            <span className="bg-zinc-900 border border-zinc-800 text-[9px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded">
                              {pur.paymentMethod}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-zinc-300">{pur.items.length} productos</td>
                          <td className="p-4 text-right font-mono text-indigo-400 font-bold">{pur.total.toFixed(2)} BOB</td>
                          <td className="p-4 font-sans text-zinc-400 flex items-center gap-1.5 mt-2.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{pur.userName}</span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-zinc-900/10">
                            <td colSpan={8} className="p-4 border-b border-zinc-950">
                              <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4 ml-6 space-y-3">
                                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Desglose de Ítems Comprados:</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {pur.items.map((item, index) => (
                                    <div key={index} className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                                      <h5 className="text-xs font-semibold text-white">{item.productName}</h5>
                                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-900">
                                        <span>Cantidad: {item.quantity} uds</span>
                                        <span>Costo: {item.cost.toFixed(2)} Bs</span>
                                        <span className="font-bold text-indigo-400">{item.subtotal.toFixed(2)} Bs</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return to Warehouse Modal */}
      <ReturnToWarehouseModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        defaultCaja="ALL"
      />

      {/* Warehouse Shift Report Modal */}
      <WarehouseShiftReportModal
        isOpen={isShiftReportOpen}
        onClose={() => setIsShiftReportOpen(false)}
      />
    </div>
  );
}
