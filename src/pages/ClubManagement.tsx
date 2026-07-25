/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  Music, 
  Sparkles, 
  Plus, 
  Trash2, 
  Briefcase, 
  UserCheck, 
  Coins, 
  Wine, 
  CheckCircle, 
  Clock, 
  ArrowLeftRight, 
  Wallet, 
  Percent, 
  PlusCircle, 
  Users2,
  CalendarCheck2,
  Receipt,
  FileSpreadsheet,
  ShieldAlert,
  Lock,
  Sliders,
  Settings
} from 'lucide-react';

// Expense Categories
const EXPENSE_CATEGORIES = [
  { id: 'artists', name: 'DJs & Artistas Invitados', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-900/30' },
  { id: 'security', name: 'Personal & Seguridad', color: 'text-red-400 bg-red-950/40 border-red-900/30' },
  { id: 'supplies', name: 'Insumos de Emergencia (Hielo, etc)', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-900/30' },
  { id: 'maintenance', name: 'Efectos & Producción (Co2, Luces)', color: 'text-amber-400 bg-amber-950/40 border-amber-900/30' },
  { id: 'marketing', name: 'Marketing & Promotores RRPP', color: 'text-pink-400 bg-pink-950/40 border-pink-900/30' },
  { id: 'commissions', name: 'Comisiones Pagadas a Meseros', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30' },
];

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface ClubEvent {
  id: string;
  name: string;
  date: string;
  coverPrice: number;
  vipTablePrice: number;
  expectedAttendance: number;
  promoters: string[];
}

interface GuestListItem {
  id: string;
  eventId: string;
  promoterName: string;
  guestName: string;
  paxCount: number;
  entered: boolean;
  notes?: string;
}

export default function ClubManagement() {
  const { 
    sales, 
    employees, 
    config, 
    currentUser, 
    addAuditLog, 
    adjustStock, 
    saveEmployee, 
    updateConfig, 
    addCashExpense, 
    registerCashInflow, 
    registerCashOutflow, 
    activeSession, 
    resetWarehouse 
  } = useApp();
  
  // Active Management tab
  const [activeSubTab, setActiveSubTab] = useState<'accounting' | 'events' | 'commissions' | 'gerente'>('accounting');

  // Local state persisted to localStorage
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('ambar_club_expenses');
    if (saved) return JSON.parse(saved);
    // Initial seeds for a realistic experience
    return [
      { id: 'exp-1', description: 'Honorarios DJ Guest Internacional (Weekend Set)', amount: 2500, category: 'artists', date: '2026-07-10' },
      { id: 'exp-2', description: 'Pago 6 Guardias de Seguridad de Refuerzo', amount: 1200, category: 'security', date: '2026-07-10' },
      { id: 'exp-3', description: 'Compra de 20 bolsas de Hielo seco de emergencia', amount: 150, category: 'supplies', date: '2026-07-11' },
      { id: 'exp-4', description: 'Alquiler de Cañón de CO2 y Humo para escenario', amount: 800, category: 'maintenance', date: '2026-07-09' },
      { id: 'exp-5', description: 'Comisión Promotor Carlos - Listas Vip', amount: 450, category: 'marketing', date: '2026-07-11' },
    ];
  });

  const [events, setEvents] = useState<ClubEvent[]>(() => {
    const saved = localStorage.getItem('ambar_club_events');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'evt-1', name: 'SÁBADO DE AMBAR - Guest DJ Neon', date: '2026-07-11', coverPrice: 50, vipTablePrice: 800, expectedAttendance: 350, promoters: ['Carlos RRPP', 'Sofía VIP', 'Marcos Club'] },
      { id: 'evt-2', name: 'VIERNES DE COLOSEO - Barra Libre Mujeres', date: '2026-07-17', coverPrice: 40, vipTablePrice: 600, expectedAttendance: 280, promoters: ['Sofía VIP', 'Ana Promociones'] },
    ];
  });

  const [guestList, setGuestList] = useState<GuestListItem[]>(() => {
    const saved = localStorage.getItem('ambar_club_guests');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'gst-1', eventId: 'evt-1', promoterName: 'Carlos RRPP', guestName: 'Alejandra Méndez + 3', paxCount: 4, entered: true, notes: 'VIP Box 3' },
      { id: 'gst-2', eventId: 'evt-1', promoterName: 'Carlos RRPP', guestName: 'Eduardo Roca + 1', paxCount: 2, entered: false, notes: 'Lista General' },
      { id: 'gst-3', eventId: 'evt-1', promoterName: 'Sofía VIP', guestName: 'Mariana Chávez + 4', paxCount: 5, entered: true, notes: 'VIP Lounge 1' },
      { id: 'gst-4', eventId: 'evt-1', promoterName: 'Marcos Club', guestName: 'Bruno Valda', paxCount: 1, entered: false },
      { id: 'gst-5', eventId: 'evt-2', promoterName: 'Sofía VIP', guestName: 'Camila Ríos + 2', paxCount: 3, entered: false },
    ];
  });

  const [commissionRate, setCommissionRate] = useState<number>(() => {
    const saved = localStorage.getItem('ambar_waiter_commission_rate');
    return saved ? Number(saved) : 5; // default 5%
  });

  // Save states to localStorage on change
  useEffect(() => {
    localStorage.setItem('ambar_club_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ambar_club_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('ambar_club_guests', JSON.stringify(guestList));
  }, [guestList]);

  useEffect(() => {
    localStorage.setItem('ambar_waiter_commission_rate', commissionRate.toString());
  }, [commissionRate]);

  // Gerente Console states
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>(UserRole.MESERO);
  const [staffPhone, setStaffPhone] = useState('');
  const [staffSchedule, setStaffSchedule] = useState('18:00 - 02:00');
  const [flowAmt, setFlowAmt] = useState('');
  const [flowObs, setFlowObs] = useState('');
  const [flowType, setFlowType] = useState<'inflow' | 'outflow'>('inflow');
  const [fiscalCompanyName, setFiscalCompanyName] = useState(config?.companyName || 'Ámbar Club');
  const [fiscalNit, setFiscalNit] = useState(config?.nit || '342551021');
  const [fiscalTaxRate, setFiscalTaxRate] = useState(config ? Math.round(config.taxRate * 100) : 13);

  // Sync fiscal inputs with config updates
  useEffect(() => {
    if (config) {
      setFiscalCompanyName(config.companyName);
      setFiscalNit(config.nit);
      setFiscalTaxRate(Math.round(config.taxRate * 100));
    }
  }, [config]);

  // Expenses management form state
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmt, setNewExpenseAmt] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('artists');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Events form state
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCover, setNewEventCover] = useState('');
  const [newEventVipPrice, setNewEventVipPrice] = useState('');
  const [newEventExp, setNewEventExp] = useState('');
  const [newEventPromoters, setNewEventPromoters] = useState('');

  // Guest list form state
  const [selectedEventId, setSelectedEventId] = useState('evt-1');
  const [newGuestPromoter, setNewGuestPromoter] = useState('Carlos RRPP');
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPax, setNewGuestPax] = useState('1');
  const [newGuestNotes, setNewGuestNotes] = useState('');

  // ---------------------------------------------------------------------------
  // Calculations
  // ---------------------------------------------------------------------------
  // POS Sales income synced automatically
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  
  // Total manually entered expenses
  const totalManExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Total net balance
  const netEarnings = totalSalesRevenue - totalManExpenses;

  // Waiter Commissions calculations based on actual sales
  // Waiters earn commissionRate% on sales they handle (waiterId)
  const waiterCommissions = employees
    .filter(emp => emp.role === UserRole.MESERO || (emp.role as string).toLowerCase() === 'mesero')
    .map(waiter => {
      const waiterSales = sales.filter(s => s.waiterId === waiter.id);
      const totalSold = waiterSales.reduce((sum, s) => sum + s.total, 0);
      const commission = Number(((totalSold * commissionRate) / 100).toFixed(2));
      return {
        id: waiter.id,
        name: waiter.name,
        totalSold,
        commission,
        salesCount: waiterSales.length
      };
    });

  const totalCalculatedCommissions = waiterCommissions.reduce((sum, item) => sum + item.commission, 0);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseDesc || !newExpenseAmt) return;

    const amt = parseFloat(newExpenseAmt);
    if (isNaN(amt) || amt <= 0) return;

    const newExp: Expense = {
      id: 'exp-' + Date.now(),
      description: newExpenseDesc,
      amount: amt,
      category: newExpenseCat,
      date: newExpenseDate,
    };

    setExpenses([newExp, ...expenses]);
    setNewExpenseDesc('');
    setNewExpenseAmt('');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName || !newEventDate) return;

    const nEvent: ClubEvent = {
      id: 'evt-' + Date.now(),
      name: newEventName.toUpperCase(),
      date: newEventDate,
      coverPrice: parseFloat(newEventCover) || 0,
      vipTablePrice: parseFloat(newEventVipPrice) || 0,
      expectedAttendance: parseInt(newEventExp) || 0,
      promoters: newEventPromoters ? newEventPromoters.split(',').map(p => p.trim()) : ['General'],
    };

    setEvents([...events, nEvent]);
    setNewEventName('');
    setNewEventDate('');
    setNewEventCover('');
    setNewEventVipPrice('');
    setNewEventExp('');
    setNewEventPromoters('');
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName) return;

    const nGuest: GuestListItem = {
      id: 'gst-' + Date.now(),
      eventId: selectedEventId,
      promoterName: newGuestPromoter,
      guestName: newGuestName,
      paxCount: parseInt(newGuestPax) || 1,
      entered: false,
      notes: newGuestNotes
    };

    setGuestList([...guestList, nGuest]);
    setNewGuestName('');
    setNewGuestNotes('');
  };

  const toggleGuestStatus = (id: string) => {
    setGuestList(guestList.map(g => {
      if (g.id === id) {
        return { ...g, entered: !g.entered };
      }
      return g;
    }));
  };

  const handleAddStaffGerente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName) return;
    const newEmp = {
      id: 'emp-' + Date.now(),
      name: staffName,
      role: staffRole,
      phone: staffPhone || 'S/N',
      schedule: staffSchedule,
      comissionsRate: staffRole === UserRole.MESERO ? (commissionRate / 100) : 0,
      salesCount: 0,
      totalSalesValue: 0,
      totalComissions: 0,
      isActive: true
    };
    saveEmployee(newEmp);
    addAuditLog('Empleados', `Alta Express de Personal por Gerente: ${staffName} (${staffRole})`, null, newEmp);
    setStaffName('');
    setStaffPhone('');
    alert(`🎉 Colaborador "${staffName}" registrado con éxito con el rol de ${staffRole}.`);
  };

  const handleCashMovementGerente = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(flowAmt);
    if (isNaN(amt) || amt <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }
    if (!activeSession) {
      alert('No hay una sesión de caja activa en el sistema actualmente.');
      return;
    }
    if (flowType === 'inflow') {
      registerCashInflow(amt, `[INYECCIÓN GERENTE] ${flowObs}`);
      addAuditLog('Caja', `Inyección de Efectivo de Emergencia por Gerente: Bs ${amt}`, null, { amount: amt, observations: flowObs });
      alert(`💵 Inyección de Bs ${amt} registrada con éxito en ${activeSession.cajaAsociada || 'Caja Activa'}.`);
    } else {
      registerCashOutflow(amt, `[RETIRO GERENTE] ${flowObs}`);
      addAuditLog('Caja', `Retiro de Efectivo de Emergencia por Gerente: Bs ${amt}`, null, { amount: amt, observations: flowObs });
      alert(`💸 Retiro de Bs ${amt} registrado con éxito de ${activeSession.cajaAsociada || 'Caja Activa'}.`);
    }
    setFlowAmt('');
    setFlowObs('');
  };

  const handleSaveFiscalGerente = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...config,
      companyName: fiscalCompanyName,
      nit: fiscalNit,
      taxRate: parseFloat((fiscalTaxRate / 100).toFixed(4))
    };
    updateConfig(updated);
    addAuditLog('Configuración', 'Modificación de Parámetros Fiscales por Gerencia', config, updated);
    alert('📊 Parámetros fiscales y corporativos actualizados por Gerencia con éxito.');
  };

  const handleResetWarehouseGerente = async () => {
    try {
      await resetWarehouse();
      addAuditLog('Inventarios', 'Reestablecer Catálogo General por Gerencia', null, { status: 'Success' });
    } catch (err: any) {
      console.error(`Error al reestablecer almacén: ${err.message}`);
    }
  };

  const handleSaveCommissionRateGerente = () => {
    addAuditLog('Configuración', `Cambio de Tasa Global de Comisión: de ${localStorage.getItem('ambar_waiter_commission_rate')}% a ${commissionRate}%`, null, { rate: commissionRate });
  };

  const payCommissionToWaiter = (waiterName: string, amount: number) => {

    const newExp: Expense = {
      id: 'exp-' + Date.now(),
      description: `Pago Comisión de Ventas - Mesero: ${waiterName}`,
      amount,
      category: 'commissions',
      date: new Date().toISOString().split('T')[0]
    };

    setExpenses([newExp, ...expenses]);
    alert(`Comisión pagada con éxito y registrada como egreso.`);
  };

  return (
    <div className="space-y-6" id="club-management-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans">Contabilidad y Gestión Operativa</h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">LIBRO AUXILIAR DE EGRESOS, CONTROL DE PROMOTORES RRPP, EVENTOS Y LIQUIDACIÓN DE COMISIONES</p>
        </div>
        
        {/* Sub Navigation Tabs */}
        <div className="mt-4 md:mt-0 flex bg-zinc-950 p-1 border border-zinc-900 rounded-xl space-x-1" id="management-subtabs">
          <button
            onClick={() => setActiveSubTab('accounting')}
            className={`px-4 py-2 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'accounting' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Contabilidad y Gastos</span>
          </button>
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-4 py-2 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'events' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Eventos y RRPP</span>
          </button>
          <button
            onClick={() => setActiveSubTab('commissions')}
            className={`px-4 py-2 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'commissions' ? 'bg-red-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Comisiones Personal</span>
          </button>
          {(currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.GERENTE) && (
            <button
              onClick={() => setActiveSubTab('gerente')}
              className={`px-4 py-2 text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'gerente' ? 'bg-amber-600 text-black font-bold animate-pulse' : 'text-zinc-400 hover:text-white'}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Consola del Gerente</span>
            </button>
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          SUBTAB 1: CONTABILIDAD Y EGRESOS
         ----------------------------------------------------------------------- */}
      {activeSubTab === 'accounting' && (
        <div className="space-y-6" id="management-accounting-tab">
          {/* Key Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Ingresos Totales (POS)</span>
                <h3 className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                  +{totalSalesRevenue.toLocaleString()} <span className="text-xs text-zinc-500">{config.currency}</span>
                </h3>
                <span className="text-[9px] text-zinc-500 font-mono">Facturado vía Punto de Venta</span>
              </div>
              <div className="w-10 h-10 bg-emerald-950/40 rounded-xl flex items-center justify-center border border-emerald-900/30 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Gastos de Operación</span>
                <h3 className="text-2xl font-bold font-mono text-red-500 mt-1">
                  -{totalManExpenses.toLocaleString()} <span className="text-xs text-zinc-500">{config.currency}</span>
                </h3>
                <span className="text-[9px] text-zinc-500 font-mono">Pago a artistas, personal y servicios</span>
              </div>
              <div className="w-10 h-10 bg-red-950/40 rounded-xl flex items-center justify-center border border-red-900/30 text-red-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Utilidad Líquida Estimada</span>
                <h3 className={`text-2xl font-bold font-mono mt-1 ${netEarnings >= 0 ? 'text-cyan-400' : 'text-rose-600'}`}>
                  {netEarnings.toLocaleString()} <span className="text-xs text-zinc-500">{config.currency}</span>
                </h3>
                <span className="text-[9px] text-zinc-500 font-mono">Balance neto del periodo</span>
              </div>
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 text-cyan-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add Expense Form */}
            <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 h-fit">
              <div className="border-b border-zinc-900 pb-3 mb-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-red-600" />
                  <span>Registrar Gasto del Club</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">EGRESOS CAJA CHICA Y ARTISTAS</p>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Descripción del Gasto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Honorarios DJ, Alquiler Luces, Hielo..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    value={newExpenseDesc}
                    onChange={(e) => setNewExpenseDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Monto ({config.currency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="0.00"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                      value={newExpenseAmt}
                      onChange={(e) => setNewExpenseAmt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Fecha de Gasto</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                      value={newExpenseDate}
                      onChange={(e) => setNewExpenseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Categoría Operativa</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                    value={newExpenseCat}
                    onChange={(e) => setNewExpenseCat(e.target.value)}
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aplicar Gasto</span>
                </button>
              </form>
            </div>

            {/* Expenses List */}
            <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
              <div className="border-b border-zinc-900 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Historial de Salidas y Egresos</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">LIBRO DIARIO DE CAJA AUXILIAR</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-[10px] font-mono text-zinc-400">
                  Total Registros: {expenses.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                {expenses.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-zinc-600 font-mono text-xs block">No hay egresos registrados en este periodo</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        <th className="pb-2">Fecha</th>
                        <th className="pb-2">Concepto / Descripción</th>
                        <th className="pb-2">Categoría</th>
                        <th className="pb-2 text-right">Monto</th>
                        <th className="pb-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 text-xs font-mono">
                      {expenses.map((exp) => {
                        const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                        return (
                          <tr key={exp.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="py-3 text-zinc-500">{exp.date}</td>
                            <td className="py-3 text-white font-medium">{exp.description}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] border font-bold uppercase tracking-wider ${catInfo?.color || 'text-zinc-400 bg-zinc-900 border-zinc-800'}`}>
                                {catInfo?.name.split(' (')[0] || exp.category}
                              </span>
                            </td>
                            <td className="py-3 text-right text-red-500 font-bold">
                              -{exp.amount.toLocaleString()} <span className="text-[9px] text-zinc-500">{config.currency}</span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-zinc-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                                title="Anular Gasto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SUBTAB 2: GESTIÓN DE EVENTOS Y RRPP
         ----------------------------------------------------------------------- */}
      {activeSubTab === 'events' && (
        <div className="space-y-6" id="management-events-tab">
          {/* Main events panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left form for new event */}
            <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 h-fit">
              <div className="border-b border-zinc-900 pb-3 mb-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck2 className="w-4 h-4 text-red-600" />
                  <span>Programar Evento</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">DJS INVITADOS Y FIESTAS ESPECIALES</p>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Nombre de la Fiesta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. RETRO HITS NIGHTS, AMBAR FEST"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Aforo Estimado</label>
                    <input
                      type="number"
                      placeholder="300"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                      value={newEventExp}
                      onChange={(e) => setNewEventExp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Cover General ({config.currency})</label>
                    <input
                      type="number"
                      placeholder="50"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                      value={newEventCover}
                      onChange={(e) => setNewEventCover(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Precio VIP ({config.currency})</label>
                    <input
                      type="number"
                      placeholder="800"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                      value={newEventVipPrice}
                      onChange={(e) => setNewEventVipPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Promotores / RRPP (Separado por comas)</label>
                  <input
                    type="text"
                    placeholder="Carlos RRPP, Sofía VIP, Andres RRPP"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    value={newEventPromoters}
                    onChange={(e) => setNewEventPromoters(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Evento</span>
                </button>
              </form>
            </div>

            {/* List of active events */}
            <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
              <div className="border-b border-zinc-900 pb-3 mb-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Cronograma de Eventos Club</h3>
                <p className="text-[10px] text-zinc-500 font-mono">PLANIFICACIÓN COMERCIAL Y TICKETS</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((evt) => {
                  const eventGuests = guestList.filter(g => g.eventId === evt.id);
                  const totalGuestsCount = eventGuests.reduce((sum, g) => sum + g.paxCount, 0);
                  const enteredCount = eventGuests.filter(g => g.entered).reduce((sum, g) => sum + g.paxCount, 0);

                  return (
                    <div key={evt.id} className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl hover:border-zinc-800 transition-colors flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-mono font-bold bg-red-950/40 border border-red-900/30 text-red-400 px-2 py-0.5 rounded uppercase">
                            {evt.date}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            Aforo: {evt.expectedAttendance} pax
                          </span>
                        </div>
                        <h4 className="text-xs font-bold font-mono text-white tracking-wide">{evt.name}</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 pt-1">
                          <div>
                            Cover Gral: <span className="text-emerald-500 font-bold">{evt.coverPrice} {config.currency}</span>
                          </div>
                          <div>
                            Mesa VIP: <span className="text-amber-500 font-bold">{evt.vipTablePrice} {config.currency}</span>
                          </div>
                        </div>

                        <div className="border-t border-zinc-900 pt-2 mt-2">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Promotores Activos:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {evt.promoters.map((p, i) => (
                              <span key={i} className="text-[8px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-900/80 p-2.5 rounded-lg mt-3 flex items-center justify-between text-[10px] font-mono">
                        <div className="flex flex-col">
                          <span className="text-zinc-500 text-[8px] uppercase">RRPP Guest Check-In</span>
                          <span className="text-zinc-300 font-bold">{enteredCount} ingresados / {totalGuestsCount} en listas</span>
                        </div>
                        <div className="w-16 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${totalGuestsCount > 0 ? (enteredCount / totalGuestsCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RRPP Promoter Guest List Check-In Station */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
            <div className="border-b border-zinc-900 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-emerald-500" />
                  <span>Estación de Control de Listas VIP (Door Check-In)</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">VERIFICACIÓN DE INVITADOS DE PROMOTORES RRPP</p>
              </div>

              {/* Event filter selector */}
              <div className="mt-3 sm:mt-0 flex gap-2">
                <select
                  className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-3 py-1.5 rounded-xl focus:outline-none"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add guest form */}
              <form onSubmit={handleAddGuest} className="lg:col-span-4 bg-zinc-900/20 border border-zinc-900 p-4 rounded-xl space-y-3 h-fit">
                <h4 className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">Inscribir en Lista VIP</h4>
                
                <div>
                  <label className="text-[9px] font-mono text-zinc-400 block uppercase mb-1">Promotor RRPP</label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none"
                    value={newGuestPromoter}
                    onChange={(e) => setNewGuestPromoter(e.target.value)}
                  >
                    {events.find(e => e.id === selectedEventId)?.promoters.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    )) || <option value="General">General</option>}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-zinc-400 block uppercase mb-1">Nombre de Invitado Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Vedia"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-zinc-400 block uppercase mb-1">Pax (Acompañantes)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none font-mono"
                      value={newGuestPax}
                      onChange={(e) => setNewGuestPax(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-zinc-400 block uppercase mb-1">Notas / Mesa</label>
                    <input
                      type="text"
                      placeholder="Mesa 5, VIP Box"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none"
                      value={newGuestNotes}
                      onChange={(e) => setNewGuestNotes(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] py-2 px-3 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir a Lista</span>
                </button>
              </form>

              {/* Guest list grid table */}
              <div className="lg:col-span-8 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <th className="pb-2">Invitado</th>
                      <th className="pb-2">Promotor (RRPP)</th>
                      <th className="pb-2 text-center">Pax</th>
                      <th className="pb-2">Estado Acceso</th>
                      <th className="pb-2 text-right">Marcar Ingreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs font-mono">
                    {guestList.filter(g => g.eventId === selectedEventId).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-600 font-mono">
                          No hay invitados inscritos para este evento
                        </td>
                      </tr>
                    ) : (
                      guestList.filter(g => g.eventId === selectedEventId).map((guest) => (
                        <tr key={guest.id} className="hover:bg-zinc-900/10 transition-colors">
                          <td className="py-2.5">
                            <span className="text-white font-medium block">{guest.guestName}</span>
                            {guest.notes && <span className="text-[9px] text-zinc-500 block">Obs: {guest.notes}</span>}
                          </td>
                          <td className="py-2.5 text-zinc-400">{guest.promoterName}</td>
                          <td className="py-2.5 text-center text-zinc-300 font-bold">{guest.paxCount}</td>
                          <td className="py-2.5">
                            {guest.entered ? (
                              <span className="bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <span>Ingresó</span>
                              </span>
                            ) : (
                              <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                <Clock className="w-3 h-3 text-zinc-600 animate-pulse" />
                                <span>En Espera</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => toggleGuestStatus(guest.id)}
                              className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${guest.entered ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-900 hover:text-white'}`}
                            >
                              {guest.entered ? 'Revertir' : 'Confirmar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SUBTAB 3: COMISIONES DEL PERSONAL
         ----------------------------------------------------------------------- */}
      {activeSubTab === 'commissions' && (
        <div className="space-y-6" id="management-commissions-tab">
          {/* Slider for configuration */}
          <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-4.5 h-4.5 text-red-600" />
                <span>Parámetro de Comisión Comercial</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Configure el porcentaje de comisión que los meseros reciben sobre las ventas totales y botellas servidas en su turno.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-zinc-900/60 p-3.5 border border-zinc-800 rounded-xl min-w-[280px]">
              <span className="text-xs font-mono text-zinc-500">0%</span>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                className="w-full accent-red-600 cursor-pointer"
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
              />
              <span className="text-xs font-mono text-zinc-500">20%</span>
              <div className="bg-red-950/40 border border-red-900/30 text-red-400 font-bold font-mono text-sm px-2 py-1 rounded">
                {commissionRate}%
              </div>
            </div>
          </div>

          {/* Waiters breakdown and totals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stat summaries */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-2">
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase block">Resumen de Liquidaciones</h4>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Meseros Activos:</span>
                    <span className="text-white font-bold">{waiterCommissions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tasa de Comisión:</span>
                    <span className="text-red-400 font-bold">{commissionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ventas Totales Waiters:</span>
                    <span className="text-white font-bold">
                      {waiterCommissions.reduce((s, w) => s + w.totalSold, 0).toLocaleString()} {config.currency}
                    </span>
                  </div>
                  <div className="border-t border-zinc-900 pt-3 flex justify-between text-sm">
                    <span className="text-zinc-400 font-bold uppercase">Provisión Comisiones:</span>
                    <span className="text-emerald-500 font-bold">
                      {totalCalculatedCommissions.toLocaleString()} {config.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission policy helper card */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl">
                <h4 className="text-[10px] font-mono text-zinc-300 uppercase block mb-2 font-bold">Política del Establecimiento</h4>
                <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                  Las comisiones se autoliquidan dinámicamente según el identificador de comitente de comanda en cada mesa VIP o venta rápida. Una vez que el gerente efectúa el pago, se carga el egreso de manera oficial en la bitácora de contabilidad reduciendo los balances de utilidad neta.
                </p>
              </div>
            </div>

            {/* Commissions list table */}
            <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
              <div className="border-b border-zinc-900 pb-3 mb-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Planilla de Liquidación para Meseros</h3>
                <p className="text-[10px] text-zinc-500 font-mono">RENDIMIENTO COMERCIAL INDIVIDUAL Y COMISIONES POR COBRAR</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      <th className="pb-2">Colaborador / Mesero</th>
                      <th className="pb-2 text-center">Nro Comandas</th>
                      <th className="pb-2 text-right">Venta Total</th>
                      <th className="pb-2 text-right">Comisión Activa ({commissionRate}%)</th>
                      <th className="pb-2 text-right">Acción Comercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs font-mono">
                    {waiterCommissions.map((waiter) => (
                      <tr key={waiter.id} className="hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-red-950/40 border border-red-900/30 text-red-500 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                              {waiter.name.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{waiter.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center text-zinc-300 font-bold">{waiter.salesCount}</td>
                        <td className="py-3 text-right text-zinc-400">
                          {waiter.totalSold.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-3 text-right text-emerald-500 font-bold">
                          {waiter.commission.toLocaleString()} {config.currency}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => payCommissionToWaiter(waiter.name, waiter.commission)}
                            disabled={waiter.commission <= 0}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${waiter.commission > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}
                          >
                            Liquidar & Pagar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          SUBTAB 4: CONSOLA DEL GERENTE
         ----------------------------------------------------------------------- */}
      {activeSubTab === 'gerente' && (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.GERENTE) && (
        <div className="space-y-6" id="management-gerente-tab">
          {/* Key Indicators */}
          <div className="bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950 border border-amber-900/40 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-500 block uppercase tracking-widest font-bold">Consola Exclusiva de Toma de Decisiones</span>
              <h2 className="text-xl font-bold font-sans text-white">Panel de Control Gerencial & Auditoría</h2>
              <p className="text-xs text-zinc-400 font-sans">
                Como <span className="text-amber-400 font-bold font-mono">Gerente General</span> de Ámbar Club, tienes privilegios de nivel 1 para anular registros, inyectar caja de emergencia, alterar tasas impositivas e incorporar personal.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl font-mono text-xs">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-zinc-400">Usuario Activo:</span>
              <span className="text-white font-bold uppercase">{currentUser?.name || 'Gerente'}</span>
              <span className="bg-amber-950 text-amber-400 border border-amber-900/60 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                {currentUser?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column Left (Management Rules & Cash Injections) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* 1. Global Commission Rate Card */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Tasa Global de Comisión</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">RETRIBUCIÓN VARIABLES A MESEROS</p>
                    </div>
                  </div>
                  <span className="bg-zinc-900 border border-zinc-800 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                    {commissionRate}%
                  </span>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Ajusta dinámicamente el porcentaje de ventas que ganan todos los meseros. La estimación de provisiones se actualizará inmediatamente.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>Mínimo: 1%</span>
                      <span>Seleccionado: {commissionRate}%</span>
                      <span>Máximo: 20%</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={commissionRate} 
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Simulator Box */}
                  <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl font-mono text-[11px] space-y-2">
                    <div className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Simulación de Impacto Directo:</div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total Venta Waiters:</span>
                      <span className="text-white font-bold">
                        {waiterCommissions.reduce((s, w) => s + w.totalSold, 0).toLocaleString()} {config.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Egresos por Comisiones:</span>
                      <span className="text-amber-400 font-bold">
                        {totalCalculatedCommissions.toLocaleString()} {config.currency}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCommissionRateGerente}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-black font-mono text-xs py-2 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Aplicar & Registrar en Auditoría</span>
                  </button>
                </div>
              </div>

              {/* 2. Emergency Cash Flow */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Inyección / Retiro de Caja</h4>
                    <p className="text-[10px] text-zinc-500 font-mono font-bold">AJUSTES DE LIQUIDEZ EXTRAORDINARIOS</p>
                  </div>
                </div>

                {activeSession ? (
                  <form onSubmit={handleCashMovementGerente} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setFlowType('inflow')}
                        className={`py-2 text-xs font-mono rounded-lg font-bold transition-all ${flowType === 'inflow' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Ingreso / Inyectar
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlowType('outflow')}
                        className={`py-2 text-xs font-mono rounded-lg font-bold transition-all ${flowType === 'outflow' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Retiro / Gasto
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Monto ({config.currency})</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="0.00"
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                          value={flowAmt}
                          onChange={(e) => setFlowAmt(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Sesión Afectada</label>
                        <div className="w-full bg-zinc-900/60 border border-zinc-800 py-2 px-3 rounded-xl text-xs font-mono text-zinc-400 font-bold truncate">
                          {activeSession.cajaAsociada} (ID: {activeSession.id.slice(0,6)})
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Motivo / Justificación de Emergencia</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cambio de billetes grandes, retiro de efectivo autorizado..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-600 focus:outline-none"
                        value={flowObs}
                        onChange={(e) => setFlowObs(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${flowType === 'inflow' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{flowType === 'inflow' ? 'Autorizar Inyección de Caja' : 'Autorizar Retiro de Caja'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl text-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-amber-200 font-medium">No hay ninguna sesión de caja abierta actualmente.</p>
                    <p className="text-[10px] text-zinc-500 leading-normal">
                      Debes abrir la caja desde la Consola POS antes de realizar transferencias o ajustes directos de efectivo.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Column Right (Fiscal settings & Express Staffing) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* 3. Corporate & Fiscal Rules */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Regulación Fiscal & Impuestos</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">MODIFICACIONES DE FACTURACIÓN Y TASAS</p>
                  </div>
                </div>

                <form onSubmit={handleSaveFiscalGerente} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Nombre Comercial</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                        value={fiscalCompanyName}
                        onChange={(e) => setFiscalCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">NIT Corporativo</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                        value={fiscalNit}
                        onChange={(e) => setFiscalNit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-zinc-400 block uppercase">Porcentaje de Impuesto / IVA ({fiscalTaxRate}%)</label>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>Sin Impuesto (0%)</span>
                      <span>Elegido: {fiscalTaxRate}%</span>
                      <span>Máximo (20%)</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="20" 
                      value={fiscalTaxRate} 
                      onChange={(e) => setFiscalTaxRate(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-black font-mono text-xs py-2 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Guardar Cambios Fiscales</span>
                  </button>
                </form>
              </div>

              {/* 4. Express Staffing Onboarding */}
              <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Alta de Personal Express</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">REGISTRO DE COLABORADORES PARA LA NOCHE</p>
                  </div>
                </div>

                <form onSubmit={handleAddStaffGerente} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Rol Operativo</label>
                      <select
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as UserRole)}
                      >
                        <option value={UserRole.MESERO}>Mesero (Comisionable)</option>
                        <option value={UserRole.BARTENDER}>Bartender</option>
                        <option value={UserRole.CAJA}>Cajero (Caja Chica)</option>
                        <option value={UserRole.SUPERVISOR}>Supervisor</option>
                        <option value={UserRole.ALMACENERO}>Almacenero</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Teléfono</label>
                      <input
                        type="text"
                        placeholder="Ej. +591 76543210"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block uppercase mb-1">Horario Nocturno</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
                        value={staffSchedule}
                        onChange={(e) => setStaffSchedule(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-black font-mono text-xs py-2 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dar de Alta Colaborador</span>
                  </button>
                </form>
              </div>

              {/* 5. Emergency Actions & Safety Resets */}
              <div className="bg-zinc-950 border border-red-950 p-5 rounded-2xl space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-red-500" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider text-red-400">Zona de Seguridad & Reinicios</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">ACCIONES DESTRUCTIVAS Y REGENERACIÓN</p>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl text-zinc-400 text-[11px] leading-relaxed">
                    Las siguientes acciones afectarán las colecciones de almacén de manera definitiva. Úselo con extrema precaución.
                  </div>

                  <button
                    onClick={handleResetWarehouseGerente}
                    className="w-full border border-red-900 hover:bg-red-950/40 text-red-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Reestablecer Stock de Almacén</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
