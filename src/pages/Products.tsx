/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { Product, UserRole, BottleConfig, isPhysicalProduct } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Tag, 
  Wine, 
  Boxes, 
  Barcode, 
  Check, 
  X, 
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react';

export default function Products() {
  const { products, categories, suppliers, saveProduct, deleteProduct, config } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showLowStock, setShowLowStock] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'physical' | 'pos_only'>('all');
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || '');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [specialPrice, setSpecialPrice] = useState(0);
  const [unit, setUnit] = useState('Botella');
  const [quantity, setQuantity] = useState(1);
  const [minStock, setMinStock] = useState(5);
  const [maxStock, setMaxStock] = useState(50);
  const [imageUrl, setImageUrl] = useState('');
  const [isPhysical, setIsPhysical] = useState(true);
  
  // Smart Bottle fields
  const [isBottle, setIsBottle] = useState(false);
  const [capacityMl, setCapacityMl] = useState(750);
  const [currentMl, setCurrentMl] = useState(750);
  const [shotSizes, setShotSizes] = useState<number[]>([30, 50, 60]);

  // Filters logic
  const filteredProducts = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    return products.filter(p => {
      const matchesSearch = !term || 
                            (p.name || '').toLowerCase().includes(term) || 
                            (p.internalCode || '').toLowerCase().includes(term) ||
                            (p.barCode || '').toLowerCase().includes(term);
      
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      const matchesLowStock = !showLowStock || p.quantity <= p.minStock;
      
      const isPhys = isPhysicalProduct(p);
      const matchesType = filterType === 'all' || 
                          (filterType === 'physical' && isPhys) ||
                          (filterType === 'pos_only' && !isPhys);

      return p.isActive && matchesSearch && matchesCategory && matchesLowStock && matchesType;
    });
  }, [products, debouncedSearchTerm, selectedCategory, showLowStock, filterType]);

  const handleOpenCreateModal = () => {
    setEditingProd(null);
    setName('');
    setCategory(categories[0]?.name || 'Whisky');
    setBrand('');
    setSupplierId(suppliers[0]?.id || '');
    setDescription('');
    setCost(0);
    setPrice(0);
    setSpecialPrice(0);
    setUnit('Botella');
    setQuantity(10);
    setMinStock(5);
    setMaxStock(50);
    setImageUrl('');
    setIsPhysical(true);
    setIsBottle(false);
    setCapacityMl(750);
    setCurrentMl(750);
    setShotSizes([30, 50, 60]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProd(p);
    setName(p.name);
    setCategory(p.category);
    setBrand(p.brand);
    setSupplierId(p.supplierId);
    setDescription(p.description);
    setCost(p.cost);
    setPrice(p.price);
    setSpecialPrice(p.specialPrice || 0);
    setUnit(p.unit);
    setQuantity(p.quantity);
    setMinStock(p.minStock);
    setMaxStock(p.maxStock);
    setImageUrl(p.imageUrl || '');
    setIsPhysical(isPhysicalProduct(p));
    
    if (p.bottleConfig) {
      setIsBottle(p.bottleConfig.isBottle);
      setCapacityMl(p.bottleConfig.capacityMl);
      setCurrentMl(p.bottleConfig.currentMl);
      setShotSizes(p.bottleConfig.shotSizes);
    } else {
      setIsBottle(false);
      setCapacityMl(750);
      setCurrentMl(750);
      setShotSizes([30, 50, 60]);
    }
    
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bottleConfig: BottleConfig | undefined = isBottle ? {
      isBottle,
      capacityMl,
      currentMl,
      shotSizes
    } : undefined;

    const saved: Product = {
      id: editingProd?.id || '',
      name,
      internalCode: editingProd?.internalCode || `AMB-${brand.slice(0,2).toUpperCase() || 'PROD'}-${Math.floor(100 + Math.random() * 900)}`,
      barCode: editingProd?.barCode || `740${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      category,
      brand,
      supplierId,
      description,
      cost: Number(cost),
      price: Number(price),
      specialPrice: specialPrice ? Number(specialPrice) : undefined,
      unit,
      quantity: Number(quantity),
      minStock: Number(minStock),
      maxStock: Number(maxStock),
      imageUrl: imageUrl || '',
      isPhysical,
      isActive: true,
      createdAt: editingProd?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bottleConfig
    };

    saveProduct(saved);
    setIsModalOpen(false);
  };

  // Helper to generate a fake barcode graphic via small styled black strips
  const renderBarcodeStripes = (codeStr: string) => {
    return (
      <div className="flex flex-col items-center justify-center bg-white p-2 rounded border border-zinc-200">
        <div className="flex h-8 items-stretch justify-center gap-[1px]" style={{ width: '130px' }}>
          {Array.from({ length: 32 }).map((_, i) => {
            const isWide = i % 5 === 0 || i % 7 === 0;
            const isWhite = i % 3 === 0 && i % 4 === 0;
            return (
              <span 
                key={i} 
                className={`${isWhite ? 'bg-transparent' : 'bg-black'} ${isWide ? 'w-[2px]' : 'w-[1px]'}`} 
              />
            );
          })}
        </div>
        <span className="text-[9px] font-mono text-black mt-1 leading-none tracking-widest">{codeStr}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="products-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Catálogo de Productos</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">GESTIONAR BEBIDAS, TRAGOS, BOTELLAS INTELIGENTES Y PRECIOS</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="mt-4 md:mt-0 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-red-950/20 transition-all cursor-pointer"
          id="btn-add-product"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Producto</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-950 p-4 border border-zinc-900 rounded-xl" id="products-filters">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 pl-11 pr-4 text-xs text-white focus:outline-none transition-colors"
            placeholder="Buscar por nombre, código interno o código de barra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Buttons */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              Todos ({products.filter(p => p.isActive).length})
            </button>
            <button
              onClick={() => setFilterType('physical')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'physical' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              📦 Almacén Físico ({products.filter(p => p.isActive && isPhysicalProduct(p)).length})
            </button>
            <button
              onClick={() => setFilterType('pos_only')}
              className={`px-3 py-1 rounded-lg transition-all ${filterType === 'pos_only' ? 'bg-amber-950 text-amber-300 border border-amber-800/50 font-semibold' : 'text-zinc-400 hover:text-white'}`}
            >
              🍸 Solo POS ({products.filter(p => p.isActive && !isPhysicalProduct(p)).length})
            </button>
          </div>

          <select
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Todas">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 select-none cursor-pointer">
            <input
              type="checkbox"
              className="accent-red-600 rounded"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
            />
            <span>Stock de Alerta</span>
          </label>
        </div>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-zinc-950 border border-zinc-900 p-12 text-center rounded-2xl" id="no-products-alert">
            <Boxes className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-500 text-xs font-mono">No se encontraron productos con los filtros aplicados.</p>
          </div>
        ) : (
          filteredProducts.map(prod => {
            const isLowStock = prod.quantity <= prod.minStock;
            const isPhys = isPhysicalProduct(prod);
            return (
              <div 
                key={prod.id} 
                className={`bg-zinc-950 border rounded-2xl overflow-hidden shadow-md flex flex-col justify-between hover:border-red-950 transition-all ${isLowStock ? 'border-red-950/60 shadow-lg shadow-red-950/5' : 'border-zinc-900'}`}
                id={`product-card-${prod.id}`}
              >
                {/* Top image or mock label */}
                <div className="relative h-40 bg-zinc-900 overflow-hidden">
                  {prod.imageUrl && !prod.imageUrl.includes('photo-1514362545857') ? (
                    <img 
                      src={prod.imageUrl} 
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-zinc-700">
                      <Wine className="w-12 h-12 opacity-30 mb-2" />
                      <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Sin Imagen</span>
                    </div>
                  )}
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 bg-zinc-950/80 border border-zinc-800 text-[10px] text-zinc-300 font-mono px-2 py-1 rounded-md uppercase tracking-wider">
                    {prod.category}
                  </span>
                  
                  {/* Physical vs POS Tag */}
                  <span className={`absolute bottom-3 right-3 text-[9px] font-mono font-semibold px-2 py-0.5 rounded border shadow ${isPhys ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60' : 'bg-amber-950/90 text-amber-300 border-amber-800/60'}`}>
                    {isPhys ? '📦 ALMACÉN (FÍSICO)' : '🍸 SOLO POS'}
                  </span>

                  {/* Stock Alert Pill */}
                  {isLowStock && isPhys && (
                    <span className="absolute top-3 right-3 bg-red-950/90 border border-red-800/50 text-[10px] text-red-400 font-mono px-2 py-1 rounded-md uppercase tracking-wider font-semibold">
                      ALERTA STOCK
                    </span>
                  )}
                  {/* Smart Bottle indicator */}
                  {prod.bottleConfig?.isBottle && (
                    <span className="absolute bottom-3 left-3 bg-red-600 border border-red-500 text-[9px] text-white font-sans font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
                      <Wine className="w-3 h-3" />
                      <span>CONTROL TRAGO ({prod.bottleConfig.currentMl}ml / {prod.bottleConfig.capacityMl}ml)</span>
                    </span>
                  )}
                </div>

                {/* Info Area */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-sans font-medium text-white text-sm line-clamp-1">{prod.name}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono font-semibold shrink-0 uppercase">{prod.unit}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono mt-1">Cód: <span className="text-zinc-400">{prod.internalCode}</span></p>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 h-8">{prod.description}</p>
                    
                    {/* ml Gauge for Smart Bottle */}
                    {prod.bottleConfig?.isBottle && (
                      <div className="mt-3 bg-zinc-900 rounded-lg p-2.5 border border-zinc-800">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span>Botella en servicio:</span>
                          <span className="text-red-400 font-bold">{Math.round((prod.bottleConfig.currentMl / prod.bottleConfig.capacityMl) * 100)}% restante</span>
                        </div>
                        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                          <div 
                            className="bg-gradient-to-r from-red-800 to-red-500 h-full transition-all"
                            style={{ width: `${Math.min(100, (prod.bottleConfig.currentMl / prod.bottleConfig.capacityMl) * 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {prod.bottleConfig.shotSizes.map(sz => (
                            <span key={sz} className="text-[8px] font-mono bg-zinc-950 text-zinc-500 border border-zinc-800 px-1 py-0.5 rounded">
                              Trago {sz}ml
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Distributed Stock by Caja badge row */}
                  {prod.cajaStock && Object.values(prod.cajaStock).some(qty => Number(qty) > 0) && (
                    <div className="mt-3 pt-3 border-t border-zinc-900/50">
                      <span className="text-[8px] font-mono text-zinc-500 block uppercase mb-1">Distribución en Cajas:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(prod.cajaStock)
                          .filter(([_, qty]) => Number(qty) > 0)
                          .map(([cajaName, qty]) => (
                            <span key={cajaName} className="text-[9px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                              {cajaName}: <strong className="text-white font-semibold">{qty}</strong>
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Financials / Action Row */}
                  <div className="mt-4 pt-4 border-t border-zinc-900/60">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-600 block uppercase">Precio</span>
                        <span className="text-white font-bold font-mono text-base">{prod.price} <span className="text-xs text-red-500 font-normal">{config.currency}</span></span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-zinc-600 block uppercase">Stock</span>
                        <span className={`font-mono font-semibold text-sm ${isLowStock ? 'text-red-500' : 'text-zinc-300'}`}>
                          {prod.quantity} <span className="text-xs text-zinc-600 font-normal">unidades</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Editar Producto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setProductToDelete(prod)}
                        className="bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 text-red-400 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Dar de baja / Inactivar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Creation / Editing Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto" id="product-modal">
          <div className="bg-zinc-950 border border-red-950/40 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 border-b border-zinc-900">
              <h2 className="text-lg font-sans font-semibold text-white">
                {editingProd ? `Editar: ${editingProd.name}` : 'Registrar Nuevo Producto'}
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">FORMULARIO DE CONTROL DE PRODUCTO AMBAR</p>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="e.g. Johnnie Walker Gold Label 750ml"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Marca / Fabricante</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="e.g. Johnnie Walker"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Proveedor Primario</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company}</option>
                    ))}
                  </select>
                </div>

                {/* Measure Unit */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Unidad de Medida</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="Botella">Botella</option>
                    <option value="Lata">Lata</option>
                    <option value="Unidad">Unidad / Unitario</option>
                    <option value="Trago">Servicio Trago</option>
                  </select>
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Costo Unitario ({config.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="120"
                    value={cost || ''}
                    onChange={(e) => setCost(Number(e.target.value))}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Precio de Venta Standard ({config.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="250"
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>

                {/* Quantities & stocks */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Stock en Almacén (Unidades)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="15"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                {/* Min stock */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Alerta de Mínimo Stock</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="5"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                  />
                </div>

                {/* Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Enlace de Imagen</label>
                  <input
                    type="url"
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Descripción</label>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    placeholder="Información adicional o notas del trago..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Smart Milliliter Control Block */}
              <div className="bg-zinc-900 border border-zinc-800/50 p-4 rounded-xl space-y-4">
                <label className="flex items-center gap-2.5 text-xs text-white font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-red-600 w-4 h-4 rounded"
                    checked={isBottle}
                    onChange={(e) => setIsBottle(e.target.checked)}
                  />
                  <div>
                    <span className="font-sans font-medium text-red-500 block">¿Es una botella con servicio de tragos?</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Habilita descuento automático de mililitros para coctelería y copas.</span>
                  </div>
                </label>

                {isBottle && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">Capacidad Total de Botella (ml)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-red-500"
                        placeholder="750"
                        value={capacityMl}
                        onChange={(e) => {
                          setCapacityMl(Number(e.target.value));
                          setCurrentMl(Number(e.target.value));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">Mililitros Restantes Botella Actual (ml)</label>
                      <input
                        type="number"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-red-500"
                        placeholder="750"
                        value={currentMl}
                        onChange={(e) => setCurrentMl(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono py-2 px-5 rounded-xl cursor-pointer"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="delete-prod-modal-overlay">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5" id="delete-prod-modal">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">Inactivar Producto</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                ¿Desea dar de baja el producto <span className="text-red-400 font-bold">"{productToDelete.name}"</span>? Esta acción ocultará el producto de los módulos activos.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono border border-zinc-800 hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
                id="delete-prod-cancel-btn"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-xs font-mono bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer font-bold shadow-md shadow-red-950/50"
                id="delete-prod-confirm-btn"
              >
                Dar de Baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
