import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Sale } from '../types';
import { 
  Percent, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Filter, 
  Search, 
  Award, 
  Users,
  GlassWater,
  X,
  Eye,
  Layers,
  ChevronRight
} from 'lucide-react';

export const Commissions: React.FC = () => {
  const { sales, currentUser, employees, config } = useApp();

  // Filters state
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'CAJA' | 'MESERO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  // Selected Sale for detail modal
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  const isManagerOrAdmin = currentUser && [
    UserRole.ADMIN,
    UserRole.GERENTE,
    UserRole.SUPERVISOR,
    UserRole.AUDITOR
  ].includes(currentUser.role);

  // Date filtering logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const saleDateStr = s.date.split('T')[0];

      if (dateFilter === 'today') {
        if (saleDateStr !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (saleDateStr !== yesterdayStr) return false;
      } else if (dateFilter === 'week') {
        if (saleDate < startOfWeek) return false;
      } else if (dateFilter === 'month') {
        if (saleDate < startOfMonth) return false;
      }

      return true;
    });
  }, [sales, dateFilter]);

  // Employee commission aggregation
  const staffCommissions = useMemo(() => {
    const map: Record<string, {
      id: string;
      name: string;
      role: string;
      salesCount: number;
      totalSalesVolume: number;
      cashierCommission: number;
      waiterCommission: number;
      totalCommission: number;
    }> = {};

    const getOrInit = (id: string, defaultName: string, defaultRole: string) => {
      if (!map[id]) {
        map[id] = {
          id,
          name: defaultName,
          role: defaultRole,
          salesCount: 0,
          totalSalesVolume: 0,
          cashierCommission: 0,
          waiterCommission: 0,
          totalCommission: 0
        };
      }
      return map[id];
    };

    filteredSales.forEach(sale => {
      const saleTotal = sale.total || 0;
      const cashierComm = sale.cashierCommission !== undefined ? sale.cashierCommission : Number((saleTotal * 0.01).toFixed(2));
      const waiterComm = sale.waiterCommission !== undefined ? sale.waiterCommission : (sale.waiterId ? Number((saleTotal * 0.01).toFixed(2)) : 0);

      // Cashier
      if (sale.userId) {
        const entry = getOrInit(sale.userId, sale.userName || 'Cajero', 'Caja');
        entry.salesCount += 1;
        entry.totalSalesVolume += saleTotal;
        entry.cashierCommission += cashierComm;
        entry.totalCommission += cashierComm;
      }

      // Waiter
      if (sale.waiterId) {
        const waiterEmp = employees.find(e => e.id === sale.waiterId);
        const waiterName = sale.waiterName || waiterEmp?.name || 'Mesero';
        const entry = getOrInit(sale.waiterId, waiterName, 'Mesero');
        entry.salesCount += 1;
        entry.totalSalesVolume += saleTotal;
        entry.waiterCommission += waiterComm;
        entry.totalCommission += waiterComm;
      }
    });

    let result = Object.values(map);

    if (selectedRoleFilter !== 'ALL') {
      result = result.filter(r => (r.role || '').toLowerCase().includes(selectedRoleFilter.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => (r.name || '').toLowerCase().includes(q));
    }

    return result.sort((a, b) => b.totalCommission - a.totalCommission);
  }, [filteredSales, employees, selectedRoleFilter, searchQuery]);

  // My Personal Commission Data & Sales
  const myCommissions = useMemo(() => {
    if (!currentUser) return { salesCount: 0, volume: 0, comm: 0, mySales: [] };

    const myUid = currentUser.uid;
    const myName = currentUser.name;

    const mySales = filteredSales.filter(s => 
      s.userId === myUid || 
      s.waiterId === myUid || 
      (s.userName && s.userName.toLowerCase() === myName.toLowerCase())
    );

    let volume = 0;
    let comm = 0;

    mySales.forEach(s => {
      volume += s.total;
      let saleComm = 0;
      const isWaiter = s.waiterId === myUid;
      const isCashier = (s.userId === myUid || (s.userName && s.userName.toLowerCase() === myName.toLowerCase())) && !isWaiter;

      if (isWaiter) {
        saleComm += s.waiterCommission !== undefined ? s.waiterCommission : Number((s.total * 0.01).toFixed(2));
      } else if (isCashier) {
        saleComm += s.cashierCommission !== undefined ? s.cashierCommission : Number((s.total * 0.01).toFixed(2));
      }
      comm += saleComm;
    });

    return {
      salesCount: mySales.length,
      volume,
      comm: Number(comm.toFixed(2)),
      mySales
    };
  }, [filteredSales, currentUser]);

  // Aggregated Product/Drink Breakdown for currently logged in employee
  const myProductBreakdown = useMemo(() => {
    if (!currentUser) return [];

    const myUid = currentUser.uid;
    const myName = currentUser.name;

    const map: Record<string, { productName: string; totalQty: number; totalVolume: number; totalComm: number }> = {};

    myCommissions.mySales.forEach(s => {
      const isCashier = s.userId === myUid || (s.userName && s.userName.toLowerCase() === myName.toLowerCase());
      const isWaiter = s.waiterId === myUid;

      s.items.forEach(it => {
        if (!map[it.productName]) {
          map[it.productName] = { productName: it.productName, totalQty: 0, totalVolume: 0, totalComm: 0 };
        }
        map[it.productName].totalQty += it.quantity;
        map[it.productName].totalVolume += it.subtotal;

        let itemComm = 0;
        if (isCashier) itemComm += it.subtotal * 0.01;
        if (isWaiter) itemComm += it.subtotal * 0.01;
        
        map[it.productName].totalComm += itemComm;
      });
    });

    let list = Object.values(map);

    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      list = list.filter(p => (p.productName || '').toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.totalComm - a.totalComm);
  }, [myCommissions, currentUser, productSearchQuery]);

  // Global Product/Drink Breakdown for Managers
  const globalProductBreakdown = useMemo(() => {
    const map: Record<string, { productName: string; totalQty: number; totalVolume: number; totalCommGenerated: number }> = {};

    filteredSales.forEach(s => {
      s.items.forEach(it => {
        if (!map[it.productName]) {
          map[it.productName] = { productName: it.productName, totalQty: 0, totalVolume: 0, totalCommGenerated: 0 };
        }
        map[it.productName].totalQty += it.quantity;
        map[it.productName].totalVolume += it.subtotal;
        
        // 1% for cashier + 1% for waiter if assigned = up to 2% generated total
        const multiplier = s.waiterId ? 0.02 : 0.01;
        map[it.productName].totalCommGenerated += it.subtotal * multiplier;
      });
    });

    let list = Object.values(map);

    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      list = list.filter(p => (p.productName || '').toLowerCase().includes(q));
    }

    return list.sort((a, b) => b.totalCommGenerated - a.totalCommGenerated);
  }, [filteredSales, productSearchQuery]);

  // Overall totals for managers
  const overallTotals = useMemo(() => {
    let totalSalesVol = 0;
    let totalCashierComm = 0;
    let totalWaiterComm = 0;

    filteredSales.forEach(s => {
      totalSalesVol += s.total;
      const cComm = s.cashierCommission !== undefined ? s.cashierCommission : Number((s.total * 0.01).toFixed(2));
      const wComm = s.waiterCommission !== undefined ? s.waiterCommission : (s.waiterId ? Number((s.total * 0.01).toFixed(2)) : 0);

      totalCashierComm += cComm;
      totalWaiterComm += wComm;
    });

    return {
      totalSalesCount: filteredSales.length,
      totalSalesVol,
      totalCashierComm: Number(totalCashierComm.toFixed(2)),
      totalWaiterComm: Number(totalWaiterComm.toFixed(2)),
      grandTotalComm: Number((totalCashierComm + totalWaiterComm).toFixed(2))
    };
  }, [filteredSales]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
            <Percent className="w-4 h-4" />
            <span>Módulo de Comisiones y Bonificaciones</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-sans">
            Comisiones por Venta (1%)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cajeros y Meseros devengan un 1% de comisión fija sobre cada tragos y productos vendidos.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-amber-500 ml-1.5 mr-0.5" />
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'all', label: 'Histórico' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                dateFilter === f.id
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* PERSONAL COMMISSION PANEL FOR CASHIER / WAITER */}
      {!isManagerOrAdmin && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-3 right-3 p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Mi Comisión Acumulada (1%)
              </span>
              <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {myCommissions.comm.toLocaleString()} <span className="text-sm font-normal text-zinc-400">{config.currency}</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-2 block">
                Calculado sobre {myCommissions.salesCount} venta(s) atendida(s)
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Ventas Procesadas por Mí
              </span>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">
                {myCommissions.salesCount} <span className="text-xs text-zinc-500 font-normal">transacciones</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Monto Total Vendido
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
                {myCommissions.volume.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">{config.currency}</span>
              </div>
            </div>
          </div>

          {/* DETALLE DE COMISIONES POR TRAGO / PRODUCTO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <GlassWater className="w-4 h-4 text-amber-500" />
                  <span>¿De qué tragos y productos ganaste tus comisiones?</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Desglose consolidado de la comisión del 1% calculada por cada producto vendido.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar trago o producto..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {myProductBreakdown.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                No hay productos o tragos registrados en tu rango de fechas seleccionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Producto / Trago</th>
                      <th className="py-2.5 px-3 text-center">Unidades Vendidas</th>
                      <th className="py-2.5 px-3 text-right">Monto Total ($)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-400">Tu Comisión (1%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {myProductBreakdown.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <GlassWater className="w-3.5 h-3.5 text-amber-500" />
                          <span>{prod.productName}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-300 font-bold">
                          {prod.totalQty} un.
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400">
                          {prod.totalVolume.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold text-sm bg-emerald-950/20">
                          +{prod.totalComm.toFixed(2)} {config.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* List of my sales with View Items Button */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Transacciones e Historial de Ventas Directas</span>
            </h2>

            {myCommissions.mySales.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                No hay ventas registradas a tu nombre en este rango de fechas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Ticket</th>
                      <th className="py-2.5 px-3 text-right">Monto Venta</th>
                      <th className="py-2.5 px-3 text-right">Mi Comisión (1%)</th>
                      <th className="py-2.5 px-3">Rol</th>
                      <th className="py-2.5 px-3 text-center">Detalle Tragos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {myCommissions.mySales.map(s => {
                      const isWaiter = s.waiterId === currentUser?.uid;
                      const isCashier = (s.userId === currentUser?.uid || (s.userName && s.userName.toLowerCase() === currentUser?.name?.toLowerCase())) && !isWaiter;

                      let myCommForThisSale = 0;
                      if (isWaiter) {
                        myCommForThisSale += (s.waiterCommission !== undefined ? s.waiterCommission : Number((s.total * 0.01).toFixed(2)));
                      } else if (isCashier) {
                        myCommForThisSale += (s.cashierCommission !== undefined ? s.cashierCommission : Number((s.total * 0.01).toFixed(2)));
                      }

                      return (
                        <tr key={s.id} className="hover:bg-zinc-800/40">
                          <td className="py-3 px-3 text-zinc-400">
                            {new Date(s.date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">{s.ticketNumber}</td>
                          <td className="py-3 px-3 text-right text-amber-400 font-bold">
                            {s.total.toLocaleString()} {config.currency}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                            +{myCommForThisSale.toFixed(2)} {config.currency}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex gap-1">
                              {isWaiter && <span className="bg-blue-950/80 text-blue-400 text-[10px] px-2 py-0.5 rounded border border-blue-800/50">Mesero</span>}
                              {isCashier && <span className="bg-amber-950/80 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-800/50">Cajero</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedSaleDetail(s)}
                              className="bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-[11px] px-2.5 py-1 rounded-lg transition-colors font-sans font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver Ítems ({s.items?.length || 0})</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGER / ADMIN FULL CONTROL DASHBOARD */}
      {isManagerOrAdmin && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Monto Total de Ventas</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {overallTotals.totalSalesVol.toLocaleString()} <span className="text-xs font-normal text-zinc-500">{config.currency}</span>
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                {overallTotals.totalSalesCount} transacciones en período
              </span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Comisiones Cajeros (1%)</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {overallTotals.totalCashierComm.toLocaleString()} <span className="text-xs font-normal text-zinc-500">{config.currency}</span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider">Comisiones Meseros (1%)</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-400">
                {overallTotals.totalWaiterComm.toLocaleString()} <span className="text-xs font-normal text-zinc-500">{config.currency}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Comisiones a Liquidar</span>
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {overallTotals.grandTotalComm.toLocaleString()} <span className="text-xs font-normal text-emerald-500/80">{config.currency}</span>
              </div>
              <span className="text-[10px] text-emerald-400/70 mt-1 block font-mono">
                Suma total devengada por personal
              </span>
            </div>
          </div>

          {/* Manager Ranking of Products/Drinks generating commissions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <GlassWater className="w-4 h-4 text-amber-500" />
                  <span>Ranking Global de Tragos y Productos por Comisión Generada</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Auditoría general de qué productos aportaron mayor comisión al personal de caja y meseros.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar trago o producto..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {globalProductBreakdown.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                No hay registro de venta de productos en el período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Producto / Trago</th>
                      <th className="py-2.5 px-3 text-center">Unidades Totales</th>
                      <th className="py-2.5 px-3 text-right">Monto Recaudado ($)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-400">Comisión Total Generada (1%-2%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {globalProductBreakdown.slice(0, 15).map((prod, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <span className="text-[10px] text-amber-500/80 font-bold font-mono">#{idx + 1}</span>
                          <span>{prod.productName}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-300 font-bold">
                          {prod.totalQty} un.
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400">
                          {prod.totalVolume.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold text-sm bg-emerald-950/20">
                          {prod.totalCommGenerated.toFixed(2)} {config.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Search & Filter Controls for Staff */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar empleado por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Rol:
              </span>
              <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'CAJA', label: 'Cajeros' },
                  { id: 'MESERO', label: 'Meseros' }
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleFilter(r.id as any)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      selectedRoleFilter === r.id
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Commission Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Liquidación de Comisiones por Personal</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono font-normal">
                {staffCommissions.length} empleado(s) con ventas
              </span>
            </h2>

            {staffCommissions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
                No se encontraron registros de ventas con comisión para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Personal</th>
                      <th className="py-2.5 px-3">Rol Principal</th>
                      <th className="py-2.5 px-3 text-center">Atenciones / Ventas</th>
                      <th className="py-2.5 px-3 text-right">Volumen Vendido</th>
                      <th className="py-2.5 px-3 text-right">Comisión Cajero (1%)</th>
                      <th className="py-2.5 px-3 text-right">Comisión Mesero (1%)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-400">Total Comisión Ganada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {staffCommissions.map(staff => (
                      <tr key={staff.id} className="hover:bg-zinc-800/40">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{staff.name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            (staff.role || '').toLowerCase().includes('caja')
                              ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                              : 'bg-blue-950/60 text-blue-400 border-blue-800/50'
                          }`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-300">
                          {staff.salesCount}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400 font-bold">
                          {staff.totalSalesVolume.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-400">
                          {staff.cashierCommission > 0 ? `${staff.cashierCommission.toLocaleString()} ${config.currency}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-400">
                          {staff.waiterCommission > 0 ? `${staff.waiterCommission.toLocaleString()} ${config.currency}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold text-sm bg-emerald-950/20">
                          {staff.totalCommission.toLocaleString()} {config.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-700 font-bold text-white bg-zinc-950/80">
                      <td className="py-3 px-3" colSpan={2}>TOTALES GENERALES</td>
                      <td className="py-3 px-3 text-center text-zinc-400">{filteredSales.length}</td>
                      <td className="py-3 px-3 text-right text-amber-400">{overallTotals.totalSalesVol.toLocaleString()} {config.currency}</td>
                      <td className="py-3 px-3 text-right text-zinc-300">{overallTotals.totalCashierComm.toLocaleString()} {config.currency}</td>
                      <td className="py-3 px-3 text-right text-zinc-300">{overallTotals.totalWaiterComm.toLocaleString()} {config.currency}</td>
                      <td className="py-3 px-3 text-right text-emerald-400 text-sm">{overallTotals.grandTotalComm.toLocaleString()} {config.currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Sales Transaction Log with Commission Audit */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Auditoría de Ventas y Registro de Comisiones</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {filteredSales.length} venta(s) auditadas
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Nº Ticket</th>
                    <th className="py-2.5 px-3">Cajero (1%)</th>
                    <th className="py-2.5 px-3">Mesero (1%)</th>
                    <th className="py-2.5 px-3 text-right">Monto Venta</th>
                    <th className="py-2.5 px-3 text-right">Comisión Cajero</th>
                    <th className="py-2.5 px-3 text-right">Comisión Mesero</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredSales.slice(0, 50).map(s => {
                    const cComm = s.cashierCommission !== undefined ? s.cashierCommission : Number((s.total * 0.01).toFixed(2));
                    const wComm = s.waiterCommission !== undefined ? s.waiterCommission : (s.waiterId ? Number((s.total * 0.01).toFixed(2)) : 0);

                    return (
                      <tr key={s.id} className="hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                          {new Date(s.date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{s.ticketNumber}</td>
                        <td className="py-2.5 px-3 text-zinc-300">{s.userName || 'Sistema'}</td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {s.waiterName || (s.waiterId ? employees.find(e => e.id === s.waiterId)?.name : 'N/A')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                          {s.total.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                          +{cComm.toFixed(2)} {config.currency}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-400 font-medium">
                          {wComm > 0 ? `+${wComm.toFixed(2)} ${config.currency}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setSelectedSaleDetail(s)}
                            className="bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-[10px] px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Ítems</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR TICKET ITEMS & COMMISSIONS */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedSaleDetail(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Detalle de Ticket: {selectedSaleDetail.ticketNumber}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Fecha: {new Date(selectedSaleDetail.date).toLocaleString('es-BO')}
                </p>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl text-xs font-mono border border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Cajero:</span>
                <span className="text-white font-semibold">{selectedSaleDetail.userName || 'Sistema'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Mesero:</span>
                <span className="text-white font-semibold">
                  {selectedSaleDetail.waiterName || (selectedSaleDetail.waiterId ? employees.find(e => e.id === selectedSaleDetail.waiterId)?.name : 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Monto Total:</span>
                <span className="text-amber-400 font-bold">{selectedSaleDetail.total.toFixed(2)} {config.currency}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase">Notas / Observación:</span>
                <span className="text-zinc-300">{selectedSaleDetail.description || 'Sin notas'}</span>
              </div>
            </div>

            {/* List of Drinks / Items in this Sale */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block font-mono flex items-center gap-1.5">
                <GlassWater className="w-4 h-4 text-amber-500" />
                <span>Tragos y Productos Vendidos en esta Transacción:</span>
              </span>

              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Producto / Trago</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">Precio</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-right text-emerald-400">Comisión 1%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {(selectedSaleDetail.items || []).map((it, idx) => {
                      const itemComm = Number((it.subtotal * 0.01).toFixed(2));
                      return (
                        <tr key={idx} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 font-semibold text-white">{it.productName}</td>
                          <td className="py-2.5 px-3 text-center text-zinc-200 font-bold">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-zinc-400">{it.price.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-amber-400 font-medium">{it.subtotal.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">+{itemComm.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-950 font-bold text-white text-xs border-t border-zinc-800">
                      <td colSpan={3} className="py-2.5 px-3">TOTAL TICKET</td>
                      <td className="py-2.5 px-3 text-right text-amber-400">{selectedSaleDetail.total.toFixed(2)} {config.currency}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">
                        +{(selectedSaleDetail.total * 0.01).toFixed(2)} {config.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
