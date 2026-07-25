import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeftRight, Package, AlertTriangle, CheckCircle2, RotateCcw, X, Warehouse, GlassWater } from 'lucide-react';

interface ReturnToWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCaja?: string;
}

const AVAILABLE_CAJAS = [
  { id: 'ALL', label: 'Todas las Cajas (Caja 1, 2, 3, 4)' },
  { id: 'Caja 1', label: 'Caja 1' },
  { id: 'Caja 2', label: 'Caja 2' },
  { id: 'Caja 3', label: 'Caja 3' },
  { id: 'Caja 4', label: 'Caja 4' },
];

export default function ReturnToWarehouseModal({ isOpen, onClose, defaultCaja = 'ALL' }: ReturnToWarehouseModalProps) {
  const { products, returnCajaStockToWarehouse, config } = useApp();

  const [selectedCaja, setSelectedCaja] = useState<string>(defaultCaja);
  const [notes, setNotes] = useState<string>('Retorno de inventario por cierre de jornada laboral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ returnedProductsCount: number; totalUnitsReturned: number } | null>(null);

  // Sync defaultCaja if updated
  React.useEffect(() => {
    if (defaultCaja) {
      setSelectedCaja(defaultCaja);
    }
  }, [defaultCaja]);

  // Products with stock in the chosen Caja(s)
  const productsToReturn = useMemo(() => {
    return products.filter(p => {
      if (!p.cajaStock) return false;
      if (selectedCaja === 'ALL') {
        return Object.values(p.cajaStock).some(v => Number(v) > 0);
      } else {
        return (p.cajaStock[selectedCaja] || 0) > 0;
      }
    }).map(p => {
      let qtyToReturn = 0;
      if (selectedCaja === 'ALL') {
        qtyToReturn = Object.values(p.cajaStock || {}).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
      } else {
        qtyToReturn = p.cajaStock?.[selectedCaja] || 0;
      }
      return {
        product: p,
        qtyToReturn
      };
    });
  }, [products, selectedCaja]);

  // Total summary calculation
  const totalUnits = useMemo(() => {
    return productsToReturn.reduce((sum, item) => sum + item.qtyToReturn, 0);
  }, [productsToReturn]);

  if (!isOpen) return null;

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productsToReturn.length === 0 || totalUnits === 0) {
      setErrorMessage('No hay ningún producto con stock en la caja seleccionada para retornar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const result = await returnCajaStockToWarehouse(selectedCaja, notes.trim() || undefined);
      setSuccessResult(result);
      setTimeout(() => {
        // Auto close after 2 seconds
        setSuccessResult(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al ejecutar el retorno de productos al almacén.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden space-y-5 animate-scale-up">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide font-sans uppercase">
                Retorno de Productos al Almacén
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Cierre de Turno: Devuelve el inventario de Caja a Almacén Central
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

        {/* Notifications */}
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-900/50 text-red-300 p-3 rounded-xl text-xs font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successResult && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-4 rounded-xl text-xs font-mono flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-emerald-300">¡Retorno ejecutado con éxito!</div>
              <div>Se regresaron <strong>{successResult.totalUnitsReturned} unidades</strong> de {successResult.returnedProductsCount} producto(s) al Almacén Central. El stock en caja quedó en 0.</div>
            </div>
          </div>
        )}

        <form onSubmit={handleReturn} className="space-y-4">
          {/* Select Caja Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
              1. Selecciona la Caja de Origen
            </label>
            <select
              value={selectedCaja}
              onChange={(e) => setSelectedCaja(e.target.value)}
              disabled={isSubmitting || !!successResult}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
            >
              {AVAILABLE_CAJAS.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Stock Preview Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-amber-400" />
                <span>Resumen de Productos a Retornar</span>
              </span>
              <span className="text-[11px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/50 px-2.5 py-0.5 rounded-lg font-bold">
                {totalUnits} unidades en total
              </span>
            </div>

            {productsToReturn.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl space-y-1">
                <Package className="w-8 h-8 text-zinc-600 mx-auto opacity-50" />
                <p>No hay productos con stock registrado en {selectedCaja === 'ALL' ? 'ninguna caja' : selectedCaja}.</p>
                <p className="text-[10px] text-zinc-600">Las cajas ya están en 0.</p>
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-zinc-500 uppercase text-[9px] tracking-wider border-b border-zinc-800/80">
                      <th className="pb-2">Producto</th>
                      <th className="pb-2 text-center">Stock en Caja</th>
                      <th className="pb-2 text-right">Destino (Central)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                    {productsToReturn.map(({ product, qtyToReturn }) => (
                      <tr key={product.id} className="hover:bg-zinc-800/30">
                        <td className="py-2 font-semibold text-white flex items-center gap-1.5">
                          <GlassWater className="w-3.5 h-3.5 text-amber-500" />
                          <span>{product.name}</span>
                        </td>
                        <td className="py-2 text-center text-amber-400 font-bold">
                          {qtyToReturn} un.
                        </td>
                        <td className="py-2 text-right text-emerald-400">
                          +{(product.quantity || 0)} ➔ <strong className="text-emerald-300 font-bold">{(product.quantity || 0) + qtyToReturn} un.</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Observations / Notes */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Observación / Motivo del Retorno
            </label>
            <input
              type="text"
              placeholder="Ej. Devolución de botellas sobrantes de la barra al almacén principal al cierre..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting || !!successResult}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || productsToReturn.length === 0 || totalUnits === 0 || !!successResult}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-xs font-mono py-2.5 px-5 rounded-xl cursor-pointer shadow-lg shadow-amber-950/30 flex items-center gap-2 transition-all shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? 'Retornando Productos...' 
                  : `Retornar ${totalUnits} Unidades al Almacén`
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
