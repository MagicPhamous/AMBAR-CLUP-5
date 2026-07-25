/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { parsePaymentCategory } from '../utils/paymentUtils';
import { 
  Plus, 
  Minus, 
  Unlock, 
  Lock, 
  Activity, 
  DollarSign, 
  Clock, 
  HelpCircle,
  AlertCircle,
  RotateCcw,
  Coins
} from 'lucide-react';
import ReturnToWarehouseModal from '../components/ReturnToWarehouseModal';

export default function CashRegister() {
  const { 
    activeSession, 
    cashSessions, 
    openCashSession, 
    closeCashSession, 
    registerCashInflow, 
    registerCashOutflow, 
    config,
    selectedCaja,
    setSelectedCaja,
    currentUser,
    products,
    sales
  } = useApp();

  // Active session payment method breakdown
  const activeSessionSales = useMemo(() => {
    if (!activeSession) return { efectivo: 0, qr: 0, tarjeta: 0, transferencia: 0 };
    const sessionSales = (sales || []).filter(s => {
      const sCaja = s.cajaAsociada || 'Caja 1';
      const sTime = s.date ? new Date(s.date).getTime() : 0;
      const sessionStart = activeSession.openedAt ? new Date(activeSession.openedAt).getTime() : 0;
      return sCaja === (activeSession.cajaAsociada || selectedCaja) && sTime >= sessionStart;
    });

    let ef = 0;
    let qr = 0;
    let card = 0;
    let trans = 0;

    sessionSales.forEach(s => {
      const cat = parsePaymentCategory(s.paymentMethod);
      if (cat === 'efectivo') ef += s.total || 0;
      else if (cat === 'qr') qr += s.total || 0;
      else if (cat === 'tarjeta') card += s.total || 0;
      else if (cat === 'transferencia') trans += s.total || 0;
    });

    return { efectivo: ef, qr, tarjeta: card, transferencia: trans };
  }, [sales, activeSession, selectedCaja]);

  // Open session form
  const [openBalance, setOpenBalance] = useState(200); // 200 BOB default float
  const [openObs, setOpenObs] = useState('');

  // Close session form
  const [realBalanceCount, setRealBalanceCount] = useState(0);
  const [closeObs, setCloseObs] = useState('');

  // Manual cash flows
  const [flowType, setFlowType] = useState<'inflow' | 'outflow'>('inflow');
  const [flowAmount, setFlowAmount] = useState(0);
  const [flowObs, setFlowObs] = useState('');

  // Return to Warehouse Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCashSession(openBalance, openObs);
    setOpenObs('');
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashSession(realBalanceCount, closeObs);
    setCloseObs('');
    setRealBalanceCount(0);
  };

  const handleFlowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (flowAmount <= 0) return;

    if (flowType === 'inflow') {
      registerCashInflow(flowAmount, flowObs);
    } else {
      registerCashOutflow(flowAmount, flowObs);
    }

    setFlowAmount(0);
    setFlowObs('');
    alert(`Operación registrada: ${flowType === 'inflow' ? 'Ingreso' : 'Egreso'} por valor de ${flowAmount} ${config.currency}`);
  };

  return (
    <div className="space-y-6" id="cash-register-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Control de Caja Chica y Turnos</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">APERTURA, CIERRE, ARQUEO DE EFECTIVO Y REGISTRO DE EGRESOS</p>
        </div>

        {/* Caja Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReturnModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono rounded-xl shadow-lg shadow-amber-950/20 flex items-center gap-2 transition-all cursor-pointer"
            title="Devolver todo el stock de bebidas en caja al Almacén Central"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retorno de Productos al Almacén</span>
          </button>

          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-2 px-3.5 rounded-2xl">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Caja de Barra:</span>
            {currentUser?.role === 'Caja' ? (
              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-900/30">
                {selectedCaja}
              </span>
            ) : (
              <select
                value={selectedCaja}
                onChange={(e) => setSelectedCaja(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer hover:border-zinc-700 font-mono font-bold"
              >
                <option value="Caja 1">Caja 1</option>
                <option value="Caja 2">Caja 2</option>
                <option value="Caja 3">Caja 3</option>
                <option value="Caja 4">Caja 4</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Active Session or Form) | Right Column (Manual Operations & Shift History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="cash-register-grid">
        {/* Left Column: Active session details or Opening Form (Col span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {activeSession ? (
            /* Active Session Panel */
            <div className="bg-zinc-950 border border-emerald-900/40 rounded-2xl p-6 space-y-6 shadow-xl" id="active-session-card">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-800/30">
                    <Unlock className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-white text-sm">Sesión de Caja Activa</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">ESTADO: OPERANDO EN VIVO</p>
                  </div>
                </div>
                <span className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  Abierta
                </span>
              </div>

              {/* Grid with session details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 block uppercase">Cajero a Cargo</span>
                  <span className="text-zinc-200 font-medium block mt-1 truncate">{activeSession.userName}</span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 block uppercase">Apertura</span>
                  <span className="text-zinc-200 font-medium block mt-1">
                    {new Date(activeSession.openedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl col-span-2 md:col-span-1">
                  <span className="text-[9px] text-zinc-500 block uppercase">Fondo Inicial (Sencillo)</span>
                  <span className="text-zinc-200 font-medium block mt-1">{activeSession.openingBalance.toLocaleString()} {config.currency}</span>
                </div>
              </div>

              {/* Live Cash Flow Breakdown Card */}
              <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl space-y-4">
                <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Flujo de Fondos en Caja en Vivo</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block">(-) Egresos / Gastos</span>
                    <span className="text-red-400 font-semibold text-sm block mt-1">-{activeSession.cashOutflows.toLocaleString()} {config.currency}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">(+) Ingresos Manuales</span>
                    <span className="text-emerald-400 font-semibold text-sm block mt-1">+{activeSession.cashInflows.toLocaleString()} {config.currency}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">(+) Ventas POS Liquidadas</span>
                    <span className="text-white font-semibold text-sm block mt-1">+{activeSession.salesTotal.toLocaleString()} {config.currency}</span>
                  </div>
                </div>

                {/* Sub-breakdown of POS Sales by Payment Method */}
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-3 space-y-2">
                  <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Desglose de Ventas por Método de Pago en Turno:</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      <span className="text-zinc-500 block text-[9px]">💵 Efectivo</span>
                      <span className="font-bold text-emerald-400">Bs {activeSessionSales.efectivo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      <span className="text-zinc-500 block text-[9px]">📱 Pago QR</span>
                      <span className="font-bold text-cyan-400">Bs {activeSessionSales.qr.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      <span className="text-zinc-500 block text-[9px]">💳 Tarjeta</span>
                      <span className="font-bold text-indigo-400">Bs {activeSessionSales.tarjeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      <span className="text-zinc-500 block text-[9px]">🏦 Transferencia</span>
                      <span className="font-bold text-purple-400">Bs {activeSessionSales.transferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Final calculated Expected balance */}
                <div className="border-t border-zinc-900 pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Saldo Teórico Esperado en Caja:</span>
                    <p className="text-[9px] text-zinc-500 font-mono">Fondo inicial + ingresos - egresos + ventas</p>
                  </div>
                  <span className="text-xl font-bold font-mono text-white">
                    {activeSession.expectedBalance?.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span>
                  </span>
                </div>
              </div>

              {/* Closure Arqueo Form */}
              <form onSubmit={handleCloseSubmit} className="pt-4 border-t border-zinc-900 space-y-4" id="close-session-form">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-mono text-[10px] uppercase">Arqueo Físico (Cierre de Caja Chica)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5">Efectivo Real en Caja (Conteo Físico)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="number"
                        required
                        min="0"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono focus:outline-none focus:border-red-800"
                        placeholder="e.g. 1450"
                        value={realBalanceCount || ''}
                        onChange={(e) => setRealBalanceCount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5">Observaciones de Entrega</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-red-800"
                      placeholder="e.g. Turno cerrado sin novedades, caja cuadrada"
                      value={closeObs}
                      onChange={(e) => setCloseObs(e.target.value)}
                    />
                  </div>
                </div>

                {/* Estimate discrepancy in real-time */}
                {realBalanceCount > 0 && (
                  <div className={`p-3 rounded-xl border text-xs font-mono flex justify-between items-center ${realBalanceCount - (activeSession.expectedBalance || 0) === 0 ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' : 'bg-red-950/20 border-red-950/40 text-red-400'}`}>
                    <span>Diferencia calculada (Faltante / Sobrante):</span>
                    <span className="font-bold">
                      {realBalanceCount - (activeSession.expectedBalance || 0) > 0 ? '+' : ''}
                      {(realBalanceCount - (activeSession.expectedBalance || 0)).toFixed(2)} {config.currency}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-950 to-red-800 hover:from-red-900 hover:to-red-700 border border-red-800/50 text-white text-xs font-mono font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/40"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Proceder al Arqueo y Cerrar Turno</span>
                </button>
              </form>
            </div>
          ) : (
            /* Opening Session Form */
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-5" id="open-session-card">
              <div className="flex items-center gap-2.5 pb-4 border-b border-zinc-900">
                <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center text-red-500">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-white text-sm">Abrir Turno de Caja Chica</h3>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">SISTEMA INMOVILIZADO HASTA APERTURAR FONDO</p>
                </div>
              </div>

              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p><strong>Atención:</strong> Las operaciones del Punto de Venta (POS) y las comandas de mesas se encuentran bloqueadas hasta que declare el fondo inicial de efectivo para este turno.</p>
              </div>

              <form onSubmit={handleOpenSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Fondo Fijo Inicial / Sencillo ({config.currency})</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                      <input
                        type="number"
                        required
                        min="0"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono focus:outline-none"
                        placeholder="200"
                        value={openBalance}
                        onChange={(e) => setOpenBalance(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Notas de Apertura</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                      placeholder="e.g. Apertura Caja 1, fondo de cambio inicial"
                      value={openObs}
                      onChange={(e) => setOpenObs(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/40 transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Declarar Apertura de Caja</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Manual Cash Entries/Withdrawals Form & Shift Session History (Col span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Flows Card */}
          {activeSession && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4" id="manual-flows-card">
              <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider pb-2 border-b border-zinc-900">Operaciones Manuales (Caja Chica)</h3>
              
              <form onSubmit={handleFlowSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlowType('inflow')}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${flowType === 'inflow' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-zinc-900 text-zinc-500 border border-transparent'}`}
                  >
                    Ingreso manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowType('outflow')}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${flowType === 'outflow' ? 'bg-red-950/40 text-red-400 border border-red-800/40' : 'bg-zinc-900 text-zinc-500 border border-transparent'}`}
                  >
                    Egreso / Retiro
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Monto ({config.currency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-white font-mono focus:outline-none"
                      placeholder="100"
                      value={flowAmount || ''}
                      onChange={(e) => setFlowAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Concepto / Glosa</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-white focus:outline-none"
                      placeholder="e.g. Compra de limones bar"
                      value={flowObs}
                      onChange={(e) => setFlowObs(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Registrar Movimiento Chica
                </button>
              </form>
            </div>
          )}

          {/* Shift Cash Log Session History */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col" id="sessions-history-card">
            <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider pb-2 border-b border-zinc-900 mb-3">Historial de Turnos de {selectedCaja}</h3>
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {cashSessions.filter(s => (s.cajaAsociada || 'Caja 1') === selectedCaja).length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-600 font-mono text-xs gap-1">
                  <Clock className="w-5 h-5 text-zinc-800" />
                  <span>Ninguna sesión cerrada aún</span>
                </div>
              ) : (
                cashSessions
                  .filter(s => (s.cajaAsociada || 'Caja 1') === selectedCaja)
                  .map(sess => (
                    <div key={sess.id} className="text-xs border-b border-zinc-900/60 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-sans font-semibold text-zinc-200 block">{sess.userName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(sess.openedAt).toLocaleDateString('es-ES')} | 
                            Cierre: {sess.closedAt ? new Date(sess.closedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Inconcluso'}
                          </span>
                        </div>
                        <span className={`font-mono font-bold py-0.5 px-2 rounded text-[10px] ${sess.difference && sess.difference >= 0 ? 'bg-emerald-950/20 text-emerald-400' : 'bg-red-950/20 text-red-400'}`}>
                          Dif: {sess.difference && sess.difference > 0 ? '+' : ''}{sess.difference} {config.currency}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">Saldo inicial: {sess.openingBalance} | Total ventas: {sess.salesTotal} | Entregado: {sess.realBalance}</p>
                      {sess.observations && (
                        <p className="text-[10px] text-zinc-600 italic font-mono mt-1">Ref: {sess.observations}</p>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Return to Warehouse Modal */}
      <ReturnToWarehouseModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        defaultCaja={selectedCaja}
      />
    </div>
  );
}
