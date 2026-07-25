/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CashExpense } from '../types';
import { 
  Plus, 
  Search, 
  DollarSign, 
  Calendar, 
  User, 
  FileText, 
  Folder, 
  Printer, 
  X, 
  Tag, 
  TrendingDown, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function CashExpenses() {
  const { cashExpenses, addCashExpense, activeSession, config, cashSessions, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedCajaFilter, setSelectedCajaFilter] = useState('Todas');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState('Suministros');
  const [targetCaja, setTargetCaja] = useState(activeSession ? (activeSession.cajaAsociada || 'Caja 1') : 'Caja 1');

  // Print voucher state
  const [selectedVoucher, setSelectedVoucher] = useState<CashExpense | null>(null);

  // Filter expenses
  const todayStr = new Date().toISOString().substring(0, 10);
  
  const filteredExpenses = cashExpenses.filter(exp => {
    const matchesSearch = (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.recipient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.authorizedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Todas' || exp.category === selectedCategory;
    const matchesCaja = selectedCajaFilter === 'Todas' || exp.cajaAsociada === selectedCajaFilter;

    return matchesSearch && matchesCategory && matchesCaja;
  });

  // Calculate stats
  const totalExpensesToday = cashExpenses
    .filter(exp => exp.date.substring(0, 10) === todayStr)
    .reduce((acc, exp) => acc + exp.amount, 0);

  const totalExpensesAllTime = cashExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  const categoryStats = cashExpenses.reduce((acc: { [key: string]: number }, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const topCategory = Object.keys(categoryStats).length > 0 
    ? Object.keys(categoryStats).reduce((a, b) => categoryStats[a] > categoryStats[b] ? a : b)
    : 'Ninguna';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0.');
      return;
    }
    if (!description.trim()) {
      alert('Por favor ingrese el detalle del gasto.');
      return;
    }
    if (!authorizedBy.trim()) {
      alert('Por favor ingrese quién autorizó el gasto.');
      return;
    }
    if (!recipient.trim()) {
      alert('Por favor ingrese el destinatario (entregado a).');
      return;
    }

    const sessionToUse = cashSessions.find(
      s => s.status === 'Abierta' && (s.cajaAsociada || 'Caja 1') === targetCaja
    );

    try {
      await addCashExpense({
        amount,
        description: description.trim(),
        authorizedBy: authorizedBy.trim(),
        recipient: recipient.trim(),
        category,
        cajaAsociada: targetCaja,
        sessionId: sessionToUse?.id || undefined
      });

      // Reset Form
      setAmount('');
      setDescription('');
      setAuthorizedBy('');
      setRecipient('');
      setCategory('Suministros');
      setIsModalOpen(false);

      alert('Gasto registrado con éxito y sincronizado con la sesión de caja activa.');
    } catch (err: any) {
      console.error('Error saving expense:', err);
      alert(`Error al guardar gasto: ${err.message}`);
    }
  };

  const handlePrintVoucher = (expense: CashExpense) => {
    setSelectedVoucher(expense);
    setTimeout(() => {
      const printContent = document.getElementById('expense-voucher-print');
      if (printContent) {
        const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        if (winPrint) {
          winPrint.document.write(`
            <html>
              <head>
                <title>COMPROBANTE DE EGRESO - AMBAR CLUB</title>
                <style>
                  body { font-family: 'Courier New', monospace; padding: 20px; color: #000; font-size: 13px; line-height: 1.4; }
                  .title { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px; }
                  .subtitle { text-align: center; font-size: 11px; margin-bottom: 15px; }
                  .separator { border-top: 1px dashed #000; margin: 12px 0; }
                  .row { display: flex; justify-content: space-between; margin: 4px 0; }
                  .bold { font-weight: bold; }
                  .center { text-align: center; }
                  .amount { font-size: 18px; text-align: center; font-weight: bold; margin: 15px 0; border: 1px solid #000; padding: 6px; }
                  .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
                  .sig-box { border-top: 1px solid #000; width: 120px; text-align: center; font-size: 10px; padding-top: 4px; }
                </style>
              </head>
              <body>
                <div class="title">COMPROBANTE DE GASTO / EGRESO</div>
                <div class="separator"></div>
                <div class="row"><span>ID Egreso:</span><span class="bold">${expense.id}</span></div>
                <div class="row"><span>Fecha:</span><span>${new Date(expense.date).toLocaleString('es-ES')}</span></div>
                <div class="row"><span>Caja:</span><span class="bold">${expense.cajaAsociada}</span></div>
                <div class="row"><span>Categoría:</span><span>${expense.category}</span></div>
                <div class="separator"></div>
                <div><span class="bold">Concepto / Detalle:</span></div>
                <div style="margin-top: 5px; min-height: 40px; border: 1px solid #ddd; padding: 6px; border-radius: 4px;">${expense.description}</div>
                <div class="separator"></div>
                <div class="row"><span>Entregado a:</span><span class="bold">${expense.recipient}</span></div>
                <div class="row"><span>Autorizado por:</span><span class="bold">${expense.authorizedBy}</span></div>
                <div class="row"><span>Registrado por:</span><span>${expense.registeredBy}</span></div>
                <div class="amount">Bs ${expense.amount.toFixed(2)} BOB</div>
                <div class="center" style="font-size: 10px; margin-top: 15px;">- Impreso el ${new Date().toLocaleString('es-ES')} -</div>
                <div class="signatures">
                  <div class="sig-box">Entregué conforme</div>
                  <div class="sig-box">Recibí conforme</div>
                </div>
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
            </html>
          `);
          winPrint.document.close();
        }
      }
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="cash-expenses-view">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide font-sans flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span>Gastos y Egresos de Caja</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">SOPORTE FISCAL Y SEGUIMIENTO DE RETIROS DE DINERO Y COMPRAS DIRECTAS</p>
        </div>

        <button
          onClick={() => {
            setTargetCaja(activeSession ? (activeSession.cajaAsociada || 'Caja 1') : 'Caja 1');
            setIsModalOpen(true);
          }}
          className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
          id="add-expense-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Egreso / Gasto</span>
        </button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's total expenses */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Gastos de Caja de Hoy</p>
            <h3 className="text-xl font-bold text-red-400 mt-1">
              Bs {totalExpensesToday.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-mono text-zinc-500 mt-1">Fecha de Hoy: {new Date().toLocaleDateString('es-ES')}</p>
          </div>
          <div className="bg-red-950/20 p-2.5 rounded-lg border border-red-900/40">
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
        </div>

        {/* All-time expenses */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Acumulado Egresos</p>
            <h3 className="text-xl font-bold text-zinc-300 mt-1">
              Bs {totalExpensesAllTime.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] font-mono text-zinc-500 mt-1">{cashExpenses.length} transacciones registradas</p>
          </div>
          <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
            <DollarSign className="w-5 h-5 text-zinc-400" />
          </div>
        </div>

        {/* Top category */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Categoría de Mayor Gasto</p>
            <h3 className="text-xl font-bold text-amber-500 mt-1 uppercase">
              {topCategory}
            </h3>
            <p className="text-[9px] font-mono text-zinc-500 mt-1">
              {topCategory !== 'Ninguna' ? `Bs ${(categoryStats[topCategory] || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} acumulados` : 'Sin registros'}
            </p>
          </div>
          <div className="bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
            <Tag className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters & History List */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-lg">
        {/* Filters bar */}
        <div className="p-4 bg-zinc-900/20 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar gasto (detalle, autorizado, entregado)..."
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 w-full focus:outline-none focus:border-red-900 font-sans transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category filter */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 px-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Categoría:</span>
              <select
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none font-mono font-bold cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="Todas">Todas</option>
                <option value="Suministros">Suministros</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Insumos / Hielo">Insumos / Hielo</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Honorarios">Honorarios</option>
                <option value="Alquileres">Alquileres</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {/* Caja filter */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 px-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">Caja:</span>
              <select
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none font-mono font-bold cursor-pointer"
                value={selectedCajaFilter}
                onChange={(e) => setSelectedCajaFilter(e.target.value)}
              >
                <option value="Todas">Todas</option>
                <option value="Caja 1">Caja 1</option>
                <option value="Caja 2">Caja 2</option>
                <option value="Caja 3">Caja 3</option>
                <option value="Caja 4">Caja 4</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses list Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-zinc-900/40 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-900">
                <th className="p-4 pl-5">Fecha y Hora</th>
                <th className="p-4">Caja</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Detalle / Concepto</th>
                <th className="p-4">Entregado a</th>
                <th className="p-4">Autorizado por</th>
                <th className="p-4 text-right">Monto</th>
                <th className="p-4 text-center pr-5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-600 font-mono">
                    <AlertCircle className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                    <span>No se encontraron registros de gastos que coincidan con los filtros.</span>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="p-4 pl-5 font-mono text-zinc-400">
                      {new Date(exp.date).toLocaleDateString('es-ES')} {new Date(exp.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-mono font-bold text-red-400">{exp.cajaAsociada}</td>
                    <td className="p-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-200 font-sans font-medium max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="p-4 text-zinc-300 font-sans">{exp.recipient}</td>
                    <td className="p-4 text-zinc-300 font-mono text-[11px]">{exp.authorizedBy}</td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      Bs {exp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center pr-5 font-mono">
                      <button
                        onClick={() => handlePrintVoucher(exp)}
                        className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-850 rounded transition-all cursor-pointer"
                        title="Imprimir Comprobante"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-zinc-900 bg-zinc-900/10">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-sans">
                Registrar Egreso de Caja Chica
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">COMPLETE LOS DETALLES PARA EL COMPROBANTE Y ARQUEO GENERAL</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-zinc-300 text-xs">
              {/* Target Caja */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Seleccionar Caja de Origen
                </label>
                <select
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full focus:outline-none focus:border-red-900 cursor-pointer font-mono font-semibold"
                  value={targetCaja}
                  onChange={(e) => setTargetCaja(e.target.value)}
                >
                  <option value="Caja 1">Caja 1</option>
                  <option value="Caja 2">Caja 2</option>
                  <option value="Caja 3">Caja 3</option>
                  <option value="Caja 4">Caja 4</option>
                </select>
                {activeSession && activeSession.cajaAsociada !== targetCaja && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-zinc-500 font-mono text-[9px] leading-snug">
                    <HelpCircle className="w-3 h-3 shrink-0" />
                    <span>Se descontará del saldo de {targetCaja}. Se recomienda usar la caja activa de su turno.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                    Categoría de Gasto
                  </label>
                  <select
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full focus:outline-none focus:border-red-900 cursor-pointer"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Suministros">Suministros</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Insumos / Hielo">Insumos / Hielo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Honorarios">Honorarios</option>
                    <option value="Alquileres">Alquileres</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                    Monto Retirado ({config.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full focus:outline-none focus:border-red-900 font-mono font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                    required
                  />
                </div>
              </div>

              {/* Authorized By */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Quién Autoriza (Ej: Jefe, Gerente)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Marcelo (Propietario)"
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full focus:outline-none focus:border-red-900"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Entregado a (Ej: Proveedor, Mesero)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Proveedor de Hielo, Juan Gomez"
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full focus:outline-none focus:border-red-900"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              {/* Description / Detail */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5 font-bold">
                  Detalle del Gasto (Descripción)
                </label>
                <textarea
                  placeholder="Ej: Compra de 5 bolsas de hielo para barra VIP por emergencia"
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 w-full h-20 focus:outline-none focus:border-red-900 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono rounded-xl transition-all cursor-pointer border border-transparent hover:border-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-red-950/20"
                >
                  Registrar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden container to reference when printing */}
      <div id="expense-voucher-print" className="hidden" />
    </div>
  );
}
