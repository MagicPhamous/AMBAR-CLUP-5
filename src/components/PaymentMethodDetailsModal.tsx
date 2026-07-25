import React, { useState, useMemo } from 'react';
import { Sale } from '../types';
import { parsePaymentCategory, PaymentCategory } from '../utils/paymentUtils';
import { 
  X, 
  Coins, 
  CreditCard, 
  QrCode, 
  Building2, 
  Receipt, 
  Package, 
  Search,
  User,
  Clock,
  ExternalLink
} from 'lucide-react';

interface PaymentMethodDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: PaymentCategory | null;
  sales: Sale[];
  titleContext?: string;
}

export const PaymentMethodDetailsModal: React.FC<PaymentMethodDetailsModalProps> = ({
  isOpen,
  onClose,
  category,
  sales,
  titleContext
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'transactions'>('products');
  const [searchTerm, setSearchTerm] = useState('');

  const categoryDetails = useMemo(() => {
    if (!category) return { label: '', color: '', icon: Coins, border: '', bg: '' };
    switch (category) {
      case 'efectivo':
        return {
          label: 'EFECTIVO',
          subtitle: 'Efectivo Físico en Caja',
          color: 'text-emerald-400',
          icon: Coins,
          border: 'border-emerald-800/60',
          bg: 'bg-emerald-950/40'
        };
      case 'qr':
        return {
          label: 'PAGO QR',
          subtitle: 'Transferencia por QR / Banco Digital',
          color: 'text-cyan-400',
          icon: QrCode,
          border: 'border-cyan-800/60',
          bg: 'bg-cyan-950/40'
        };
      case 'tarjeta':
        return {
          label: 'TARJETA DE CRÉDITO / DÉBITO',
          subtitle: 'Cobros por Terminal POS / Tarjeta',
          color: 'text-indigo-400',
          icon: CreditCard,
          border: 'border-indigo-800/60',
          bg: 'bg-indigo-950/40'
        };
      case 'transferencia':
        return {
          label: 'TRANSFERENCIA BANCARIA',
          subtitle: 'Depósito o Transferencia Directa',
          color: 'text-purple-400',
          icon: Building2,
          border: 'border-purple-800/60',
          bg: 'bg-purple-950/40'
        };
    }
  }, [category]);

  const filteredSales = useMemo(() => {
    if (!category) return [];
    return (sales || []).filter(s => parsePaymentCategory(s.paymentMethod) === category);
  }, [sales, category]);

  const totalAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  }, [filteredSales]);

  // Consolidate products sold for this payment method
  const consolidatedProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; subtotal: number; avgUnitPrice: number }>();

    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.productName || 'Producto sin nombre';
        const qty = item.quantity || 0;
        const sub = item.subtotal || (qty * (item.unitPrice || 0));
        
        if (map.has(name)) {
          const current = map.get(name)!;
          current.quantity += qty;
          current.subtotal += sub;
        } else {
          map.set(name, {
            name,
            quantity: qty,
            subtotal: sub,
            avgUnitPrice: item.unitPrice || (qty > 0 ? sub / qty : 0)
          });
        }
      });
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.subtotal - a.subtotal); // Sort by highest revenue
    return list;
  }, [filteredSales]);

  const totalUnitsSold = useMemo(() => {
    return consolidatedProducts.reduce((sum, p) => sum + p.quantity, 0);
  }, [consolidatedProducts]);

  // Search filter
  const displayedProducts = useMemo(() => {
    if (!searchTerm.trim()) return consolidatedProducts;
    const term = searchTerm.toLowerCase();
    return consolidatedProducts.filter(p => p.name.toLowerCase().includes(term));
  }, [consolidatedProducts, searchTerm]);

  const displayedTransactions = useMemo(() => {
    if (!searchTerm.trim()) return filteredSales;
    const term = searchTerm.toLowerCase();
    return filteredSales.filter(s => {
      const ticket = (s.ticketNumber || s.id || '').toLowerCase();
      const waiter = (s.waiterName || s.userName || '').toLowerCase();
      const pm = (s.paymentMethod || '').toLowerCase();
      const itemsMatch = (s.items || []).some(it => (it.productName || '').toLowerCase().includes(term));
      return ticket.includes(term) || waiter.includes(term) || pm.includes(term) || itemsMatch;
    });
  }, [filteredSales, searchTerm]);

  if (!isOpen || !category) return null;

  const IconComp = categoryDetails.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b border-zinc-900 ${categoryDetails.bg} flex justify-between items-start gap-4`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-zinc-900 border ${categoryDetails.border} shadow-inner`}>
              <IconComp className={`w-6 h-6 ${categoryDetails.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-mono font-bold uppercase tracking-wider ${categoryDetails.color}`}>
                  Detalle de Ventas: {categoryDetails.label}
                </h3>
                {titleContext && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {titleContext}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                {categoryDetails.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-zinc-900 bg-zinc-900/40 border-b border-zinc-900 font-mono text-center py-2.5 px-4 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Total Recaudado</span>
            <span className={`font-bold text-sm sm:text-base ${categoryDetails.color}`}>
              Bs {totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Transacciones / Comandas</span>
            <span className="font-bold text-sm sm:text-base text-white">
              {filteredSales.length} {filteredSales.length === 1 ? 'venta' : 'ventas'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Productos Vendidos</span>
            <span className="font-bold text-sm sm:text-base text-amber-400">
              {totalUnitsSold} u.
            </span>
          </div>
        </div>

        {/* Controls: Search & Tabs */}
        <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex flex-col sm:flex-row gap-3 justify-between items-center">
          {/* Tabs */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'products'
                  ? 'bg-zinc-800 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Productos ({consolidatedProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'transactions'
                  ? 'bg-zinc-800 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Comandas / Ventas ({filteredSales.length})</span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar trago, ticket o mesero..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 font-mono transition-colors"
            />
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {activeTab === 'products' ? (
            /* TAB 1: CONSOLIDATED PRODUCTS */
            displayedProducts.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-sans">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No se encontraron productos registrados con {categoryDetails.label}.</p>
              </div>
            ) : (
              <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-900/30">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Producto / Trago</th>
                      <th className="p-3 text-center">Cant. Vendida</th>
                      <th className="p-3 text-right">Precio Prom.</th>
                      <th className="p-3 text-right">Subtotal Recaudado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {displayedProducts.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
                          <span>{prod.name}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-amber-400">
                          {prod.quantity} u.
                        </td>
                        <td className="p-3 text-right text-zinc-400">
                          Bs {(prod.subtotal / (prod.quantity || 1)).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          Bs {prod.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB 2: INDIVIDUAL TRANSACTIONS */
            displayedTransactions.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-sans">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No hay ventas ni comandas registradas con {categoryDetails.label}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTransactions.map((sale) => {
                  const saleTime = sale.date ? sale.date.substring(11, 16) : '--:--';
                  const saleDateStr = sale.date ? sale.date.substring(0, 10) : '';

                  return (
                    <div 
                      key={sale.id}
                      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 space-y-2 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-zinc-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2 py-0.5 rounded text-[10px]">
                            {sale.ticketNumber || sale.id.substring(0, 8)}
                          </span>
                          <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{saleTime} ({saleDateStr})</span>
                          </span>
                          {sale.tableId && (
                            <span className="text-cyan-400 text-[10px] bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                              {sale.tableId}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-[10px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                            Método: <strong className="text-white">{sale.paymentMethod}</strong>
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">
                            Bs {sale.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Waiter / Cashier info */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-zinc-500" />
                          <span>Atendió: <strong className="text-zinc-200">{sale.waiterName || sale.userName || 'Sistema'}</strong></span>
                        </div>
                        {sale.description && (
                          <span className="italic text-zinc-500">"{sale.description}"</span>
                        )}
                      </div>

                      {/* Items sold in this transaction */}
                      <div className="bg-zinc-950/80 border border-zinc-850 rounded-lg p-2 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">Productos de esta comanda / venta:</div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {(sale.items || []).map((it, idx) => (
                            <span 
                              key={idx}
                              className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1"
                            >
                              <span className="font-bold text-amber-400">{it.quantity}x</span>
                              <span>{it.productName}</span>
                              <span className="text-zinc-500 text-[10px]">(Bs {(it.subtotal || (it.quantity * it.unitPrice)).toFixed(2)})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-zinc-900 bg-zinc-950 flex justify-between items-center text-xs font-mono text-zinc-400">
          <span>Mostrando {filteredSales.length} movimiento(s) de {categoryDetails.label}</span>
          <button
            onClick={onClose}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-1.5 rounded-xl border border-zinc-800 transition-colors"
          >
            Cerrar Detalle
          </button>
        </div>

      </div>
    </div>
  );
};
