/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Wine, 
  ChevronRight, 
  Plus, 
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { sales, products, activeSession, config, employees, clients } = useApp();

  // --- CALCULATE SYSTEM METRICS ---
  
  // Calculate profits based on cost margins: (Price - Cost) * Quantity Sold
  // For demonstration, let's process sales.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();

  // Filter sales
  const todaySales = sales.filter(s => new Date(s.date).getTime() >= startOfToday);
  const monthSales = sales.filter(s => new Date(s.date).getTime() >= startOfThisMonth);
  const yearSales = sales.filter(s => new Date(s.date).getTime() >= startOfThisYear);

  const dailySalesSum = todaySales.reduce((acc, s) => acc + s.total, 0);
  const monthlySalesSum = monthSales.reduce((acc, s) => acc + s.total, 0);
  const annualSalesSum = yearSales.reduce((acc, s) => acc + s.total, 0);

  // Calculate gross profits (Sales value - cost value of items sold)
  const getSaleProfit = (sale: typeof sales[0]) => {
    let costTotal = 0;
    sale.items.forEach(it => {
      const matchProd = products.find(p => p.id === it.productId);
      if (matchProd) {
        costTotal += (matchProd.cost * it.quantity);
      } else {
        costTotal += (it.price * 0.4 * it.quantity); // fallback
      }
    });
    return Math.max(0, sale.total - costTotal);
  };

  const dailyProfitSum = todaySales.reduce((acc, s) => acc + getSaleProfit(s), 0);
  const monthlyProfitSum = monthSales.reduce((acc, s) => acc + getSaleProfit(s), 0);
  const annualProfitSum = yearSales.reduce((acc, s) => acc + getSaleProfit(s), 0);

  // Products with low stock (below minStock)
  const lowStockProducts = products.filter(p => p.isActive && p.quantity <= p.minStock);

  // --- RECHARTS ANALYTICS PREPARATION ---

  // Chart 1: Sales timeline for the last 7 days
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const last7DaysData = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(now.getDate() - (6 - idx));
    const dStr = d.toDateString();
    
    const daySales = sales.filter(s => new Date(s.date).toDateString() === dStr);
    const sum = daySales.reduce((acc, s) => acc + s.total, 0);
    const profit = daySales.reduce((acc, s) => acc + getSaleProfit(s), 0);
    
    return {
      name: dayNames[d.getDay()],
      Ventas: sum,
      Ganancia: profit
    };
  });

  // Chart 2: Category Breakdown (Pie Chart)
  const categorySalesMap: { [key: string]: number } = {};
  sales.forEach(sale => {
    sale.items.forEach(it => {
      const p = products.find(prod => prod.id === it.productId);
      const cat = p?.category || 'Otros';
      categorySalesMap[cat] = (categorySalesMap[cat] || 0) + it.subtotal;
    });
  });

  const categoryChartData = Object.keys(categorySalesMap).map(key => ({
    name: key,
    value: categorySalesMap[key]
  }));

  const COLORS = ['#991b1b', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#3f3f46', '#18181b', '#27272a'];

  // Chart 3: Top Employees by Sales Count
  const topEmployeesData = [...employees]
    .sort((a, b) => b.totalSalesValue - a.totalSalesValue)
    .slice(0, 5)
    .map(e => ({
      name: e.name,
      Ventas: e.totalSalesValue,
      salesCount: e.salesCount || 0
    }));

  // Top Customers (Loyalty points)
  const topClients = [...clients]
    .sort((a, b) => b.points - a.points)
    .slice(0, 4);

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5" id="dash-header">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Panel General de Operación</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">SISTEMA INTEGRADO DE CONTROL AMBAR CLUB • SANTA CRUZ DE LA SIERRA</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3" id="dash-header-actions">
          <div className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 ${activeSession ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
            <span className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {activeSession ? `Caja Abierta (Cajero: ${activeSession.userName})` : 'Caja Cerrada - Abrir Turno'}
          </div>
          <span className="text-xs text-zinc-500 font-mono bg-zinc-900 px-3 py-1.5 rounded-lg">
            {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Critical Alert Banner if cash box or stocks need attention */}
      {(lowStockProducts.length > 0 || !activeSession) && (
        <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4" id="alert-banner">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-sans font-medium text-red-200">Alertas del Sistema que requieren atención inmediata</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lowStockProducts.length > 0 ? `Hay ${lowStockProducts.length} productos operando por debajo del stock mínimo. ` : ''}
                {!activeSession ? 'La sesión de caja del día de hoy no ha sido iniciada. Ventas POS no permitidas.' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {lowStockProducts.length > 0 && (
              <a href="#/inventory" className="text-xs font-mono bg-red-900/40 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg border border-red-800/40 transition-colors">
                Abastecer Inventario
              </a>
            )}
            {!activeSession && (
              <a href="#/cash" className="text-xs font-mono bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                Abrir Caja
              </a>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-grid">
        {/* Metric 1 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-red-950 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ventas de Hoy</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {dailySalesSum.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span>
              </h3>
            </div>
            <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-red-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span>Ganancia hoy: <strong className="text-white">{dailyProfitSum.toLocaleString()} {config.currency}</strong></span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-red-950 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ventas del Mes</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {monthlySalesSum.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span>
              </h3>
            </div>
            <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-red-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span>Ganancia mes: <strong className="text-white">{monthlyProfitSum.toLocaleString()} {config.currency}</strong></span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-red-950 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Productos de Alerta</p>
              <h3 className={`text-2xl font-bold mt-1 ${lowStockProducts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {lowStockProducts.length} <span className="text-xs text-zinc-500 font-normal">items</span>
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lowStockProducts.length > 0 ? 'bg-red-950/20 text-red-500' : 'bg-zinc-900 text-zinc-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Total catálogo: <strong className="text-white">{products.length} productos</strong></span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-red-950 transition-all shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Clientes Loyalty VIP</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {clients.length} <span className="text-xs text-red-500 font-normal">VIPs</span>
              </h3>
            </div>
            <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-red-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Total empleados: <strong className="text-white">{employees.length} activos</strong></span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-grid">
        {/* Main Sales Trend Area Chart */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-sans font-medium text-white uppercase tracking-wider">Historial de Ventas Semanal</h3>
              <p className="text-[10px] text-zinc-500 font-mono">DÍAS DE OPERACIÓN ANTERIORES (CONSOLIDACIÓN DE INGRESOS)</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          </div>
          <div className="flex-1 min-h-0" id="sales-timeline-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#18181b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={11} fontFamily="monospace" />
                <YAxis stroke="#52525b" fontSize={11} fontFamily="monospace" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  labelClassName="font-mono text-zinc-400"
                />
                <Area type="monotone" dataKey="Ventas" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex flex-col h-[350px]">
          <h3 className="text-sm font-sans font-medium text-white uppercase tracking-wider mb-4">Ventas por Categoría</h3>
          <div className="flex-1 flex flex-col justify-center min-h-0" id="category-pie-chart-container">
            {categoryChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs">
                <Wine className="w-8 h-8 text-zinc-800 mb-2" />
                <p>No hay ventas registradas aún</p>
              </div>
            ) : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono max-h-[80px] overflow-y-auto pr-1">
                  {categoryChartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate">{item.name}: <strong className="text-white">{item.value} {config.currency}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Sub-sections (Lists / Top Performers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="details-grid">
        {/* Recent sales lists */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col" id="recent-sales-widget">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
            <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">Últimas Ventas Realizadas</h3>
            <span className="text-[10px] text-zinc-500 font-mono">Últimos {sales.slice(0, 5).length} tickets</span>
          </div>
          <div className="space-y-3.5 flex-1 max-h-[280px] overflow-y-auto pr-1">
            {sales.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-zinc-600 text-xs font-mono">
                Ninguna venta en esta sesión
              </div>
            ) : (
              sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex justify-between items-start text-xs border-b border-zinc-900/60 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-200">
                      <span className="font-mono text-[10px] text-red-500 font-semibold">{sale.ticketNumber}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({sale.paymentMethod})</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">Atendió: {sale.userName}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-white font-medium">{sale.total.toLocaleString()} {config.currency}</span>
                    <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
                      {new Date(sale.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Promoters / Employee commissions sales */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col" id="top-waiters-widget">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
            <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">Top Vendedores de la Noche</h3>
            <span className="text-[10px] text-zinc-500 font-mono">Por total vendido</span>
          </div>
          <div className="space-y-4 flex-1 max-h-[280px] overflow-y-auto pr-1">
            {topEmployeesData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-zinc-600 text-xs font-mono">
                No hay empleados registrados
              </div>
            ) : (
              topEmployeesData.map((emp, index) => (
                <div key={emp.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-red-500 font-bold w-4">#{index + 1}</span>
                    <div>
                      <h4 className="font-sans font-medium text-zinc-200">{emp.name}</h4>
                      <p className="text-[9px] text-zinc-500 font-mono">Atenciones: {emp.salesCount} mesas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 font-mono text-[10px] px-2 py-1 rounded-md">
                      {emp.Ventas.toLocaleString()} {config.currency}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* VIP Loyalty Customers list */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col md:col-span-2 xl:col-span-1" id="top-clients-widget">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
            <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">Clientes VIP / Club Loyalty</h3>
            <span className="text-[10px] text-zinc-500 font-mono">Puntos acumulados</span>
          </div>
          <div className="space-y-3.5 flex-1 max-h-[280px] overflow-y-auto pr-1">
            {topClients.map(cl => (
              <div key={cl.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-[10px] font-sans font-bold text-red-500 uppercase">
                    {cl.name.slice(0,2)}
                  </div>
                  <div>
                    <h4 className="font-sans font-medium text-zinc-200">{cl.name}</h4>
                    <p className="text-[9px] text-zinc-500 font-mono truncate max-w-[150px]">{cl.preferences || 'Sin preferencias registradas'}</p>
                  </div>
                </div>
                <div className="text-right font-mono text-zinc-300">
                  <span className="text-red-500 font-bold text-xs">{cl.points}</span> pts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
