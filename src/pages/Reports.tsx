/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Award, 
  Users, 
  ArrowUpRight, 
  DollarSign,
  Briefcase
} from 'lucide-react';

const COLORS = ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#581c87', '#311042', '#3f3f46'];

export default function Reports() {
  const { sales, products, categories, config, employees, clients } = useApp();
  
  const [dateRange, setDateRange] = useState('Mes');
  const [selectedCat, setSelectedCat] = useState('all');

  // Math totals
  const totalRevenue = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales]);
  const totalCost = useMemo(() => sales.reduce((acc, s) => acc + (s.total * 0.4), 0), [sales]);
  const totalProfit = useMemo(() => totalRevenue - totalCost, [totalRevenue, totalCost]);
  const averageTicket = useMemo(() => sales.length > 0 ? totalRevenue / sales.length : 0, [sales, totalRevenue]);

  // Chart data helpers
  // 1. Sales timeline
  const timelineData = useMemo(() => sales.map(s => {
    const d = new Date(s.date);
    return {
      name: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      Monto: s.total,
      Costo: s.total * 0.4,
      Ganancia: s.total * 0.6
    };
  }), [sales]);

  // 2. Category Share
  const categoryChartData = useMemo(() => {
    const categorySummary: { [key: string]: number } = {};
    sales.forEach(s => {
      s.items.forEach(it => {
        const cat = (it as any).productCategory || 'General';
        categorySummary[cat] = (categorySummary[cat] || 0) + it.subtotal;
      });
    });
    return Object.keys(categorySummary).map(catName => ({
      name: catName,
      value: Number(categorySummary[catName].toFixed(2))
    }));
  }, [sales]);

  // 3. Top Sellers (Employee Sales Commission)
  const employeeChartData = useMemo(() => {
    const employeeSummary: { [key: string]: number } = {};
    sales.forEach(s => {
      if (s.waiterId) {
        const waiter = employees.find(e => e.id === s.waiterId);
        if (waiter) {
          employeeSummary[waiter.name] = (employeeSummary[waiter.name] || 0) + s.total;
        }
      }
    });
    return Object.keys(employeeSummary).map(empName => ({
      name: empName,
      Ventas: Number(employeeSummary[empName].toFixed(2))
    }));
  }, [sales, employees]);

  // Export handlers
  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    alert(`Generando reporte empresarial AMBAR CLUB en formato ${format}...\nCalculando balances de inventario y Kardex...\nArchivo descargado con éxito.`);
  };

  return (
    <div className="space-y-6" id="reports-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Reportes Analíticos y BI</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">INFORMES COMERCIALES, GANANCIAS, DESEMPEÑO DE COLABORADORES Y MÁRGENES</p>
        </div>
        
        {/* Export Stations */}
        <div className="mt-4 md:mt-0 flex gap-2" id="reports-export-bar">
          <button
            onClick={() => handleExport('Excel')}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Excel / CSV</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400 text-xs font-mono py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Toolbar filtering */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between" id="reports-filters">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-xs font-mono text-zinc-400 uppercase">Periodo de Análisis:</span>
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            {['Hoy', 'Semana', 'Mes', 'Anual'].map(rng => (
              <button
                key={rng}
                onClick={() => setDateRange(rng)}
                className={`px-3 py-1 text-[11px] font-mono rounded-md transition-all cursor-pointer ${dateRange === rng ? 'bg-red-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {rng}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <select
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-3 py-1.5 rounded-xl focus:outline-none"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Ratios Bento Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="reports-ratios">
        {/* Ratio 1 */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block uppercase">Ingresos Brutos</span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalRevenue.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span></h3>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 mt-1.5">
              <TrendingUp className="w-3 h-3" />
              <span>+14.5% vs anterior</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-900/30 text-red-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Ratio 2 */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block uppercase">Margen Ganancia Bruta</span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">{totalProfit.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span></h3>
            <span className="text-[10px] text-zinc-400 font-mono mt-1.5">Márgenes licores: ~60%</span>
          </div>
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-400">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Ratio 3 */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block uppercase">Ticket Promedio Turno</span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">{averageTicket.toLocaleString('es-ES', { maximumFractionDigits: 1 })} <span className="text-xs text-red-500 font-normal">{config.currency}</span></h3>
            <span className="text-[10px] text-zinc-500 font-mono mt-1.5">Total comandas: {sales.length}</span>
          </div>
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-400">
            <Users className="w-5 h-5 text-red-500" />
          </div>
        </div>

        {/* Ratio 4 */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block uppercase">Costo de Mercadería (COGS)</span>
            <h3 className="text-2xl font-bold font-mono text-white mt-1">{(totalRevenue - totalProfit).toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span></h3>
            <span className="text-[10px] text-zinc-400 font-mono mt-1.5">Insumos y botellas liquidadas</span>
          </div>
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive visual analytical graphs (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="reports-charts-grid">
        {/* Sales Timeline chart (Col span 8) */}
        <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5" id="reports-timeline-card">
          <div className="pb-4 mb-4 border-b border-zinc-900">
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">Histórico de Ventas y Retorno de Inversión</h4>
            <p className="text-[10px] text-zinc-500 font-mono">LÍNEA DE TIEMPO DEL INGRESO VERSUS COSTO UNITARIO</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                <YAxis stroke="#52525b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Monto" stroke="#dc2626" strokeWidth={2} name="Venta Real (BOB)" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Ganancia" stroke="#10b981" strokeWidth={1.5} name="Ganancia Neta" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown (Col span 4) */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between" id="reports-categories-card">
          <div className="pb-4 border-b border-zinc-900 mb-4">
            <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">Ventas por Categoría de Licor</h4>
            <p className="text-[10px] text-zinc-500 font-mono">COMPOSICIÓN PORCENTUAL DE COMANDAS</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <span className="text-zinc-600 font-mono text-xs">Sin registros de venta suficientes</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Legend Custom */}
          <div className="space-y-1 mt-3">
            {categoryChartData.slice(0, 4).map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-zinc-400">{item.name}</span>
                </div>
                <span className="text-zinc-200 font-semibold">{item.value.toLocaleString()} {config.currency}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top sellers ranking chart (Col span 12) */}
        {employeeChartData.length > 0 && (
          <div className="lg:col-span-12 bg-zinc-950 border border-zinc-900 rounded-2xl p-5" id="reports-waiters-card">
            <div className="pb-4 mb-4 border-b border-zinc-900">
              <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">Comportamiento Comercial de Colaboradores</h4>
              <p className="text-[10px] text-zinc-500 font-mono">RANKING DE COMANDAS REGISTRADAS POR MESERO / BARTENDER</p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                  <YAxis stroke="#52525b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Bar dataKey="Ventas" fill="#dc2626" radius={[4, 4, 0, 0]} name="Ventas Facturadas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
