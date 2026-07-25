/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MovementType, Product } from '../types';
import { 
  Wine, 
  Sparkles, 
  Sliders, 
  Trash2, 
  TrendingDown, 
  Check, 
  Layers, 
  Activity, 
  Plus, 
  Flame,
  Search,
  GlassWater,
  CupSoda,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export function BartenderComandas() {
  const { tables, config } = useApp();

  // Find all occupied tables with active beverage consumptions
  const activeTables = tables.filter(t => t.consumption && t.consumption.length > 0);

  // Filter consumption to beverages only (based on category or unit)
  const getBeverages = (consumption: any[]) => {
    return consumption.filter(item => {
      const cat = (item?.product?.category || '').toLowerCase();
      const unit = (item?.product?.unit || '').toLowerCase();
      return cat.includes('whisky') || 
             cat.includes('ron') || 
             cat.includes('vodka') || 
             cat.includes('tequila') ||
             cat.includes('gin') ||
             cat.includes('cerveza') || 
             cat.includes('trago') || 
             cat.includes('coctel') || 
             cat.includes('bebida') ||
             cat.includes('refresco') ||
             cat.includes('energizante') ||
             unit.includes('trago') ||
             unit.includes('copa') ||
             unit.includes('botella');
    });
  };

  const [servedItems, setServedItems] = useState<string[]>([]);

  const toggleServed = (tableId: string, productId: string, index: number) => {
    const key = `${tableId}-${productId}-${index}`;
    if (servedItems.includes(key)) {
      setServedItems(prev => prev.filter(k => k !== key));
    } else {
      setServedItems(prev => [...prev, key]);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in" id="bartender-comandas-view">
      <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
        <div>
          <h2 className="text-sm font-sans font-semibold text-white uppercase tracking-wider">Cola de Comandas / Bebidas Activas</h2>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">Tragos y bebidas solicitados por los meseros desde las mesas</p>
        </div>
        <span className="bg-red-950/40 border border-red-900/30 text-red-500 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
          {activeTables.length} mesas con pedidos
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="comandas-grid">
        {activeTables.map(table => {
          const drinks = getBeverages(table.consumption);
          if (drinks.length === 0) return null;

          return (
            <div key={table.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 hover:border-zinc-850 transition-all flex flex-col justify-between" id={`comanda-card-${table.id}`}>
              <div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
                    <h3 className="font-sans font-bold text-white text-sm">Mesa {table.number} ({table.name})</h3>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">{table.openedAt ? new Date(table.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Activa'}</span>
                </div>

                <div className="space-y-3 mt-3">
                  {drinks.map((item, idx) => {
                    const key = `${table.id}-${item.product.id}-${idx}`;
                    const isServed = servedItems.includes(key);

                    return (
                      <div 
                        key={idx} 
                        onClick={() => toggleServed(table.id, item.product.id, idx)}
                        className={`flex justify-between items-center p-2 rounded-lg border transition-all cursor-pointer ${isServed ? 'bg-zinc-900/30 border-zinc-900 text-zinc-500 line-through' : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 text-white'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${isServed ? 'bg-zinc-900 text-zinc-600' : 'bg-red-950/50 text-red-400 border border-red-900/20'}`}>
                            {item.quantity}
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-sans font-medium">{item.product.name}</span>
                            {item.selectedShotMl && (
                              <span className="text-[9px] font-mono text-red-500 block">Medida: {item.selectedShotMl}ml</span>
                            )}
                          </div>
                        </div>
                        <button 
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${isServed ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 'border-zinc-800 text-zinc-600 hover:text-white'}`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-between items-center mt-4">
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Atendido por: {table.currentWaiterName || 'Sin asignar'}</span>
                <span className="text-[10px] font-mono font-bold text-zinc-400">Total tragos: {drinks.reduce((sum, d) => sum + d.quantity, 0)}</span>
              </div>
            </div>
          );
        })}

        {activeTables.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-950 border border-zinc-900 rounded-xl" id="no-comandas">
            <Wine className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-xs text-zinc-500 font-mono">No hay comandas de barra pendientes en este momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BartenderPour() {
  const { products, adjustStock, config } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter only bottle products
  const bottleProducts = products.filter(p => p.isActive && p.bottleConfig?.isBottle);
  
  const filteredBottles = bottleProducts.filter(b => 
    (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(bottleProducts[0] || null);
  const [pourSize, setPourSize] = useState<number>(50); // Default 50ml shot size
  const [pourStatus, setPourStatus] = useState<'idle' | 'pouring' | 'success'>('idle');

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handlePour = async () => {
    if (!selectedProduct || pourStatus === 'pouring') return;
    
    setPourStatus('pouring');
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (!isMountedRef.current) return;

    // Pouring logic: Deduct shot size (e.g., -50 ml) from the bottle config
    adjustStock(
      selectedProduct.id, 
      0, 
      MovementType.EXIT, 
      `Trago servido: Medida de ${pourSize}ml servida directamente por bartender`, 
      -pourSize
    );
    setPourStatus('success');

    await new Promise(resolve => setTimeout(resolve, 1800));
    if (isMountedRef.current) {
      setPourStatus('idle');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in" id="bartender-pour-workspace">
      {/* LEFT: Bottles list */}
      <div className="xl:col-span-5 bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4" id="pour-selector-column">
        <div>
          <h2 className="text-sm font-sans font-semibold text-white uppercase tracking-wider">Dispensador y Control de Licores</h2>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">Selecciona una botella de licor activa en barra</p>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar botella..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1" id="bottles-scroll">
          {filteredBottles.map(bottle => {
            const isSelected = selectedProduct?.id === bottle.id;
            const currentMl = bottle.bottleConfig?.currentMl || 0;
            const capacity = bottle.bottleConfig?.capacityMl || 750;
            const percent = Math.min(100, Math.max(0, Math.round((currentMl / capacity) * 100)));

            return (
              <div 
                key={bottle.id}
                onClick={() => {
                  if (pourStatus !== 'pouring') {
                    setSelectedProduct(bottle);
                  }
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-red-950/30 border-red-900/40 shadow-md shadow-red-950/10' : 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900 text-zinc-300'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-sans font-medium text-white">{bottle.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{bottle.brand}</span>
                </div>

                {/* Progress bar of ml remaining */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-zinc-500">Volumen: {currentMl}ml / {capacity}ml</span>
                    <span className={percent < 20 ? 'text-red-500 font-bold' : 'text-zinc-400'}>{percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-850">
                    <div 
                      className={`h-full transition-all duration-500 ${percent < 20 ? 'bg-red-500 shadow-glow' : percent < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredBottles.length === 0 && (
            <p className="text-center py-6 text-xs text-zinc-500 font-mono">No hay botellas de licor configuradas.</p>
          )}
        </div>
      </div>

      {/* RIGHT: Serving Console */}
      <div className="xl:col-span-7 bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between" id="pour-console-column">
        {selectedProduct ? (
          <div className="space-y-6 text-center py-4 flex-1 flex flex-col justify-between" id="pour-active-panel">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono bg-red-950/40 text-red-400 border border-red-900/30 px-2.5 py-1 rounded-full uppercase font-bold tracking-wider">
                Consola de Servido Digital
              </span>
              <h3 className="text-lg font-bold text-white tracking-wide mt-3">{selectedProduct.name}</h3>
              <p className="text-xs text-zinc-500 font-mono">Unidades de botellas en depósito: <span className="text-white font-bold">{selectedProduct.quantity} botellas</span></p>
            </div>

            {/* Virtual Glass animation area */}
            <div className="relative py-8 flex items-center justify-center" id="virtual-glass-stage">
              <div className="w-32 h-36 border-2 border-t-0 border-zinc-700 rounded-b-2xl relative flex items-end overflow-hidden shadow-2xl bg-zinc-950/20">
                {/* Liquid filled */}
                <div 
                  className={`w-full transition-all duration-1000 ${pourStatus === 'pouring' ? 'h-3/4 bg-amber-500/85 animate-pulse' : pourStatus === 'success' ? 'h-3/4 bg-amber-500' : 'h-1/5 bg-amber-500/10'}`} 
                />
                
                {/* Flow line */}
                {pourStatus === 'pouring' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-full bg-amber-400 animate-bounce" />
                )}

                {/* Foam / sparkles */}
                {pourStatus === 'pouring' && (
                  <Flame className="w-5 h-5 text-red-500 absolute top-10 left-12 animate-ping" />
                )}
              </div>
            </div>

            {/* Pour controls */}
            <div className="space-y-5">
              <div className="flex justify-center gap-3" id="shot-presets">
                {[30, 50, 60].map(size => (
                  <button
                    key={size}
                    disabled={pourStatus === 'pouring'}
                    onClick={() => setPourSize(size)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all cursor-pointer ${pourSize === size ? 'bg-red-600 border-red-600 text-white font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'}`}
                  >
                    {size} ml (Copa)
                  </button>
                ))}
              </div>

              <div className="flex gap-3 max-w-sm mx-auto">
                <button
                  disabled={pourStatus === 'pouring' || (selectedProduct.bottleConfig?.currentMl || 0) < pourSize}
                  onClick={handlePour}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-red-950/50 disabled:opacity-30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pourStatus === 'pouring' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Sirviendo...
                    </>
                  ) : pourStatus === 'success' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      ¡Servido con éxito!
                    </>
                  ) : (
                    <>
                      <Wine className="w-4 h-4" />
                      Servir {pourSize}ml
                    </>
                  )}
                </button>
              </div>

              {(selectedProduct.bottleConfig?.currentMl || 0) < pourSize && (
                <p className="text-xs text-red-500 font-mono">¡Advertencia! El volumen de la botella actual es insuficiente. Abre una nueva botella debajo.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-24 text-center flex-1 flex flex-col justify-center items-center text-zinc-500" id="pour-no-selection">
            <Wine className="w-12 h-12 text-zinc-800 mb-3" />
            <p className="text-xs font-mono">Selecciona una botella de licor para abrir el dispensador virtual.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BartenderBottles() {
  const { products, openBottles, discardOpenBottle, selectedCaja, currentUser } = useApp();

  const [currentCaja, setCurrentCaja] = useState(() => {
    if (selectedCaja) return selectedCaja;
    if (currentUser?.username?.toLowerCase().includes('caja')) {
      const num = currentUser.username.toLowerCase().replace(/^\D+/g, '');
      return num ? `Caja ${num}` : 'Caja 1';
    }
    return 'Caja 1';
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Confirmation Modals State
  const [confirmDiscardModal, setConfirmDiscardModal] = useState<{ id: string; name: string } | null>(null);
  const [confirmOpenModal, setConfirmOpenModal] = useState<{ id: string; name: string; capacity: number } | null>(null);

  const bottleProducts = products.filter(p => p.isActive && p.bottleConfig?.isBottle);

  // Helper functions for safely resolving bottle counts
  const getOpenCount = (p: Product) => {
    const countNum = p.cajaOpenBottlesCount?.[currentCaja];
    if (typeof countNum === 'number' && countNum > 0) {
      return countNum;
    }
    if (typeof p.openBottles === 'object' && p.openBottles !== null && p.openBottles[currentCaja]) {
      return 1;
    }
    if (typeof p.openBottles === 'boolean' && p.openBottles) {
      return 1;
    }
    if (p.cajaMl && typeof p.cajaMl[currentCaja] === 'number' && p.cajaMl[currentCaja] > 0) {
      return 1;
    }
    return typeof countNum === 'number' ? Math.max(0, countNum) : 0;
  };

  const getFinishedCount = (p: Product) => {
    if (p.cajaFinishedBottlesCount && typeof p.cajaFinishedBottlesCount[currentCaja] === 'number') {
      return Math.max(0, p.cajaFinishedBottlesCount[currentCaja]);
    }
    return 0;
  };

  // Active open bottles list for selected Caja
  const activeOpenBottles = bottleProducts.filter(p => getOpenCount(p) > 0);

  const totalActiveOpen = bottleProducts.reduce((sum, p) => sum + getOpenCount(p), 0);
  const totalFinishedShift = bottleProducts.reduce((sum, p) => sum + getFinishedCount(p), 0);

  const handleOpenNewBottle = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const stockInCaja = prod.cajaStock?.[currentCaja] ?? prod.quantity ?? 0;
    if (stockInCaja <= 0 && prod.quantity <= 0) {
      alert(`No quedan botellas de "${prod.name}" en inventario o depósito. Debe solicitar recarga de almacén.`);
      return;
    }

    setConfirmOpenModal({
      id: prod.id,
      name: prod.name,
      capacity: prod.bottleConfig?.capacityMl || 750
    });
  };

  const handleDiscardBottle = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setConfirmDiscardModal({
      id: prod.id,
      name: prod.name
    });
  };

  const executeDiscard = async () => {
    if (!confirmDiscardModal) return;
    const { id, name } = confirmDiscardModal;
    setConfirmDiscardModal(null);

    try {
      setIsProcessing(true);
      await discardOpenBottle(id, currentCaja);
      setFeedbackMsg(`¡Botella de "${name}" declarada VACÍA y desechada con éxito! Registro guardado para la planilla de cierre de ${currentCaja}.`);
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err: any) {
      alert(`Error al desechar botella: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeOpen = async () => {
    if (!confirmOpenModal) return;
    const { id, name } = confirmOpenModal;
    setConfirmOpenModal(null);

    try {
      setIsProcessing(true);
      await openBottles([id], currentCaja);
      setFeedbackMsg(`¡Botella de "${name}" abierta exitosamente en ${currentCaja}!`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      alert(`Error al abrir botella: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="bartender-bottles-view">
      {/* Header bar with station selector & shift stats */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wine className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-sans font-bold text-white uppercase tracking-wider">
              Control de Botellas Abiertas y Descorche
            </h2>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1">
            Registro en tiempo real de botellas abiertas y vacías desechadas por estación de barra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Station selector */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Estación:</span>
            <select
              value={currentCaja}
              onChange={(e) => setCurrentCaja(e.target.value)}
              className="bg-transparent border-none text-xs font-mono font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value="Caja 1" className="bg-zinc-900 text-white">Caja 1 (Barra Principal)</option>
              <option value="Caja 2" className="bg-zinc-900 text-white">Caja 2 (Barra VIP)</option>
              <option value="Caja 3" className="bg-zinc-900 text-white">Caja 3 (Pista / Disco)</option>
              <option value="Caja 4" className="bg-zinc-900 text-white">Caja 4 (Terraza)</option>
            </select>
          </div>

          {/* Active open bottles counter */}
          <div className="bg-purple-950/40 border border-purple-900/40 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] font-mono text-purple-300 font-bold uppercase">
              {totalActiveOpen} Abierta{totalActiveOpen !== 1 ? 's' : ''} Activa{totalActiveOpen !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Shift finished empty bottles counter */}
          <div className="bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">
              {totalFinishedShift} Vacía{totalFinishedShift !== 1 ? 's' : ''} Desechada{totalFinishedShift !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-mono animate-fade-in shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: BOTELLAS ABIERTAS ACTIVAS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-ping" />
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider">
              Botellas Abiertas Activas en {currentCaja} ({activeOpenBottles.length})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Tragos o shots en preparación
          </span>
        </div>

        {activeOpenBottles.length === 0 ? (
          <div className="py-8 px-6 text-center bg-zinc-950 border border-zinc-900/80 rounded-xl space-y-2">
            <Wine className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-xs font-mono text-zinc-400">
              No hay botellas abiertas en este momento en <span className="text-amber-400 font-bold">{currentCaja}</span>.
            </p>
            <p className="text-[10px] font-mono text-zinc-600">
              Si necesita servir tragos, descorche una nueva botella del catálogo general ubicado abajo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="active-open-bottles-grid">
            {activeOpenBottles.map(bottle => {
              const openCount = getOpenCount(bottle);
              const finishedCount = getFinishedCount(bottle);
              const currentMl = bottle.cajaMl?.[currentCaja] ?? bottle.bottleConfig?.currentMl ?? 0;
              const capacity = bottle.bottleConfig?.capacityMl || 750;
              const percent = Math.min(100, Math.max(0, Math.round((currentMl / capacity) * 100)));

              return (
                <div
                  key={`active-open-${bottle.id}`}
                  className="bg-zinc-950 border-2 border-purple-900/60 hover:border-purple-600/80 rounded-xl p-5 space-y-4 shadow-xl shadow-purple-950/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded text-[8px] font-mono uppercase font-bold tracking-wider inline-block mb-1">
                          ● BOTELLA ABIERTA ACTIVA
                        </span>
                        <h4 className="font-sans font-bold text-white text-sm">{bottle.name}</h4>
                        <p className="text-[10px] font-mono text-zinc-500">Marca: {bottle.brand || 'Genérica'}</p>
                      </div>
                      <span className="bg-zinc-900 text-purple-400 border border-purple-900/50 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                        {openCount} abierta{openCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Nivel de contenido:</span>
                        <span className="text-white font-bold">{currentMl} ml / {capacity} ml</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${percent < 20 ? 'bg-red-500' : 'bg-purple-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-1">
                        <span>Desechadas en turno: <strong className="text-amber-400">{finishedCount}</strong></span>
                        <span>{percent}% restante</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDiscardBottle(bottle.id)}
                      className="w-full bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white border border-red-800/80 font-mono font-bold text-xs py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/40 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Declarar Vacía / Desechar Botella</span>
                    </button>
                    <p className="text-[9px] font-mono text-zinc-500 text-center">
                      Quita la botella de abiertas y la guarda para la planilla de cierre.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CATÁLOGO Y DESCORCHE GENERAL */}
      <div className="space-y-3 pt-4 border-t border-zinc-900">
        <div className="flex justify-between items-center pb-1">
          <div>
            <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider">
              Catálogo General y Descorche de Botellas Nuevas
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
              Si necesita abrir una botella sellada de depósito o caja, presione "Descorchar".
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="bottles-management-grid">
          {bottleProducts.map(bottle => {
            const openCount = getOpenCount(bottle);
            const finishedCount = getFinishedCount(bottle);
            const currentStock = bottle.cajaStock?.[currentCaja] ?? bottle.quantity ?? 0;
            const capacity = bottle.bottleConfig?.capacityMl || 750;

            return (
              <div
                key={`cat-${bottle.id}`}
                className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 hover:border-zinc-800 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-sans font-bold text-white text-sm">{bottle.name}</h4>
                      <p className="text-[10px] font-mono text-zinc-500">Marca: {bottle.brand || 'Genérica'}</p>
                    </div>
                    <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded text-[9px] font-mono uppercase">
                      {bottle.category}
                    </span>
                  </div>

                  <div className="space-y-1 bg-zinc-900/30 p-3 rounded-lg border border-zinc-900 text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Stock sellado ({currentCaja}):</span>
                      <span className={`font-bold ${currentStock === 0 ? 'text-red-400' : 'text-white'}`}>
                        {currentStock} botellas
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-900">
                      <span className="text-zinc-500">Abiertas activas:</span>
                      <span className={openCount > 0 ? 'text-purple-400 font-bold' : 'text-zinc-500'}>
                        {openCount} abierta{openCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-zinc-500">Vacías desechadas en turno:</span>
                      <span className={finishedCount > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                        {finishedCount} vacía{finishedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleOpenNewBottle(bottle.id)}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white font-mono font-bold text-[10px] py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                    <span>Descorchar / Abrir Botella Nueva ({capacity}ml)</span>
                  </button>

                  {openCount > 0 && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDiscardBottle(bottle.id)}
                      className="w-full bg-red-950/40 hover:bg-red-950/80 border border-red-900/50 text-red-400 hover:text-red-200 font-mono text-[10px] py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Declarar Vacía / Desechar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {bottleProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs">
              No hay productos registrados con control de botellas por mililitros.
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: DECLARAR BOTELLA VACÍA */}
      {confirmDiscardModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-red-950/60 relative text-center">
            <button
              onClick={() => setConfirmDiscardModal(null)}
              disabled={isProcessing}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="p-4 bg-red-950/80 border border-red-700/60 rounded-full text-red-400 shadow-inner">
                <Trash2 className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest bg-red-950/40 px-3 py-1 rounded-full border border-red-800/40">
                Confirmación de Desecho ({currentCaja})
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white leading-snug">
                ¿Confirmar que 1 botella abierta de <span className="text-red-400 font-extrabold">{confirmDiscardModal.name}</span> está VACÍA?
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                • La botella ya NO figurará como abierta en la barra.<br />
                • Se registrará <strong>+1 botella vacía</strong> en {currentCaja} para la planilla diaria de cierre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setConfirmDiscardModal(null)}
                disabled={isProcessing}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executeDiscard}
                disabled={isProcessing}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-950/60 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Procesando...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Desechar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DESCORCHAR / ABRIR BOTELLA NUEVA */}
      {confirmOpenModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-amber-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-amber-950/60 relative text-center">
            <button
              onClick={() => setConfirmOpenModal(null)}
              disabled={isProcessing}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="p-4 bg-amber-950/80 border border-amber-700/60 rounded-full text-amber-400 shadow-inner">
                <Wine className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
                Apertura y Descorche ({currentCaja})
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white leading-snug">
                ¿Desea descorchar una botella nueva de <span className="text-amber-400 font-extrabold">{confirmOpenModal.name}</span>?
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                • Se descontará 1 unidad física del inventario.<br />
                • Se habilitarán <strong>{confirmOpenModal.capacity} ml</strong> para tragos en {currentCaja}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setConfirmOpenModal(null)}
                disabled={isProcessing}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executeOpen}
                disabled={isProcessing}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-950/50 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Abriendo...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Sí, Descorchar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// INGENIOUS COCKTAIL ALCHEMY & AUTO-DESCORCHE
// ==========================================

export interface CocktailRecipe {
  id: string;
  name: string;
  category: string;
  description: string;
  baseCategory: string; // e.g. "Ron", "Whisky", "Vodka", "Gin", "Fernet"
  defaultLiquorName: string;
  defaultDoseMl: number;
  defaultMixerId: string | null; // e.g. "p_coca_cola" for Coca Cola
  defaultMixerName: string;
}

const PRESET_COCKTAILS: CocktailRecipe[] = [
  {
    id: 'cuba_libre',
    name: 'Cuba Libre Imperial',
    category: 'Cócteles Clásicos',
    description: 'Ron Añejo, Coca Cola helada, hielo y rodaja de limón sutil.',
    baseCategory: 'Ron',
    defaultLiquorName: 'Havana Blanco',
    defaultDoseMl: 50,
    defaultMixerId: 'p_coca_cola',
    defaultMixerName: 'Coca Cola'
  },
  {
    id: 'fernet_cola',
    name: 'Fernet Branca Cola',
    category: 'Cócteles Clásicos',
    description: 'El clásico de las noches de club, Fernet Branca puro con espuma densa de Coca Cola.',
    baseCategory: 'Licor',
    defaultLiquorName: 'Fernet',
    defaultDoseMl: 60,
    defaultMixerId: 'p_coca_cola',
    defaultMixerName: 'Coca Cola'
  },
  {
    id: 'vodka_redbull',
    name: 'Vodka Energizante',
    category: 'Tragos Largos',
    description: 'Vodka Premium combinado con Red Bull para una noche de pura energía.',
    baseCategory: 'Vodka',
    defaultLiquorName: 'Vodka',
    defaultDoseMl: 50,
    defaultMixerId: 'p_red_bull',
    defaultMixerName: 'Red Bull'
  },
  {
    id: 'gin_tonic',
    name: 'Gin Tonic Botánico',
    category: 'Tragos Premium',
    description: 'Gin premium con agua tónica, bayas de enebro y cáscara de naranja.',
    baseCategory: 'Gin',
    defaultLiquorName: 'Gin',
    defaultDoseMl: 50,
    defaultMixerId: 'p_sante',
    defaultMixerName: 'Agua Tónica / Mezclador'
  },
  {
    id: 'whisky_rocks',
    name: 'Whisky en las Rocas',
    category: 'Tragos Cortos',
    description: 'Whisky Premium servido sobre una gran roca de hielo tallado sin mezcladores.',
    baseCategory: 'Whisky',
    defaultLiquorName: 'Whisky',
    defaultDoseMl: 60,
    defaultMixerId: null,
    defaultMixerName: 'Sin Mezclador'
  }
];

export function BartenderCocktails() {
  const { products, adjustStock, selectedCaja, config } = useApp();
  const currentCaja = selectedCaja || 'Caja 1';

  // State management
  const [selectedRecipe, setSelectedRecipe] = useState<CocktailRecipe>(PRESET_COCKTAILS[0]);
  const [customLiquorId, setCustomLiquorId] = useState<string>('');
  const [customMixerId, setCustomMixerId] = useState<string>('');
  const [customDoseMl, setCustomDoseMl] = useState<number>(50);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [mixStatus, setMixStatus] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<Array<{
    time: string;
    cocktailName: string;
    liquor: string;
    dose: number;
    mixer: string;
    uncorked: boolean;
  }>>([]);

  // Fetch all bottle products (liquors)
  const availableLiquors = products.filter(p => p.isActive && p.bottleConfig?.isBottle);
  // Fetch all mixers
  const availableMixers = products.filter(p => p.isActive && ((p.category || '').toLowerCase().includes('mezclador') || (p.category || '').toLowerCase().includes('refresco')));

  // Match the best products for the selected recipe
  const matchedLiquor = availableLiquors.find(p => 
    p.id === customLiquorId ||
    (p.category || '').toLowerCase() === (selectedRecipe.baseCategory || '').toLowerCase() ||
    (p.name || '').toLowerCase().includes((selectedRecipe.defaultLiquorName || '').toLowerCase())
  ) || availableLiquors[0];

  const matchedMixer = availableMixers.find(p => 
    p.id === customMixerId ||
    p.id === selectedRecipe.defaultMixerId ||
    (p.name || '').toLowerCase().includes((selectedRecipe.defaultMixerName || '').toLowerCase())
  ) || (selectedRecipe.defaultMixerId ? availableMixers[0] : null);

  // Initialize values when recipe changes
  React.useEffect(() => {
    if (matchedLiquor) setCustomLiquorId(matchedLiquor.id);
    if (matchedMixer) setCustomMixerId(matchedMixer.id);
    setCustomDoseMl(selectedRecipe.defaultDoseMl);
  }, [selectedRecipe]);

  // Read current active levels in this specific Caja
  const liquorMlInBar = matchedLiquor ? (matchedLiquor.cajaMl?.[currentCaja] ?? matchedLiquor.bottleConfig?.capacityMl ?? 750) : 0;
  const liquorBottlesInStock = matchedLiquor ? (matchedLiquor.cajaStock?.[currentCaja] ?? 0) : 0;
  const mixerStockInCaja = matchedMixer ? (matchedMixer.cajaStock?.[currentCaja] ?? 0) : 0;

  // Check if preparation will trigger an automatic bottle descorche (uncork)
  const willTriggerUncork = matchedLiquor && liquorMlInBar < customDoseMl;

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handlePrepareCocktail = async () => {
    if (!matchedLiquor) {
      alert('Debe seleccionar un licor base para poder preparar el cóctel.');
      return;
    }

    // Safety check: if uncork is needed but we have 0 full bottles in stock
    if (willTriggerUncork && liquorBottlesInStock <= 0) {
      alert(`No se puede preparar: Se requiere descorchar una nueva botella de "${matchedLiquor.name}" pero el stock en "${currentCaja}" es 0 botellas.`);
      return;
    }

    // Safety check for mixers
    if (matchedMixer && mixerStockInCaja <= 0) {
      alert(`No se puede preparar: Insumo mezclador "${matchedMixer.name}" agotado en "${currentCaja}".`);
      return;
    }

    setIsPreparing(true);
    setMixStatus('Enfriando el vaso...');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(800);
    if (!isMountedRef.current) return;
    setMixStatus('Dosificando licores de barra...');

    await delay(800);
    if (!isMountedRef.current) return;
    if (matchedMixer) {
      setMixStatus(`Añadiendo ${matchedMixer.name} helado...`);
    } else {
      setMixStatus('Aromatizando aceites de cítricos...');
    }

    await delay(800);
    if (!isMountedRef.current) return;
    setMixStatus('Completando la alquimia...');

    await delay(800);
    if (!isMountedRef.current) return;

    // Apply stock deductions
    // 1. Liquor deduction (negative mlDelta)
    adjustStock(
      matchedLiquor.id,
      0, // 0 whole units in direct command; if ml drops < 0, the backend transaction automatically subtracts 1 bottle
      MovementType.EXIT,
      `Preparación de ${selectedRecipe.name}: -${customDoseMl}ml de ${matchedLiquor.name} en ${currentCaja}`,
      -customDoseMl
    );

    // 2. Mixer deduction (whole unit)
    if (matchedMixer) {
      adjustStock(
        matchedMixer.id,
        1,
        MovementType.EXIT,
        `Preparación de ${selectedRecipe.name}: -1 lata/botella de ${matchedMixer.name} en ${currentCaja}`
      );
    }

    // Save in local session logs
    const now = new Date();
    setSessionHistory(prev => [
      {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cocktailName: selectedRecipe.name,
        liquor: `${matchedLiquor.name} (${customDoseMl}ml)`,
        dose: customDoseMl,
        mixer: matchedMixer ? matchedMixer.name : 'Sin Mezclador',
        uncorked: willTriggerUncork
      },
      ...prev
    ]);

    setIsPreparing(false);
    setMixStatus('');

    if (willTriggerUncork) {
      alert(`🎉 ¡"${selectedRecipe.name}" Servido con Éxito!\n\n💡 NOTA DE AUTO-DESCORCHE:\nLa botella anterior de "${matchedLiquor.name}" se vació. El sistema de Ambar Club ha descorchado automáticamente 1 botella del inventario físico de la "${currentCaja}", reponiendo la barra.`);
    } else {
      alert(`🍹 ¡"${selectedRecipe.name}" Servido con Éxito!\nLos insumos se restaron correctamente del stock de barra.`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="cocktails-recipe-alchemy">
      {/* Header and Explanation of the ingenious mechanism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
        <div>
          <h2 className="text-sm font-sans font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-400 animate-pulse" />
            Control de Cócteles y Descorche Automatizado
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
            Estación de alquimia inteligente de barra • Sincronización perfecta de insumos por receta
          </p>
        </div>

        {/* Dynamic Badge for active station info */}
        <div className="bg-cyan-950/40 border border-cyan-900/30 rounded-xl p-2.5 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <div className="text-left">
            <span className="text-[8px] font-mono text-zinc-500 block uppercase">Estación de Barra</span>
            <span className="text-xs font-sans font-bold text-cyan-400">{currentCaja}</span>
          </div>
        </div>
      </div>

      {/* Ingenious explanation panel */}
      <div className="bg-cyan-950/10 border border-cyan-900/20 rounded-xl p-4 flex flex-col md:flex-row items-start gap-4" id="ingenious-explanation">
        <div className="bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-900/30 flex-shrink-0 text-cyan-400">
          <Sparkles className="w-6 h-6 animate-spin-slow" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-mono font-bold text-white uppercase">¿Cómo controla Ambar Club las botellas abiertas de cócteles?</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Preparar un cóctel como <span className="text-cyan-400 font-semibold">Cuba Libre</span> implica abrir una botella de Ron (licor base) y otra de Coca-Cola (mezclador). 
            Nuestra función <strong className="text-white font-mono text-[10px] bg-zinc-900 px-1 py-0.5 rounded">Fórmula de Descorche Inteligente</strong> automatiza este control:
          </p>
          <ul className="list-disc pl-4 text-[10px] text-zinc-500 font-sans space-y-1 mt-1">
            <li>Deduce <strong className="text-zinc-300">50ml</strong> de Ron de la botella que actualmente está abierta y "en uso" en la barra de tu Caja.</li>
            <li>Si el nivel de mililitros en barra baja de cero (por ejemplo, le quedaban solo 20ml), el sistema ejecuta un <strong className="text-cyan-400 font-semibold">Auto-Descorche</strong>: descuenta instantáneamente 1 botella llena del inventario de barra y recarga la botella virtual a 750ml, absorbiendo los mililitros restantes automáticamente.</li>
            <li>Deduce exactamente <strong className="text-zinc-300">1 unidad</strong> de Coca-Cola del stock físico de mezcladores. ¡Cero mermas no justificadas!</li>
          </ul>
        </div>
      </div>

      {/* Main interface grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Cocktails Preset list */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4" id="recipes-menu">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Menú de Alquimia</h3>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">Seleccione una receta establecida</p>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {PRESET_COCKTAILS.map(recipe => {
              const isSelected = selectedRecipe.id === recipe.id;
              return (
                <div
                  key={recipe.id}
                  onClick={() => {
                    if (!isPreparing) setSelectedRecipe(recipe);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${isSelected ? 'bg-cyan-950/20 border-cyan-900/40' : 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-sans font-bold text-white">{recipe.name}</span>
                    <span className="text-[9px] font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                      {recipe.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">{recipe.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Preparing workspace & controls */}
        <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col justify-between space-y-6" id="preparation-workspace">
          <div>
            <div className="flex justify-between items-start border-b border-zinc-900 pb-3 mb-4">
              <div>
                <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/30 px-2.5 py-1 rounded-full uppercase font-bold tracking-wider">
                  Mesa de Preparación Activa
                </span>
                <h3 className="text-base font-bold text-white mt-2">{selectedRecipe.name}</h3>
                <p className="text-[10px] text-zinc-500 mt-1 font-sans">{selectedRecipe.description}</p>
              </div>
            </div>

            {/* Live Recipe Stock Verification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4" id="ingredients-stock-cards">
              
              {/* LIQUOR COMPONENT */}
              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850/50 pb-2">
                  <span className="text-xs font-sans font-bold text-white uppercase flex items-center gap-1.5">
                    <Wine className="w-3.5 h-3.5 text-cyan-400" />
                    1. Licor Base
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    {selectedRecipe.baseCategory}
                  </span>
                </div>

                {matchedLiquor ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-zinc-500">Seleccionado:</span>
                      <select
                        value={customLiquorId}
                        onChange={(e) => setCustomLiquorId(e.target.value)}
                        disabled={isPreparing}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-cyan-500"
                      >
                        {availableLiquors.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.brand})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 bg-zinc-950 p-2.5 rounded border border-zinc-900 text-[10px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Licor en Barra:</span>
                        <span className="text-white font-bold">{liquorMlInBar} ml</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Dosis Receta:</span>
                        <span className="text-cyan-400 font-bold">-{customDoseMl} ml</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-900 pt-1 mt-1">
                        <span className="text-zinc-500">Depósito ({currentCaja}):</span>
                        <span className={`font-bold ${liquorBottlesInStock === 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                          {liquorBottlesInStock} botellas llenas
                        </span>
                      </div>
                    </div>

                    {/* Interactive Uncork Warning */}
                    {willTriggerUncork && liquorBottlesInStock > 0 && (
                      <div className="bg-amber-950/20 border border-amber-900/30 rounded p-2.5 flex items-start gap-2 text-left">
                        <span className="text-amber-500 text-xs">⚠️</span>
                        <p className="text-[9px] text-amber-300 font-sans leading-snug">
                          <strong>Alerta de Descorche:</strong> Al licor abierto le quedan solo {liquorMlInBar}ml. Al pulsar preparar, se descontará automáticamente 1 botella del stock para recargar.
                        </p>
                      </div>
                    )}
                    {willTriggerUncork && liquorBottlesInStock <= 0 && (
                      <div className="bg-red-950/20 border border-red-900/30 rounded p-2.5 flex items-start gap-2 text-left">
                        <span className="text-red-500 text-xs">🚨</span>
                        <p className="text-[9px] text-red-300 font-sans leading-snug">
                          <strong>Stock Agotado:</strong> No quedan botellas llenas en stock para realizar el descorche automático. Compra o solicita mercadería al almacenero.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-mono text-center py-4">No hay licores para esta categoría.</p>
                )}
              </div>

              {/* MIXER COMPONENT */}
              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850/50 pb-2">
                  <span className="text-xs font-sans font-bold text-white uppercase flex items-center gap-1.5">
                    <CupSoda className="w-3.5 h-3.5 text-cyan-400" />
                    2. Mezclador
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">
                    Mixers / Sodas
                  </span>
                </div>

                {selectedRecipe.defaultMixerId ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-zinc-500">Seleccionado:</span>
                      <select
                        value={customMixerId}
                        onChange={(e) => setCustomMixerId(e.target.value)}
                        disabled={isPreparing}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-cyan-500"
                      >
                        {availableMixers.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.brand})</option>
                        ))}
                      </select>
                    </div>

                    {matchedMixer ? (
                      <div className="space-y-1 bg-zinc-950 p-2.5 rounded border border-zinc-900 text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Dosis Receta:</span>
                          <span className="text-cyan-400 font-bold">-1 Unidad</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-900 pt-1 mt-1">
                          <span className="text-zinc-500">Stock ({currentCaja}):</span>
                          <span className={`font-bold ${mixerStockInCaja === 0 ? 'text-red-500' : 'text-white'}`}>
                            {mixerStockInCaja} {matchedMixer.unit || 'Lata'}s
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-500 font-mono text-center py-4">Falta configurar mezclador.</p>
                    )}

                    {matchedMixer && mixerStockInCaja <= 0 && (
                      <div className="bg-red-950/20 border border-red-900/30 rounded p-2 flex items-center gap-2">
                        <span className="text-red-500 text-xs">🚨</span>
                        <p className="text-[9px] text-red-300 font-sans">El mezclador se ha agotado en tu barra.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 text-center bg-zinc-950 border border-zinc-900 rounded border-dashed">
                    <span className="text-[10px] text-zinc-500 font-mono">Sin mezclador en receta</span>
                    <span className="text-[8px] text-zinc-600 font-sans mt-0.5">Se sirve puro/on rocks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cocktail shaker shaker mixing simulator display */}
            <div className="relative border border-zinc-900 rounded-2xl h-44 flex flex-col items-center justify-center overflow-hidden bg-black/60 shadow-inner my-4" id="virtual-shaking-chamber">
              {isPreparing ? (
                <div className="space-y-4 text-center animate-pulse flex flex-col items-center justify-center">
                  {/* Virtual glass blending graphic */}
                  <div className="relative w-16 h-20 border-2 border-t-0 border-cyan-500 rounded-b-xl flex items-end overflow-hidden bg-cyan-950/10">
                    <div className="w-full bg-gradient-to-t from-orange-500 to-amber-500 h-full animate-pulse origin-bottom" style={{ animationDuration: '0.4s' }} />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 bg-cyan-400 h-full animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-cyan-400 animate-pulse uppercase tracking-widest font-bold">{mixStatus}</p>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Sincronizando mermas de Kardex en vivo...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-16 border border-t-0 border-zinc-700 rounded-b-lg mx-auto flex items-end bg-zinc-950/20">
                    <div className="w-full bg-cyan-950/20 h-1/5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-zinc-400 font-mono">Cámara de Alquimia Virtual Vacía</p>
                    <p className="text-[9px] text-zinc-600 font-mono uppercase">Seleccione licores y pulse preparar</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-left font-mono">
              <span className="text-[8px] text-zinc-500 block uppercase">Dosis a servir</span>
              <span className="text-xs font-bold text-white">{customDoseMl}ml Licor + {selectedRecipe.defaultMixerId ? '1 Mezclador' : 'Hielo puro'}</span>
            </div>

            <button
              disabled={isPreparing || !matchedLiquor || (willTriggerUncork && liquorBottlesInStock <= 0) || (matchedMixer && mixerStockInCaja <= 0)}
              onClick={handlePrepareCocktail}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-20"
            >
              <Sparkles className="w-4 h-4" />
              {isPreparing ? 'Preparando Alquimia...' : `Preparar y Descontar ${selectedRecipe.name}`}
            </button>
          </div>
        </div>
      </div>

      {/* Historical logs of preparation */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4" id="alchemy-history">
        <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Bitácora de Coctelería en Turno</h3>
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">Registro local de cócteles preparados para control de mermas</p>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2.5 py-0.5 rounded-full border border-cyan-900/20">
            {sessionHistory.length} preparados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 font-mono uppercase">
                <th className="p-3">Hora</th>
                <th className="p-3">Cóctel</th>
                <th className="p-3">Licor Consumido</th>
                <th className="p-3">Mezclador</th>
                <th className="p-3 text-center">Descorche Auto</th>
                <th className="p-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sessionHistory.map((log, idx) => (
                <tr key={idx} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 text-zinc-300 font-mono">
                  <td className="p-3 text-zinc-500">{log.time}</td>
                  <td className="p-3 text-white font-sans font-bold">{log.cocktailName}</td>
                  <td className="p-3 text-cyan-400">{log.liquor}</td>
                  <td className="p-3 text-zinc-400">{log.mixer}</td>
                  <td className="p-3 text-center">
                    {log.uncorked ? (
                      <span className="bg-amber-950/40 border border-amber-900/30 text-amber-500 text-[8px] px-2 py-0.5 rounded uppercase font-bold animate-pulse">
                        Sí (Auto)
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-[9px]">-</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/20 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold">
                      Descontado
                    </span>
                  </td>
                </tr>
              ))}
              {sessionHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-zinc-600 font-mono">
                    Ningún cóctel preparado aún mediante la estación inteligente en este turno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
