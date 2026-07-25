/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TableStatus } from '../types';
import { 
  Search, 
  Wine, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Utensils, 
  ChevronRight, 
  CheckCircle2, 
  Activity,
  Heart,
  Calendar,
  Bell,
  Check,
  User,
  ShoppingBag
} from 'lucide-react';

export function WaiterMenu() {
  const { products, categories, config, tables, updateTableStatus } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const reservedTables = tables.filter(t => t.status === TableStatus.RESERVED);

  const filteredProducts = products.filter(p => {
    if (!p.isActive) return false;
    const matchesCategory = activeCategory === 'Todas' || p.category === activeCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.internalCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5 animate-fade-in" id="waiter-menu-panel">
      {/* Reservations Banner for Waiters */}
      {reservedTables.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-zinc-950 to-zinc-950 border border-amber-900/50 p-4 rounded-xl space-y-3" id="waiter-reservations-banner">
          <div className="flex items-center justify-between border-b border-amber-900/30 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold text-amber-400 uppercase">
                Reservaciones Activas ({reservedTables.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Atención Meseros</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reservedTables.map(resTab => (
              <div 
                key={resTab.id}
                className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-lg space-y-2 text-xs font-mono"
              >
                <div className="flex justify-between items-start">
                  <span className="bg-amber-950 text-amber-400 border border-amber-900/40 text-[10px] font-bold px-2 py-0.5 rounded">
                    Mesa {resTab.number} (Piso {resTab.floor || 0})
                  </span>
                  <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {resTab.reservationDate || 'Hoy'} {resTab.reservationTime || '22:00'}
                  </span>
                </div>

                <div className="text-zinc-300 font-sans text-xs">
                  <span className="font-semibold text-white">{resTab.reservationClient || 'Cliente Anónimo'}</span>
                  <span className="text-zinc-500 text-[10px] block font-mono">{resTab.reservationPeople || 4} Pax • Cover: {resTab.reservationCoverPaid || 0} {config.currency}</span>
                </div>

                {resTab.reservationPaymentVerified ? (
                  <span className="inline-block bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                    ✓ PAGO VERIFICADO EN CAJA
                  </span>
                ) : (
                  <span className="inline-block bg-amber-950 text-amber-400 border border-amber-800/40 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                    ⏳ PENDIENTE VERIFICAR CAJA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Search and Filters */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center" id="menu-search-bar">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar bebida o trago..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar" id="menu-cat-carousel">
          <button
            onClick={() => setActiveCategory('Todas')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-mono whitespace-nowrap border transition-colors cursor-pointer ${activeCategory === 'Todas' ? 'bg-red-950/40 border-red-900/40 text-red-400 font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'}`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-mono whitespace-nowrap border transition-colors cursor-pointer ${activeCategory === cat.name ? 'bg-red-950/40 border-red-900/40 text-red-400 font-bold' : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="waiter-menu-grid">
        {filteredProducts.map(prod => {
          const isBottle = prod.bottleConfig?.isBottle;
          const isLowStock = prod.quantity <= prod.minStock;

          return (
            <div 
              key={prod.id}
              className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-all group relative overflow-hidden"
              id={`prod-card-${prod.id}`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-850 uppercase">
                    {prod.category}
                  </span>
                  {isLowStock && (
                    <span className="text-[8px] font-mono bg-amber-950/30 text-amber-500 border border-amber-900/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      Stock Bajo
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-sans font-medium text-white tracking-wide group-hover:text-red-400 transition-colors">
                  {prod.name}
                </h3>
                
                {prod.brand && (
                  <p className="text-[10px] font-mono text-zinc-500">Marca: {prod.brand}</p>
                )}
              </div>

              {/* Price Tag with modern styling */}
              <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">PRECIO FINAL</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {prod.price.toFixed(2)} {config.currency}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">DISPONIBLE</span>
                  <span className={`text-[11px] font-mono font-bold ${prod.quantity === 0 ? 'text-red-500' : 'text-zinc-300'}`}>
                    {prod.quantity} {prod.unit || 'uds'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-12 text-center bg-zinc-950 rounded-xl border border-zinc-900" id="no-menu-results">
            <p className="text-xs text-zinc-500 font-mono">No se encontraron productos en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function WaiterCommissions() {
  const { currentUser, sales, employees, config } = useApp();

  // Try to find the matching employee in seeds
  const currentEmployee = employees.find(e => 
    (e.name || '').toLowerCase().includes((currentUser?.name || '').toLowerCase()) ||
    e.role === currentUser?.role
  ) || {
    name: currentUser?.name || 'Mesero Activo',
    comissionsRate: 0.05,
    salesCount: 12,
    totalSalesValue: 2450,
    totalComissions: 122.5
  };

  // Calculate live sales where this user is logged or associated
  const mySalesThisSession = sales.filter(s => s.userId === currentUser?.uid || s.userName === currentUser?.name);
  const liveSalesValue = mySalesThisSession.reduce((acc, s) => acc + s.total, 0);
  const liveCommissions = Number((liveSalesValue * currentEmployee.comissionsRate).toFixed(2));

  return (
    <div className="space-y-6 animate-fade-in" id="waiter-commissions-panel">
      {/* Top Welcome Stats summary card */}
      <div className="bg-zinc-955 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden" id="waiter-hero">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Turno Activo y Sincronizado</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{currentEmployee.name}</h2>
            <p className="text-xs text-zinc-400 max-w-md">
              Tu comisión configurada es del <span className="text-red-400 font-bold font-mono">{(currentEmployee.comissionsRate * 100)}%</span> sobre cada venta de mesa o VIP Lounge que atiendas y cobres en el sistema.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-900 rounded-xl" id="commission-brief">
            <div className="text-center md:text-left pr-4 border-r border-zinc-900">
              <span className="text-[8px] font-mono text-zinc-500 uppercase block">VENTAS HOY</span>
              <span className="text-lg font-mono font-bold text-white">{currentEmployee.salesCount + mySalesThisSession.length}</span>
            </div>
            <div className="text-center md:text-left pl-2">
              <span className="text-[8px] font-mono text-zinc-500 uppercase block">COMISIÓN TOT.</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {(currentEmployee.totalComissions + liveCommissions).toFixed(2)} {config.currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="waiter-kpis">
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-zinc-400">Ingresos Totales Asistidos</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-mono font-black text-white">
              {(currentEmployee.totalSalesValue + liveSalesValue).toFixed(2)} <span className="text-xs font-sans text-zinc-500">{config.currency}</span>
            </p>
            <p className="text-[10px] text-zinc-500 font-sans">
              Suma de comandas facturadas vinculadas a tu código.
            </p>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-zinc-400">Mi Incentivo de Turno</span>
            <Award className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-mono font-black text-emerald-400">
              {(currentEmployee.totalComissions + liveCommissions).toFixed(2)} <span className="text-xs font-sans text-zinc-500">{config.currency}</span>
            </p>
            <p className="text-[10px] text-zinc-500 font-sans">
              Liquidación acumulada de comisiones del día.
            </p>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-zinc-400">Rendimiento Estimado</span>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-mono font-black text-zinc-200">
              {mySalesThisSession.length > 0 ? (liveSalesValue / mySalesThisSession.length).toFixed(1) : '245.0'} <span className="text-xs font-sans text-zinc-500">{config.currency} / mesa</span>
            </p>
            <p className="text-[10px] text-zinc-500 font-sans">
              Ticket promedio por mesa atendida.
            </p>
          </div>
        </div>
      </div>

      {/* Sales list generated by this Waiter */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4" id="waiter-sales-history">
        <div>
          <h3 className="text-sm font-sans font-semibold text-white uppercase tracking-wider">Historial de Mesas Atendidas en este Turno</h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">Últimas transacciones facturadas con éxito</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs" id="waiter-sales-table">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500">
                <th className="pb-3 font-semibold uppercase">Ticket No.</th>
                <th className="pb-3 font-semibold uppercase">Fecha / Hora</th>
                <th className="pb-3 font-semibold uppercase">Mesa ID</th>
                <th className="pb-3 font-semibold uppercase text-right">Monto Total</th>
                <th className="pb-3 font-semibold uppercase text-right text-emerald-500">Tu Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 text-zinc-300">
              {mySalesThisSession.map(sale => (
                <tr key={sale.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3 font-semibold text-white">{sale.ticketNumber}</td>
                  <td className="py-3 text-zinc-400">{new Date(sale.date).toLocaleTimeString()}</td>
                  <td className="py-3">
                    <span className="bg-red-950/20 text-red-400 border border-red-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      {sale.tableId ? `Mesa ${sale.tableId.toUpperCase()}` : 'POS / VIP'}
                    </span>
                  </td>
                  <td className="py-3 text-right text-white font-semibold">{sale.total.toFixed(2)} {config.currency}</td>
                  <td className="py-3 text-right text-emerald-400 font-bold">{(sale.total * currentEmployee.comissionsRate).toFixed(2)} {config.currency}</td>
                </tr>
              ))}

              {mySalesThisSession.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Aún no has facturado mesas en esta sesión de caja activa. Abre mesas en "Mesas y VIP Lounges" para comenzar.
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
