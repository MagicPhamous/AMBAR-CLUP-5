import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MovementType } from '../types';
import { 
  FileText, 
  Calendar, 
  Printer, 
  Search, 
  Boxes, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  X, 
  User, 
  Building2, 
  CheckCircle2, 
  PackageCheck,
  TrendingUp,
  Warehouse
} from 'lucide-react';

interface WarehouseShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WarehouseShiftReportModal({ isOpen, onClose }: WarehouseShiftReportModalProps) {
  const { products, movements, config, currentUser } = useApp();

  // Selected date for shift (default: today's date YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoriesList = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  // Date boundary calculations
  const shiftDates = useMemo(() => {
    const startOfDay = new Date(`${selectedDate}T00:00:00`);
    const endOfDay = new Date(`${selectedDate}T23:59:59.999`);
    return { startOfDay, endOfDay };
  }, [selectedDate]);

  // Calculate detailed product shift stats for chosen date
  const shiftReportData = useMemo(() => {
    const { startOfDay, endOfDay } = shiftDates;

    return products.map(product => {
      const prodMovements = movements.filter(m => m.productId === product.id);

      // Movements on the shift date
      const movementsOnDate = prodMovements.filter(m => {
        const mDate = new Date(m.date);
        return mDate >= startOfDay && mDate <= endOfDay;
      });

      // Movements after the shift date (to reconstruct historical end-of-day stock)
      const movementsAfterDate = prodMovements.filter(m => {
        const mDate = new Date(m.date);
        return mDate > endOfDay;
      });

      let comprasIngresos = 0;
      let despachosCajas = 0;
      let retornosCajas = 0;
      let ajustesMermas = 0;

      movementsOnDate.forEach(m => {
        const obs = (m.observations || '').toLowerCase();
        const type = m.type;

        if (type === MovementType.PURCHASE || type === MovementType.ENTRY || obs.includes('compra') || obs.includes('ingreso')) {
          comprasIngresos += m.quantity;
        } else if (obs.includes('retorno') || obs.includes('devolucion')) {
          retornosCajas += m.quantity;
        } else if (type === MovementType.TRANSFER || obs.includes('traspaso') || obs.includes('despacho') || obs.includes('caja')) {
          despachosCajas += m.quantity;
        } else if (type === MovementType.ADJUSTMENT || type === MovementType.EXIT || obs.includes('merma')) {
          ajustesMermas += (type === MovementType.EXIT || obs.includes('merma')) ? -m.quantity : m.quantity;
        } else {
          // Default fallback by movement direction
          if (m.quantity > 0) comprasIngresos += m.quantity;
          else despachosCajas += Math.abs(m.quantity);
        }
      });

      // Calculate Stock Final at end of chosen shift date by reversing movements that occurred after
      let stockFinalShift = product.quantity || 0;
      movementsAfterDate.forEach(m => {
        const obs = (m.observations || '').toLowerCase();
        const type = m.type;

        const isAdditionToWarehouse = 
          type === MovementType.PURCHASE || 
          type === MovementType.ENTRY || 
          obs.includes('retorno') || 
          obs.includes('devolucion') ||
          (type === MovementType.ADJUSTMENT && m.quantity > 0);

        if (isAdditionToWarehouse) {
          stockFinalShift -= m.quantity;
        } else {
          stockFinalShift += Math.abs(m.quantity);
        }
      });

      // Reconstruct Stock Inicial at 00:00 of shift date
      // StockInicial = StockFinalShift - Compras + Despachos - Retornos - Ajustes
      const stockInicialShift = stockFinalShift - comprasIngresos + despachosCajas - retornosCajas - ajustesMermas;

      return {
        product,
        stockInicialShift: Math.max(0, stockInicialShift),
        comprasIngresos,
        despachosCajas,
        retornosCajas,
        ajustesMermas,
        stockFinalShift: Math.max(0, stockFinalShift),
        movementsOnDate
      };
    });
  }, [products, movements, shiftDates]);

