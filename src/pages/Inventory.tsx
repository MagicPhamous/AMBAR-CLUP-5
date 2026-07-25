/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { MovementType, InventoryMovement, isPhysicalProduct } from '../types';
import { 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shuffle, 
  Sliders, 
  Search, 
  Calendar,
  User,
  Wine,
  Activity,
  Plus,
  PackageCheck
} from 'lucide-react';
import PaleteoModal from '../components/PaleteoModal';
import WarehouseShiftReportModal from '../components/WarehouseShiftReportModal';

export default function Inventory() {
  const { products, movements, adjustStock, transferStockToCaja, categories, config, users } = useApp();
  
  // Filter only physical warehouse items
  const physicalProducts = useMemo(() => products.filter(p => isPhysicalProduct(p)), [products]);

  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  
  // Modal State for stock adjustments
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState(physicalProducts[0]?.id || '');
  const [adjType, setAdjType] = useState<MovementType>(MovementType.ADJUSTMENT);
  const [adjQty, setAdjQty] = useState(0);
  const [adjMl, setAdjMl] = useState(0);
  const [adjObs, setAdjObs] = useState('');

  // Modal State for stock transfers to Cajas
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferProductId, setTransferProductId] = useState(physicalProducts[0]?.id || '');
  const [transferCaja, setTransferCaja] = useState('Caja 1');
  const [transferQty, setTransferQty] = useState(0);

  // Modal state for Warehouse Shift Report
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);

  // Selected product specifically for its individual Kardex
  const activeKardexProduct = useMemo(() => 
    physicalProducts.find(p => p.id === selectedProductId),
    [physicalProducts, selectedProductId]
  );

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesProduct = selectedProductId === 'all' || m.productId === selectedProductId;
      const matchesType = selectedType === 'all' || m.type === selectedType;
      const matchesUser = selectedUserId === 'all' || m.userId === selectedUserId;
      return matchesProduct && matchesType && matchesUser;
    });
  }, [movements, selectedProductId, selectedType, selectedUserId]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId) return;
    
    adjustStock(adjProductId, adjQty, adjType, adjObs, adjMl || undefined);
    
    // reset form
    setAdjQty(0);
    setAdjMl(0);
    setAdjObs('');
    setIsAdjustModalOpen(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId || transferQty <= 0) return;

    transferStockToCaja(transferProductId, transferCaja, transferQty)
      .then(() => {
        setTransferQty(0);
        setIsTransferModalOpen(false);
      })
      .catch(() => {});
  };

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case MovementType.ENTRY:
      case MovementType.PURCHASE:
        return (
          <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-max">
            <ArrowUpRight className="w-3 h-3" />
            <span>{type}</span>
          </span>
        );
      case MovementType.EXIT:
      case MovementType.SALE:
        return (
          <span className="bg-red-950/40 text-red-400 border border-red-800/40 text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-max">
            <ArrowDownLeft className="w-3 h-3" />
            <span>{type}</span>
          </span>
        );
      case MovementType.TRANSFER:
        return (
          <span className="bg-blue-950/40 text-blue-400 border border-blue-800/40 text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-max">
            <Shuffle className="w-3 h-3" />
            <span>{type}</span>
          </span>
        );
      case MovementType.ADJUSTMENT:
      default:
        return (
          <span className="bg-amber-950/40 text-amber-400 border border-amber-800/40 text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 w-max">
            <Sliders className="w-3 h-3" />
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" id="inventory-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Kardex e Inventarios</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">LOG DE ENTRADAS, SALIDAS, AUDITORÍA DE CONTEO FÍSICO Y AJUSTES</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setIsShiftReportOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-mono font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/30"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Reporte Jornada Almacén (Inicio / Cierre)</span>
          </button>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/50 text-amber-300 text-xs font-mono font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
            id="btn-transfer-stock"
          >
            <Shuffle className="w-4 h-4 text-amber-400" />
            <span>Paleteo / Traspaso de Cajas</span>
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-mono font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
            id="btn-adjust-inventory"
          >
            <Plus className="w-4 h-4 text-red-400" />
            <span>Ajuste de Stock</span>
          </button>
        </div>
      </div>

      {/* Main Stats Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="inventory-stats">
        {/* Stat 1 */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Insumos Físicos de Almacén</p>
          <h3 className="text-xl font-bold text-white mt-1">{physicalProducts.filter(p => p.isActive).length} <span className="text-xs text-zinc-500 font-normal">referencias</span></h3>
        </div>
        {/* Stat 2 */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Agotados (Stock 0)</p>
          <h3 className="text-xl font-bold text-red-500 mt-1">{physicalProducts.filter(p => p.isActive && p.quantity === 0).length} <span className="text-xs text-zinc-500 font-normal">ítems</span></h3>
        </div>
        {/* Stat 3 */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Próximos a Agotarse (Poco stock)</p>
          <h3 className="text-xl font-bold text-amber-500 mt-1">{physicalProducts.filter(p => p.isActive && p.quantity > 0 && p.quantity <= p.minStock).length} <span className="text-xs text-zinc-500 font-normal">ítems</span></h3>
        </div>
        {/* Stat 4 */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total de Movimientos</p>
          <h3 className="text-xl font-bold text-white mt-1">{movements.length} <span className="text-xs text-zinc-500 font-normal">operaciones</span></h3>
        </div>
      </div>

      {/* Filter / Selector Row */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase">Inspección de Kardex por Producto (Insumos Físicos)</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="all">Ver Todos los Productos Físicos (Historial Consolidado)</option>
            {physicalProducts.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.internalCode})</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase">Filtrar Movimiento</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">Todos los Tipos</option>
            {Object.values(MovementType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase">Autorizado por Usuario</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:border-red-800/80"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="all">Todos los Usuarios</option>
            {users.map(u => (
              <option key={u.uid} value={u.uid}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kardex Table View */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg" id="kardex-table-card">
        <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
          <div>
            <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider">
              {activeKardexProduct ? `Kardex Individual: ${activeKardexProduct.name}` : 'Historial General de Movimientos'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">MOVIMIENTOS DE ENTRADAS Y SALIDAS DE MERCADERÍA</p>
          </div>
          {activeKardexProduct && (
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Stock Actual Físico</span>
              <span className="text-white font-bold font-mono text-sm">
                {activeKardexProduct.quantity} {activeKardexProduct.unit}s
                {activeKardexProduct.bottleConfig && ` / ${activeKardexProduct.bottleConfig.currentMl} ml`}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Producto / Código</th>
                <th className="p-4">Operación</th>
                <th className="p-4 text-right">Cantidad / ml</th>
                <th className="p-4 text-right">Stock Resultante</th>
                <th className="p-4">Usuario</th>
                <th className="p-4 max-w-[200px]">Observaciones / NIT / Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-600 font-mono text-xs">
                    No se registran movimientos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(mov => {
                  const mDate = new Date(mov.date);
                  return (
                    <tr key={mov.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 font-mono text-zinc-400 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{mDate.toLocaleDateString('es-ES')}</span>
                          <span className="text-[10px] text-zinc-600">{mDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-sans font-medium text-zinc-200">{mov.productName}</div>
                        <span className="text-[10px] text-zinc-600 font-mono uppercase">ID: {mov.productId}</span>
                      </td>
                      <td className="p-4">
                        {getMovementBadge(mov.type)}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold ${mov.type === MovementType.ENTRY || mov.type === MovementType.PURCHASE ? 'text-emerald-500' : 'text-red-500'}`}>
                        {mov.type === MovementType.ENTRY || mov.type === MovementType.PURCHASE ? '+' : '-'}{mov.quantity} uds
                        {mov.mlDelta && (
                          <div className="text-[10px] font-normal font-mono text-zinc-500">
                            ({mov.mlDelta > 0 ? '+' : ''}{mov.mlDelta} ml)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-zinc-300 font-semibold">
                        {mov.balanceAfter} uds
                      </td>
                      <td className="p-4 font-sans text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-red-500" />
                          <span>{mov.userName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-500 italic max-w-[200px] break-words">
                        {mov.observations}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Dialog Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" id="adjustment-modal">
          <div className="bg-zinc-950 border border-red-950/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            
            <div className="p-6 border-b border-zinc-900">
              <h2 className="text-base font-sans font-semibold text-white">Manual Ajuste de Inventario</h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">DECLARACIÓN DE ENTRADAS, SALIDAS O CONTEOS FÍSICOS</p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Producto a Ajustar</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.internalCode})</option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type Selection */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Tipo de Movimiento</label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none"
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as MovementType)}
                >
                  <option value={MovementType.ENTRY}>Entrada (Incrementar stock)</option>
                  <option value={MovementType.EXIT}>Salida (Merma / Consumo personal / Rotura)</option>
                  <option value={MovementType.TRANSFER}>Transferencia a otra barra</option>
                  <option value={MovementType.ADJUSTMENT}>Ajuste por conteo físico</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Unidades Físicas</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    placeholder="1"
                    value={adjQty || ''}
                    onChange={(e) => setAdjQty(Number(e.target.value))}
                  />
                </div>

                {/* ml Adjustment (for bottle items only) */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Variación ml (Opcional)</label>
                  <input
                    type="number"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    placeholder="e.g. -150 o 500"
                    value={adjMl || ''}
                    onChange={(e) => setAdjMl(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Motivo / Observaciones del Ajuste</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                  placeholder="e.g. Ajuste de stock tras inventario mensual. Pérdida por rotura en barra VIP."
                  value={adjObs}
                  onChange={(e) => setAdjObs(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono py-2 px-4 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-mono py-2 px-5 rounded-xl cursor-pointer"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paleteo & Stock Transfer Modal */}
      <PaleteoModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
      />

      {/* Warehouse Shift Report Modal */}
      <WarehouseShiftReportModal
        isOpen={isShiftReportOpen}
        onClose={() => setIsShiftReportOpen(false)}
      />
    </div>
  );
}
