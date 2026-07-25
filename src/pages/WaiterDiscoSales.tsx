/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, isPhysicalProduct } from '../types';
import { 
  Sparkles, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  Check, 
  Clock, 
  AlertTriangle, 
  Upload, 
  Eye, 
  FileText,
  BadgeAlert,
  HelpCircle,
  X,
  Search
} from 'lucide-react';

export default function WaiterDiscoSales() {
  const { products, config, currentUser, submitWaiterReport, waiterReports, cashSessions } = useApp();

  // Selected products cart for report
  const [reportCart, setReportCart] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[]>([]);

  // Form states
  const [targetCaja, setTargetCaja] = useState('Caja 1');
  const [paymentMethod, setPaymentMethod] = useState('Pago QR');
  const [observations, setObservations] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Stock warning modal state
  const [stockModalData, setStockModalData] = useState<{
    productName: string;
    requestedQty: number;
    availableInTarget: number;
    targetCaja: string;
    otherLocations: { name: string; count: number }[];
  } | null>(null);

  // Helper to determine stock in other Cajas or Central Warehouse
  const getLocationsWithStock = (prod: any, currentCaja: string) => {
    const locs: { name: string; count: number }[] = [];
    const cajaSet = new Set(['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4']);
    if (prod.cajaStock) {
      Object.keys(prod.cajaStock).forEach(k => cajaSet.add(k));
    }
    cashSessions.forEach(s => {
      if (s.cajaAsociada) cajaSet.add(s.cajaAsociada);
    });

    Array.from(cajaSet).sort().forEach(cName => {
      if (cName === currentCaja) return;
      const stock = prod.cajaStock?.[cName] ?? 0;
      if (stock > 0) {
        locs.push({ name: cName, count: stock });
      }
    });

    if ((prod.quantity ?? 0) > 0) {
      locs.push({ name: 'Almacén Central', count: prod.quantity });
    }

    return locs;
  };

  // Helper to determine if a specific Caja has an active/open session
  const isCajaOpen = (cajaName: string) => {
    return cashSessions.some(s => s.status === 'Abierta' && (s.cajaAsociada || 'Caja 1') === cajaName);
  };

  // Filter products that are active and have positive warehouse quantity (though they are deducted from specific Caja stock on approval)
  const activeProducts = products.filter(p => p.isActive);
  
  const filteredProducts = activeProducts.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.internalCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const isPhysA = isPhysicalProduct(a);
    const isPhysB = isPhysicalProduct(b);
    const stockA = isPhysA ? (a.cajaStock?.[targetCaja] ?? a.quantity ?? 0) : 999;
    const stockB = isPhysB ? (b.cajaStock?.[targetCaja] ?? b.quantity ?? 0) : 999;
    const hasStockA = stockA > 0 ? 1 : 0;
    const hasStockB = stockB > 0 ? 1 : 0;
    if (hasStockA !== hasStockB) return hasStockB - hasStockA;
    if (stockB !== stockA) return stockB - stockA;
    return a.name.localeCompare(b.name);
  });

  const addToCart = (product: any) => {
    setReportCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setReportCart(prev => 
      prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, subtotal: newQty * item.price };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setReportCart(prev => prev.filter(item => item.productId !== productId));
  };

  const totalAmount = reportCart.reduce((acc, item) => acc + item.subtotal, 0);

  // Utility to compress and scale down base64 images to prevent Firestore size limit issues (1MB)
  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  // Base64 file uploader logic
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We allow files up to 10MB since we compress them client-side anyway
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen de prueba es muy grande. El tamaño máximo es 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Raw = reader.result as string;
      try {
        const compressed = await compressImage(base64Raw);
        setImagePreview(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
        setImagePreview(base64Raw);
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick simulated mockup receipt generator
  const handleSimulateReceipt = () => {
    // We generate a beautiful vector-canvas base64 mock receipt
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 300, 400);
      
      // header border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(300, 0);
      ctx.stroke();

      // watermark stamp
      ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.beginPath();
      ctx.arc(150, 200, 80, 0, Math.PI * 2);
      ctx.fill();

      // Brand Title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMBAR CLUB - VIP DISCO', 150, 40);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('COMPROBANTE SIMULADO DE PAGO', 150, 60);

      // Divider line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(15, 80);
      ctx.lineTo(285, 80);
      ctx.stroke();

      // Info Details
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Mesero: ${currentUser?.name || 'Mesero'}`, 20, 105);
      ctx.fillText(`Caja Destino: ${targetCaja}`, 20, 125);
      ctx.fillText(`Método Pago: ${paymentMethod}`, 20, 145);
      ctx.fillText(`Fecha: ${new Date().toLocaleDateString()}`, 20, 165);

      // Divider
      ctx.beginPath();
      ctx.moveTo(15, 185);
      ctx.lineTo(285, 185);
      ctx.stroke();

      // Items purchased header
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Detalle', 20, 210);
      ctx.textAlign = 'right';
      ctx.fillText('Total', 280, 210);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#475569';
      let y = 235;
      reportCart.forEach(item => {
        if (y < 310) {
          ctx.textAlign = 'left';
          ctx.fillText(`${item.quantity}x ${item.productName.substring(0, 18)}`, 20, y);
          ctx.textAlign = 'right';
          ctx.fillText(`${item.subtotal.toFixed(2)}`, 280, y);
          y += 20;
        }
      });

      // Bottom Divider
      ctx.setLineDash([]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(15, 320);
      ctx.lineTo(285, 320);
      ctx.stroke();

      // Total label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('TOTAL COMPRA', 20, 345);
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`${totalAmount.toFixed(2)} ${config.currency}`, 280, 345);

      // Receipt ID / QR Code simulated
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`TRANS-ID: QR-${Math.floor(100000 + Math.random() * 900000)}`, 150, 380);
    }
    setImagePreview(canvas.toDataURL('image/jpeg'));
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportCart.length === 0) {
      setErrorMessage('Debe agregar al menos un producto a la comanda de venta.');
      return;
    }
    if (!imagePreview && paymentMethod !== 'Efectivo') {
      setErrorMessage('Es un requisito indispensable adjuntar una prueba de pago (Foto de comprobante de transferencia, depósito o QR).');
      return;
    }

    // Block submission if selected caja has no open session
    if (!isCajaOpen(targetCaja)) {
      setErrorMessage(`La ${targetCaja} se encuentra cerrada. No es posible enviar comisiones o reportes de venta a cajas inactivas. Por favor, selecciona una caja activa.`);
      return;
    }

    // Validate stock per product in targetCaja
    for (const item of reportCart) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && isPhysicalProduct(prod)) {
        const stockInTarget = prod.cajaStock?.[targetCaja] ?? 0;
        if (stockInTarget < item.quantity) {
          const otherLocations = getLocationsWithStock(prod, targetCaja);
          
          setStockModalData({
            productName: prod.name,
            requestedQty: item.quantity,
            availableInTarget: stockInTarget,
            targetCaja,
            otherLocations
          });

          let locMsg = '';
          if (otherLocations.length > 0) {
            locMsg = ` Stock disponible en otros puntos: ${otherLocations.map(l => `${l.name} (${l.count} un.)`).join(', ')}.`;
          } else {
            locMsg = ' Tampoco existe stock registrado en ninguna otra caja ni en Almacén Central.';
          }

          setErrorMessage(`⚠️ No hay stock suficiente de "${prod.name}" en ${targetCaja} (Solo hay ${stockInTarget} un. y solicitas ${item.quantity} un.).${locMsg}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitWaiterReport({
        targetCaja,
        items: reportCart,
        paymentMethod,
        imageUrl: imagePreview,
        total: totalAmount,
        observations: observations.trim() || undefined
      });

      setSuccessMessage(`¡Reporte de venta disco enviado correctamente a la ${targetCaja}! Espera la aprobación en caja.`);
      setReportCart([]);
      setObservations('');
      setImagePreview(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al enviar el reporte. Por favor reintente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only display reports submitted by the active logged-in waiter
  const myReports = waiterReports.filter(r => r.waiterId === currentUser?.uid);

  return (
    <div className="space-y-6 animate-fade-in" id="waiter-disco-container">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl" />
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Reportar Venta Directa en Zonas Disco
          </h2>
          <p className="text-xs text-zinc-400">
            Registra una venta rápida realizada en la pista de baile, barras libres o sectores de la discoteca. Informa al cajero de turno para descontar de su stock y conciliar el cobro.
          </p>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Cart (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmitReport} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-5 shadow-lg">
            <div className="border-b border-zinc-900 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">1. Registrar Productos Vendidos</h3>
              <span className="text-[10px] font-mono text-amber-500 font-bold bg-amber-950/20 border border-amber-900/30 px-2.5 py-0.5 rounded">ZONA DISCO</span>
            </div>

            {/* Error and Success alerts */}
            {errorMessage && (
              <div className="bg-red-950/30 border border-red-900/30 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Search and Picker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Product search & list */}
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar bebida o producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="bg-zinc-950/50 border border-zinc-900 rounded-lg max-h-60 overflow-y-auto divide-y divide-zinc-900 custom-scrollbar">
                  {filteredProducts.map(prod => {
                    const isPhys = isPhysicalProduct(prod);
                    const targetStock = isPhys ? (prod.cajaStock?.[targetCaja] ?? 0) : 999;
                    const otherLocations = isPhys ? getLocationsWithStock(prod, targetCaja) : [];
                    const isOutOfStock = isPhys && targetStock <= 0;

                    return (
                      <div key={prod.id} className="p-2.5 flex flex-col gap-1 text-xs hover:bg-zinc-900/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 pr-2">
                            <p className="font-sans font-medium text-white">{prod.name}</p>
                            <p className="text-[10px] font-mono text-zinc-400">
                              {prod.price.toFixed(2)} {config.currency} • {isPhys ? (
                                <>Stock <span className="text-zinc-300 font-semibold">{targetCaja}:</span> <strong className={targetStock > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{targetStock} un.</strong></>
                              ) : (
                                <span className="text-emerald-400 font-semibold">Disponible (Servicio)</span>
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(prod)}
                            className="bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/40 text-amber-400 p-1.5 rounded cursor-pointer transition-colors flex items-center gap-1 text-[10px] font-mono shrink-0"
                            title="Agregar a la comanda"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        </div>

                        {isOutOfStock && (
                          <div className="bg-red-950/30 border border-red-900/30 p-1.5 rounded text-[9.5px] font-mono text-red-300 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Sin stock en {targetCaja}.</span>
                              {otherLocations.length > 0 ? (
                                <span className="text-amber-300 block mt-0.5">
                                  Disp. en: {otherLocations.map(l => `${l.name} (${l.count} un.)`).join(' • ')}
                                </span>
                              ) : (
                                <span className="text-zinc-500 block mt-0.5">Sin stock en ninguna otra caja ni almacén.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                      No coincide ningún producto.
                    </div>
                  )}
                </div>
              </div>

              {/* Cart contents */}
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3.5 flex flex-col justify-between min-h-[220px]">
                <div className="space-y-3 overflow-y-auto max-h-56 custom-scrollbar">
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Resumen de Comanda</h4>
                  {reportCart.map(item => {
                    const prod = products.find(p => p.id === item.productId);
                    const isPhys = prod ? isPhysicalProduct(prod) : false;
                    const targetStock = isPhys ? (prod?.cajaStock?.[targetCaja] ?? 0) : 999;
                    const isInsufficient = isPhys && item.quantity > targetStock;
                    const otherLocations = (prod && isPhys) ? getLocationsWithStock(prod, targetCaja) : [];

                    return (
                      <div key={item.productId} className="space-y-1 border-b border-zinc-900/50 pb-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-white truncate font-sans font-medium">{item.productName}</p>
                            <p className="text-[10px] text-zinc-400">
                              {item.price.toFixed(2)} {config.currency} • Subtotal: {item.subtotal.toFixed(2)} {config.currency}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, -1)}
                                className="p-1 hover:text-white text-zinc-400"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className={`px-1.5 text-xs min-w-[20px] text-center font-bold ${isInsufficient ? 'text-red-400 bg-red-950/50' : 'text-white'}`}>
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, 1)}
                                className="p-1 hover:text-white text-zinc-400"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.productId)}
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isInsufficient && (
                          <div className="bg-red-950/40 border border-red-900/50 p-2 rounded text-[10px] font-mono text-red-300 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-red-400">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>¡Sin stock suficiente en {targetCaja}! ({targetStock} un. disp.)</span>
                            </div>
                            {otherLocations.length > 0 ? (
                              <div className="text-amber-300 text-[9.5px]">
                                <span className="font-semibold text-zinc-300">Disponible en otros puntos:</span>
                                <div className="mt-0.5 space-y-0.5 text-amber-200">
                                  {otherLocations.map((l, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[9px]">
                                      <span>• {l.name}:</span>
                                      <span className="font-bold">{l.count} un.</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[9px] text-zinc-400">Sin existencias en otras cajas ni en Almacén Central.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {reportCart.length === 0 && (
                    <div className="h-28 flex flex-col items-center justify-center text-center text-zinc-600 space-y-1">
                      <FileText className="w-8 h-8 text-zinc-700" />
                      <p className="text-[10px] font-mono uppercase">Comanda vacía</p>
                      <p className="text-[9px] text-zinc-500">Agrega productos del buscador izquierdo</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-900 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Monto Total:</span>
                  <span className="text-base font-mono font-black text-emerald-400">
                    {totalAmount.toFixed(2)} {config.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Inform details */}
            <div className="space-y-4 pt-2 border-t border-zinc-900">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">2. Canalización de Cobro y Comprobante</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Caja and payment details */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Enviar a la Caja:</label>
                    <select
                      value={targetCaja}
                      onChange={(e) => setTargetCaja(e.target.value)}
                      className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 ${!isCajaOpen(targetCaja) ? 'border-red-900/50 text-red-300' : 'border-zinc-800'}`}
                    >
                      <option value="Caja 1">Caja 1 — {isCajaOpen('Caja 1') ? '🟢 ABIERTA' : '🔴 CERRADA'}</option>
                      <option value="Caja 2">Caja 2 — {isCajaOpen('Caja 2') ? '🟢 ABIERTA' : '🔴 CERRADA'}</option>
                      <option value="Caja 3">Caja 3 — {isCajaOpen('Caja 3') ? '🟢 ABIERTA' : '🔴 CERRADA'}</option>
                      <option value="Caja 4">Caja 4 — {isCajaOpen('Caja 4') ? '🟢 ABIERTA' : '🔴 CERRADA'}</option>
                    </select>
                    {!isCajaOpen(targetCaja) && (
                      <div className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 p-2 rounded flex items-center gap-1.5 mt-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>¡Atención! Esta caja está cerrada. Por favor, selecciona una caja activa.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Método de Pago Utilizado:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Pago QR">Pago QR Directo</option>
                      <option value="Efectivo">Efectivo en Mano</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Tarjeta de Crédito">Tarjeta de Crédito / Débito</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase">Observaciones o Notas:</label>
                    <textarea
                      placeholder="Ej. Entregado al cliente de la mesa 12 que caminaba por pista, o código de transferencia..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* File uploader and simulated generator */}
                <div className="bg-zinc-900/10 border border-zinc-900 border-dashed rounded-lg p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                        Comprobante de Pago
                        {paymentMethod !== 'Efectivo' ? (
                          <span className="text-red-500 font-bold">*</span>
                        ) : (
                          <span className="text-zinc-500 text-[9px] font-normal">(Opcional en Efectivo)</span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={handleSimulateReceipt}
                        disabled={reportCart.length === 0}
                        className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-900/40 text-amber-400 bg-amber-950/20 hover:bg-amber-950/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Genera un ticket simulado en un click para probar de forma rápida"
                      >
                        Generar Simulado
                      </button>
                    </div>

                    {!imagePreview ? (
                      <div className="border border-zinc-850 bg-zinc-950/40 rounded-lg h-36 flex flex-col items-center justify-center p-3 text-center space-y-2 relative hover:bg-zinc-900/20 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-7 h-7 text-zinc-600 animate-bounce" />
                        <div>
                          <p className="text-[11px] text-zinc-300 font-bold">Carga captura o foto de pago</p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Formatos soportados: JPG, PNG • Max 2MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-zinc-800 bg-zinc-900/30 rounded-lg h-36 relative overflow-hidden flex items-center justify-center group">
                        <img 
                          src={imagePreview} 
                          alt="Prueba de pago" 
                          className="h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewingReceiptUrl(imagePreview)}
                            className="bg-zinc-900 p-1.5 rounded text-white hover:text-amber-400 border border-zinc-800"
                            title="Expandir imagen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setImagePreview(null)}
                            className="bg-zinc-900 p-1.5 rounded text-red-400 hover:text-red-300 border border-zinc-800"
                            title="Eliminar comprobante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-zinc-500 font-sans mt-2">
                    <span className="font-bold text-amber-500">Nota:</span> La caja validará visualmente que la transferencia o QR se haya realizado correctamente en su banca móvil antes de descontar del almacén físico.
                  </span>
                </div>

              </div>
            </div>

            {/* Submit report button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || reportCart.length === 0 || (!imagePreview && paymentMethod !== 'Efectivo')}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-500/10 text-white rounded-lg font-bold py-2.5 font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Enviando reporte a la caja...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Reporte de Venta a {targetCaja}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Submitted Reports list (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 shadow-lg min-h-[300px]">
            <div>
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">Mis Reportes de Turno</h3>
              <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Control en tiempo real de aprobaciones</p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1 custom-scrollbar">
              {myReports.map(report => {
                const isPending = report.status === 'pendiente';
                const isApproved = report.status === 'aprobado';
                const isRejected = report.status === 'rechazado';

                return (
                  <div 
                    key={report.id}
                    className={`p-3.5 border rounded-xl space-y-3 transition-all relative overflow-hidden bg-zinc-950/20 ${isPending ? 'border-amber-900/30' : isApproved ? 'border-emerald-900/20 shadow-emerald-950/5' : 'border-red-900/20'}`}
                    id={`rep-card-${report.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase">{new Date(report.date).toLocaleTimeString()}</span>
                        <p className="text-xs font-bold text-white">{report.targetCaja}</p>
                      </div>

                      {/* Status Badge */}
                      {isPending ? (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-amber-900/40 text-amber-500 bg-amber-950/20 animate-pulse font-bold uppercase">
                          Pendiente
                        </span>
                      ) : isApproved ? (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-emerald-900/30 text-emerald-400 bg-emerald-950/20 font-bold uppercase">
                          Aprobado
                        </span>
                      ) : (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-red-900/30 text-red-400 bg-red-950/20 font-bold uppercase">
                          Rechazado
                        </span>
                      )}
                    </div>

                    {/* Products details */}
                    <div className="space-y-1 bg-zinc-900/10 p-2 border border-zinc-900/60 rounded">
                      {report.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span className="truncate max-w-[150px]">{it.quantity}x {it.productName}</span>
                          <span>{it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono pt-1">
                      <div className="flex items-center gap-1.5">
                        {report.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingReceiptUrl(report.imageUrl || null)}
                            className="text-[9px] text-zinc-400 hover:text-amber-400 flex items-center gap-0.5 border border-zinc-850 px-1.5 py-0.5 rounded bg-zinc-900/50"
                          >
                            <Eye className="w-3 h-3" /> Ver Pago
                          </button>
                        )}
                        <span className="text-[9px] text-zinc-500">{report.paymentMethod}</span>
                      </div>
                      <span className="font-bold text-white text-xs">{report.total.toFixed(2)} {config.currency}</span>
                    </div>

                    {report.observations && (
                      <div className="text-[9px] font-mono text-zinc-500 bg-zinc-900/20 p-1.5 border border-zinc-900 border-dashed rounded italic">
                        Nota: {report.observations}
                      </div>
                    )}
                  </div>
                );
              })}

              {myReports.length === 0 && (
                <div className="h-44 border border-zinc-900 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                  <BadgeAlert className="w-7 h-7 text-zinc-700" />
                  <div>
                    <p className="text-[10px] font-mono uppercase font-bold text-zinc-400">No hay reportes hoy</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Usa la comanda de la izquierda para notificar tu primera venta disco.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Image expand Modal */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full overflow-hidden p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase">Comprobante / Captura de Pago</h3>
              <button 
                onClick={() => setViewingReceiptUrl(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl overflow-hidden p-2 flex items-center justify-center max-h-[450px]">
              <img 
                src={viewingReceiptUrl} 
                alt="Comprobante ampliado" 
                className="max-h-[400px] object-contain rounded-lg"
              />
            </div>
            <div className="text-center">
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-800 uppercase"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Warning & Location Suggestions Modal */}
      {stockModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-red-900/60 rounded-2xl max-w-md w-full overflow-hidden p-6 space-y-5 shadow-2xl shadow-red-950/50">
            <div className="flex items-start gap-3 border-b border-zinc-900 pb-4">
              <div className="p-2.5 bg-red-950/50 border border-red-900/50 rounded-xl text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Stock Insuficiente en {stockModalData.targetCaja}
                </h3>
                <p className="text-xs text-zinc-400">
                  No es posible enviar la comanda a <strong className="text-white">{stockModalData.targetCaja}</strong> porque no cuenta con la cantidad requerida de este producto.
                </p>
              </div>
            </div>

            {/* Item info */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Producto:</span>
                <span className="text-white font-sans font-bold text-sm">{stockModalData.productName}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/60 pt-2">
                <span className="text-zinc-400">Cantidad Requerida:</span>
                <span className="text-amber-400 font-bold">{stockModalData.requestedQty} unidad(es)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Stock en {stockModalData.targetCaja}:</span>
                <span className="text-red-400 font-bold">{stockModalData.availableInTarget} unidad(es)</span>
              </div>
            </div>

            {/* Availability in other cajas */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Ubicaciones donde SÍ existe Stock:
              </h4>

              {stockModalData.otherLocations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {stockModalData.otherLocations.map((loc, idx) => (
                    <div 
                      key={idx}
                      className="bg-zinc-900/80 border border-amber-900/30 p-3 rounded-xl flex items-center justify-between text-xs font-mono hover:border-amber-500/50 transition-all"
                    >
                      <div>
                        <span className="text-white font-bold font-sans block">{loc.name}</span>
                        <span className="text-[10px] text-zinc-400">Existencias disponibles: <strong className="text-emerald-400">{loc.count} unidades</strong></span>
                      </div>
                      {loc.name !== 'Almacén Central' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCaja(loc.name);
                            setStockModalData(null);
                            setErrorMessage(null);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-[10px] font-mono cursor-pointer shadow transition-all shrink-0"
                        >
                          Cambiar a {loc.name}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl text-center text-xs font-mono text-zinc-500">
                  ⚠️ No hay stock registrado de este producto en ninguna otra caja ni en Almacén Central.
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStockModalData(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold py-2.5 rounded-xl border border-zinc-800 cursor-pointer transition-colors"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