  // Filtered list for display
  const filteredReportData = useMemo(() => {
    return shiftReportData.filter(item => {
      const p = item.product;
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || (p.name || '').toLowerCase().includes(term) || (p.internalCode || '').toLowerCase().includes(term);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [shiftReportData, searchQuery, selectedCategory]);

  // Totals summary
  const summaryTotals = useMemo(() => {
    return shiftReportData.reduce((acc, item) => {
      acc.totalInicial += item.stockInicialShift;
      acc.totalIngresos += item.comprasIngresos;
      acc.totalDespachos += item.despachosCajas;
      acc.totalRetornos += item.retornosCajas;
      acc.totalAjustes += item.ajustesMermas;
      acc.totalFinal += item.stockFinalShift;
      return acc;
    }, {
      totalInicial: 0,
      totalIngresos: 0,
      totalDespachos: 0,
      totalRetornos: 0,
      totalAjustes: 0,
      totalFinal: 0
    });
  }, [shiftReportData]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para imprimir el reporte.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Jornada Almacén - ${selectedDate}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 11px; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
            .header h2 { font-size: 13px; margin: 5px 0 0 0; }
            .header p { font-size: 10px; margin: 2px 0; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; border: 1px solid #000; padding: 8px; }
            .kpis { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f0f0f0; padding: 8px; border: 1px solid #ccc; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
            th, td { border: 1px solid #000; padding: 5px 6px; text-align: left; }
            th { background: #e0e0e0; text-transform: uppercase; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; padding: 0 40px; }
            .sig-box { text-align: center; width: 200px; border-top: 1px solid #000; pt: 5px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REPORTE DE INICIO Y CIERRE DE JORNADA DE ALMACÉN</h1>
            <p>Jornada: <strong>${selectedDate}</strong></p>
            <p>Generado el: ${new Date().toLocaleString('es-BO')}</p>
          </div>

          <div class="meta">
            <div>
              <strong>Responsable Almacén:</strong> ${currentUser?.name || 'Almacenero'}<br>
              <strong>Cargo:</strong> ${currentUser?.role || 'Encargado de Inventario'}
            </div>
            <div class="text-right">
              <strong>Ubicación:</strong> Almacén Central<br>
              <strong>Total Ítems Controlados:</strong> ${shiftReportData.length} productos
            </div>
          </div>

          <div class="kpis">
            <span>INICIO JORNADA: ${summaryTotals.totalInicial} un.</span>
            <span>+ INGRESOS: ${summaryTotals.totalIngresos}</span>
            <span>- DESPACHOS CAJAS: ${summaryTotals.totalDespachos}</span>
            <span>+ RETORNOS CAJAS: ${summaryTotals.totalRetornos}</span>
            <span>CIERRE JORNADA: ${summaryTotals.totalFinal} un.</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto / Categoría</th>
                <th class="text-center">Stock Inicial (00:00)</th>
                <th class="text-center">Ingresos (+)</th>
                <th class="text-center">Salidas Cajas (-)</th>
                <th class="text-center">Retornos (+)</th>
                <th class="text-center">Stock Cierre (Final)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReportData.map(item => `
                <tr>
                  <td>${item.product.internalCode || 'N/A'}</td>
                  <td><strong>${item.product.name}</strong> (${item.product.category})</td>
                  <td class="text-center font-bold">${item.stockInicialShift} un.</td>
                  <td class="text-center">${item.comprasIngresos > 0 ? `+${item.comprasIngresos}` : '-'}</td>
                  <td class="text-center">${item.despachosCajas > 0 ? `-${item.despachosCajas}` : '-'}</td>
                  <td class="text-center">${item.retornosCajas > 0 ? `+${item.retornosCajas}` : '-'}</td>
                  <td class="text-center font-bold">${item.stockFinalShift} un.</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="font-bold" style="background:#f0f0f0;">
                <td colspan="2">TOTALES GENERALES ALMACÉN</td>
                <td class="text-center">${summaryTotals.totalInicial} un.</td>
                <td class="text-center">+${summaryTotals.totalIngresos}</td>
                <td class="text-center">-${summaryTotals.totalDespachos}</td>
                <td class="text-center">+${summaryTotals.totalRetornos}</td>
                <td class="text-center">${summaryTotals.totalFinal} un.</td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <br><br>
              ___________________________<br>
              Firma Almacenero / Encargado<br>
              CI: _______________________
            </div>
            <div class="sig-box">
              <br><br>
              ___________________________<br>
              Firma Administrador / Auditor<br>
              Fecha: ____/____/2026
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800/40 font-bold uppercase">
                  Módulo Almacén
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Reporte de Inventario de Jornada
                </span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight uppercase mt-0.5">
                Reporte de Inicio y Cierre de Jornada de Almacén
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-950/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Reporte</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Date Bar */}
        <div className="p-4 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1.5 px-3 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-zinc-400 font-mono">Jornada:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-white px-2 py-1 rounded-lg focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
            />
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 font-bold font-mono px-2 py-0.5 rounded border border-emerald-800/40">
                HOY (EN CURSO)
              </span>
            )}
          </div>

          {/* Search & Category filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código o producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics / KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-zinc-950 border-b border-zinc-800 shrink-0 font-mono text-xs">
          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold mb-0.5">Stock Inicio (00:00)</span>
            <div className="text-lg font-bold text-white">{summaryTotals.totalInicial} <span className="text-[10px] text-zinc-500 font-normal">un.</span></div>
          </div>

          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-emerald-400 uppercase block font-semibold mb-0.5">+ Compras / Ingresos</span>
            <div className="text-lg font-bold text-emerald-400">+{summaryTotals.totalIngresos}</div>
          </div>

          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-amber-400 uppercase block font-semibold mb-0.5">- Despachos a Cajas</span>
            <div className="text-lg font-bold text-amber-400">-{summaryTotals.totalDespachos}</div>
          </div>

          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-blue-400 uppercase block font-semibold mb-0.5">+ Retornos de Cajas</span>
            <div className="text-lg font-bold text-blue-400">+{summaryTotals.totalRetornos}</div>
          </div>

          <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 uppercase block font-semibold mb-0.5">Ajustes / Mermas</span>
            <div className="text-lg font-bold text-zinc-300">{summaryTotals.totalAjustes >= 0 ? `+${summaryTotals.totalAjustes}` : summaryTotals.totalAjustes}</div>
          </div>

          <div className="bg-gradient-to-br from-zinc-900 to-amber-950/40 p-3 rounded-xl border border-amber-800/40">
            <span className="text-[10px] text-amber-400 uppercase block font-semibold mb-0.5">Stock Cierre (Final)</span>
            <div className="text-lg font-bold text-amber-300">{summaryTotals.totalFinal} <span className="text-[10px] text-zinc-500 font-normal">un.</span></div>
          </div>
        </div>

        {/* Main Product Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/50">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3">Producto / Categoría</th>
                  <th className="py-3 px-3 text-center bg-zinc-900/80 text-white font-bold">Stock Inicio Jornada</th>
                  <th className="py-3 px-3 text-center text-emerald-400">Ingresos (+)</th>
                  <th className="py-3 px-3 text-center text-amber-400">Salidas Cajas (-)</th>
                  <th className="py-3 px-3 text-center text-blue-400">Retornos (+)</th>
                  <th className="py-3 px-3 text-center text-zinc-300">Ajustes (+/-)</th>
                  <th className="py-3 px-3 text-center bg-amber-950/40 text-amber-300 font-bold border-l border-amber-900/40">Stock Cierre Jornada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredReportData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500 text-xs">
                      No se encontraron productos para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredReportData.map(item => (
                    <tr key={item.product.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-zinc-400">
                        {item.product.internalCode || 'N/A'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{item.product.name}</div>
                        <div className="text-[10px] text-zinc-500">{item.product.category}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white bg-zinc-900/40 text-sm">
                        {item.stockInicialShift} un.
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-400">
                        {item.comprasIngresos > 0 ? `+${item.comprasIngresos}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-400">
                        {item.despachosCajas > 0 ? `-${item.despachosCajas}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-blue-400">
                        {item.retornosCajas > 0 ? `+${item.retornosCajas}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-400">
                        {item.ajustesMermas !== 0 ? (item.ajustesMermas > 0 ? `+${item.ajustesMermas}` : item.ajustesMermas) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-300 bg-amber-950/20 text-sm border-l border-amber-900/30">
                        {item.stockFinalShift} un.
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-950 font-bold text-white text-xs border-t-2 border-zinc-800">
                  <td colSpan={2} className="py-3 px-3 uppercase tracking-wider">TOTALES ALMACÉN CENTRAL</td>
                  <td className="py-3 px-3 text-center text-white bg-zinc-900 text-sm">{summaryTotals.totalInicial} un.</td>
                  <td className="py-3 px-3 text-center text-emerald-400">+{summaryTotals.totalIngresos}</td>
                  <td className="py-3 px-3 text-center text-amber-400">-{summaryTotals.totalDespachos}</td>
                  <td className="py-3 px-3 text-center text-blue-400">+{summaryTotals.totalRetornos}</td>
                  <td className="py-3 px-3 text-center text-zinc-300">{summaryTotals.totalAjustes}</td>
                  <td className="py-3 px-3 text-center text-amber-300 bg-amber-950/40 text-sm border-l border-amber-900/40">{summaryTotals.totalFinal} un.</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <span>Generado por: <strong className="text-white">{currentUser?.name || 'Almacenero'}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors cursor-pointer"
            >
              Cerrar Reporte
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
