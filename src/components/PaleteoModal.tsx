import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isPhysicalProduct } from '../types';
import { Shuffle, ArrowRight, Package, AlertTriangle, CheckCircle, Search, X } from 'lucide-react';

interface PaleteoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialTargetCaja?: string;
}

const ALL_LOCATIONS = ['Almacén Central', 'Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'];

export default function PaleteoModal({ isOpen, onClose, initialProductId, initialTargetCaja }: PaleteoModalProps) {
  const { products, paleteoStock, cashSessions } = useApp();

  const activeProducts = useMemo(() => products.filter(p => p.isActive && isPhysicalProduct(p)), [products]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || activeProducts[0]?.id || '');
  const [fromLocation, setFromLocation] = useState<string>('Caja 1');
  const [toLocation, setToLocation] = useState<string>(initialTargetCaja || 'Caja 2');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync when initial values change
  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else if (activeProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(activeProducts[0].id);
    }
  }, [initialProductId, activeProducts]);

  useEffect(() => {
    if (initialTargetCaja) {
      setToLocation(initialTargetCaja);
      if (fromLocation === initialTargetCaja) {
        setFromLocation(initialTargetCaja === 'Caja 1' ? 'Caja 2' : 'Caja 1');
      }
    }
  }, [initialTargetCaja]);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return activeProducts;
    const q = searchQuery.toLowerCase();
    return activeProducts.filter(p => p.name.toLowerCase().includes(q) || p.internalCode?.toLowerCase().includes(q));
  }, [activeProducts, searchQuery]);

  // Stock in Origin
  const originStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (fromLocation === 'Almacén Central') {
      return selectedProduct.quantity ?? 0;
    }
    return selectedProduct.cajaStock?.[fromLocation] ?? 0;
  }, [selectedProduct, fromLocation]);

  // Stock in Destination
  const destStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (toLocation === 'Almacén Central') {
      return selectedProduct.quantity ?? 0;
    }
    return selectedProduct.cajaStock?.[toLocation] ?? 0;
  }, [selectedProduct, toLocation]);

  // Automatically adjust origin location if user picks same destination or if origin has 0 stock
  useEffect(() => {
    if (fromLocation === toLocation) {
      const alternative = ALL_LOCATIONS.find(loc => loc !== toLocation);
      if (alternative) setFromLocation(alternative);
    }
  }, [toLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (fromLocation === toLocation) {
      setErrorMessage('La ubicación de origen y destino no pueden ser iguales.');
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('La cantidad debe ser mayor a 0.');
      return;
    }

    if (quantity > originStock) {
      setErrorMessage(`No hay suficiente stock en ${fromLocation}. Disponible: ${originStock} un., Solicitado: ${quantity} un.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await paleteoStock(selectedProduct.id, fromLocation, toLocation, quantity, notes.trim() || undefined);
      setSuccessMessage(`¡Paleteo exitoso! Se movieron ${quantity} un. de "${selectedProduct.name}" de ${fromLocation} ➔ ${toLocation}.`);
      setQuantity(1);
      setNotes('');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al realizar el paleteo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-950/40 border border-amber-900/40 text-amber-400 rounded-xl">
              <Shuffle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide font-sans uppercase">
                Paleteo de Cajas (Traspaso Interno)
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Mueve stock directamente entre Cajas o Almacén
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Banners */}
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-900/50 text-red-300 p-3 rounded-xl text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-950/50 border border-emerald-900/50 text-emerald-300 p-3 rounded-xl text-xs font-mono flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Search & Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              1. Seleccionar Producto / Bebida
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none mb-1.5"
              />
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
            >
              {filteredProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — (Central: {p.quantity || 0} | C1: {p.cajaStock?.['Caja 1'] || 0} | C2: {p.cajaStock?.['Caja 2'] || 0} | C3: {p.cajaStock?.['Caja 3'] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock Matrix preview for selected product */}
          {selectedProduct && (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-1.5">
                <span className="font-bold text-white flex items-center gap-1.5 font-sans">
                  <Package className="w-4 h-4 text-amber-400" />
                  {selectedProduct.name}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Stock Total: <strong className="text-white">{(selectedProduct.quantity || 0) + Object.values(selectedProduct.cajaStock || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)} un.</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                <div className={`p-1.5 rounded-lg border ${fromLocation === 'Almacén Central' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : toLocation === 'Almacén Central' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                  <span className="block text-[8px] uppercase text-zinc-500">Central</span>
                  <strong className="text-xs text-white">{selectedProduct.quantity || 0}</strong>
                </div>
                {['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'].map(cName => {
                  const stock = selectedProduct.cajaStock?.[cName] ?? 0;
                  const isOrigin = fromLocation === cName;
                  const isDest = toLocation === cName;

                  return (
                    <div 
                      key={cName} 
                      className={`p-1.5 rounded-lg border ${isOrigin ? 'bg-amber-950/50 border-amber-500 text-amber-300' : isDest ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300' : stock > 0 ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-red-950/20 border-red-900/30 text-red-400'}`}
                    >
                      <span className="block text-[8px] uppercase text-zinc-400">{cName}</span>
                      <strong className={`text-xs ${stock > 0 ? 'text-white' : 'text-red-400'}`}>{stock} un.</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transfer Route Selector (From ➔ To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Origin */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                Origen (Sale de):
              </label>
              <select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                className="w-full bg-zinc-900 border border-amber-900/50 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-400 font-mono cursor-pointer"
              >
                {ALL_LOCATIONS.map(loc => (
                  <option key={loc} value={loc} disabled={loc === toLocation}>
                    {loc} {selectedProduct ? `(${loc === 'Almacén Central' ? selectedProduct.quantity : selectedProduct.cajaStock?.[loc] || 0} un.)` : ''}
                  </option>
                ))}
              </select>
              <div className="text-[10px] font-mono text-zinc-400">
                Stock disponible en origen: <strong className={originStock > 0 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>{originStock} unidades</strong>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                Destino (Ingresa a):
              </label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                className="w-full bg-zinc-900 border border-emerald-900/50 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 font-mono cursor-pointer"
              >
                {ALL_LOCATIONS.map(loc => (
                  <option key={loc} value={loc} disabled={loc === fromLocation}>
                    {loc} {selectedProduct ? `(Actual: ${loc === 'Almacén Central' ? selectedProduct.quantity : selectedProduct.cajaStock?.[loc] || 0} un.)` : ''}
                  </option>
                ))}
              </select>
              <div className="text-[10px] font-mono text-zinc-400">
                Stock actual en destino: <strong className="text-emerald-400 font-bold">{destStock} unidades</strong>
              </div>
            </div>
          </div>

          {/* Quantity & Presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Cantidad a Paletear (Botellas)
              </label>
              <div className="flex gap-1 text-[10px] font-mono">
                {[1, 2, 5, 10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuantity(val)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="number"
              min="1"
              max={originStock || 1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-sm text-white font-mono font-bold focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Motivo / Observación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Reposición urgente para Caja 2 por agotamiento en barra..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-sans"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono py-2.5 px-4 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || originStock <= 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black font-bold text-xs font-mono py-2.5 px-5 rounded-xl cursor-pointer shadow-lg shadow-amber-950/20 flex items-center gap-2 transition-all shrink-0"
            >
              <Shuffle className="w-4 h-4" />
              <span>{isSubmitting ? 'Procesando Paleteo...' : `Ejecutar Paleteo (${fromLocation} ➔ ${toLocation})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
