/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { MovementType, Product, UserRole, isPhysicalProduct } from '../types';
import { getRecipeIngredients, isOpeningControlledProduct } from '../utils/recipeUtils';
import { parsePaymentCategory } from '../utils/paymentUtils';
import { 
  FileText, 
  User, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Boxes, 
  Gift, 
  AlertTriangle, 
  Plus, 
  Minus, 
  RefreshCw, 
  Printer, 
  Save, 
  Search, 
  CheckCircle2, 
  History,
  Eye,
  X,
  FileSpreadsheet,
  Sliders,
  Lock,
  Unlock,
  Coins,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  TrendingDown,
  ShieldAlert,
  Wine,
  UserCheck,
  Users
} from 'lucide-react';

interface SheetRowState {
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  initialStock: number;
  entradas: number;
  consumoNoche: number;
  promos: number;
  botellasAbiertas: number;
  botellasVacias: number;
  cortesias: number;
  fisicoEnBarra: number; // physical count manually entered, defaults to theoretical
  copasVendidas?: number; // Number of shots/copas sold in POS
  copasMl?: number; // Total ml sold in shots/copas
  copasGanancia?: number; // Total money collected for copas in POS
}

export default function DailyAuditSheet() {
  const { products, adjustStock, currentUser, addAuditLog, sales, movements, cashSessions, config, cashExpenses, waiterReports } = useApp();

  const [activeTab, setActiveTab] = useState<'new-sheet' | 'history' | 'consolidated'>('new-sheet');
  const [consolidatedFecha, setConsolidatedFecha] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Sheet Header Info
  const [encargado, setEncargado] = useState(currentUser?.name || '');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [establecimiento, setEstablecimiento] = useState('AMBAR CLUB');
  const [cajaAsociada, setCajaAsociada] = useState(() => {
    if (currentUser?.username) {
      const lower = currentUser.username.toLowerCase();
      if (lower.includes('caja')) {
        const num = lower.replace(/^\D+/g, ''); // Extract digits
        return num ? `Caja ${num}` : 'Caja 1';
      }
    }
    return 'Caja 1';
  });

  // Sheet Rows State
  const [rows, setRows] = useState<Record<string, SheetRowState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savedSheetId, setSavedSheetId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [sincronizarPOS, setSincronizarPOS] = useState(true);

  // Desglose de pagos por método (Efectivo, QR, Tarjeta, Transferencia)
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    efectivo: 0,
    qr: 0,
    tarjeta: 0,
    transferencia: 0
  });

  const totalDeclaredPayments = useMemo(() => {
    return (
      (Number(paymentBreakdown.efectivo) || 0) +
      (Number(paymentBreakdown.qr) || 0) +
      (Number(paymentBreakdown.tarjeta) || 0) +
      (Number(paymentBreakdown.transferencia) || 0)
    );
  }, [paymentBreakdown]);

  // History State
  const [historySheets, setHistorySheets] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistorySheet, setSelectedHistorySheet] = useState<any | null>(null);
  const [historyCajaFilter, setHistoryCajaFilter] = useState('all');

  // Find most recently saved sheet for this date and caja
  const lastClosedSheet = useMemo(() => {
    return (historySheets || [])
      .filter(sheet => sheet.fecha === fecha && (sheet.cajaAsociada || 'Caja 1') === cajaAsociada)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
  }, [historySheets, fecha, cajaAsociada]);

  const lastClosedCutoff = lastClosedSheet?.createdAt || null;

  // Sync payment breakdown automatically from POS sales if sincronizarPOS is enabled
  useEffect(() => {
    if (sincronizarPOS) {
      const dateSales = (sales || []).filter(s => {
        const saleDate = s.date ? s.date.substring(0, 10) : '';
        const saleCaja = s.cajaAsociada || 'Caja 1';
        if (saleDate !== fecha || saleCaja !== cajaAsociada) return false;
        if (lastClosedCutoff && s.date && s.date <= lastClosedCutoff) return false;
        return true;
      });

      let ef = 0;
      let qr = 0;
      let card = 0;
      let trans = 0;

      dateSales.forEach(s => {
        const cat = parsePaymentCategory(s.paymentMethod);
        if (cat === 'efectivo') ef += s.total || 0;
        else if (cat === 'qr') qr += s.total || 0;
        else if (cat === 'tarjeta') card += s.total || 0;
        else if (cat === 'transferencia') trans += s.total || 0;
      });

      setPaymentBreakdown({
        efectivo: Number(ef.toFixed(2)),
        qr: Number(qr.toFixed(2)),
        tarjeta: Number(card.toFixed(2)),
        transferencia: Number(trans.toFixed(2))
      });
    }
  }, [sales, fecha, cajaAsociada, sincronizarPOS, lastClosedCutoff]);

  const hasFullHistoryAccess = 
    currentUser?.role === UserRole.ADMIN || 
    currentUser?.role === UserRole.GERENTE || 
    currentUser?.role === UserRole.AUDITOR ||
    currentUser?.role === UserRole.SUPERVISOR;

  const filteredHistorySheets = useMemo(() => {
    return historySheets.filter(sheet => {
      if (!hasFullHistoryAccess) {
        return (sheet.cajaAsociada || 'Caja 1') === cajaAsociada;
      }
      if (historyCajaFilter === 'all') return true;
      return (sheet.cajaAsociada || 'Caja 1') === historyCajaFilter;
    });
  }, [historySheets, hasFullHistoryAccess, cajaAsociada, historyCajaFilter]);

  // Sync encargado on mount or user login
  useEffect(() => {
    if (currentUser?.name) {
      setEncargado(currentUser.name);
    }
  }, [currentUser]);

  // Initialize sheet rows from current products catalog and automatically synchronize sales and purchases for the selected date
  useEffect(() => {
    if (products && products.length > 0) {
      setRows(prevRows => {
        // Load draft rows from localStorage if prevRows is empty
        let sourceRows = prevRows;
        if (Object.keys(sourceRows).length === 0) {
          try {
            const saved = localStorage.getItem(`ambar_audit_sheet_draft_${cajaAsociada}`);
            if (saved) {
              sourceRows = JSON.parse(saved);
            }
          } catch (e) {
            console.error('Error reading audit sheet draft from localStorage:', e);
          }
        }

        const updatedRows: Record<string, SheetRowState> = {};
        
        products.filter(p => p.isActive).forEach(p => {
          const isBottleProduct = p.bottleConfig?.isBottle || p.unit === 'botella' || !!(p.bottleConfig?.capacityMl);
          const capacityMl = p.bottleConfig?.capacityMl || 750;

          // Filter product movements specifically belonging to this Caja
          const productCajaMovements = (movements || []).filter(
            m => m.productId === p.id && 
                 !(m.observations && m.observations.includes('Carga inicial')) &&
                 m.observations && 
                 m.observations.includes(cajaAsociada)
          );

          // Find all movements of this product in this Caja that happened on or after the selected date to reverse them
          const movementsOnOrAfter = productCajaMovements.filter(
            m => m.date && m.date.split('T')[0] >= fecha
          );

          // Find movements of this product in this Caja exactly on the selected date that happened AFTER last closed cutoff
          const movementsOnDate = productCajaMovements.filter(m => {
            const mDate = m.date ? m.date.split('T')[0] : '';
            if (mDate !== fecha) return false;
            if (lastClosedCutoff && m.date && m.date <= lastClosedCutoff) return false;
            return true;
          });

          const entradasToday = movementsOnDate
            .filter(m => m.type === MovementType.TRANSFER || m.type === MovementType.ENTRY)
            .reduce((acc, m) => acc + m.quantity, 0);

          let fullBottlesSoldToday = 0;
          let copasSoldToday = 0;
          let copasMlToday = 0;
          let copasGananciaToday = 0;

          if (sincronizarPOS) {
            movementsOnDate
              .filter(m => m.type === MovementType.SALE)
              .forEach(m => {
                if (m.mlDelta && m.mlDelta < 0) {
                  copasSoldToday += m.quantity > 0 ? m.quantity : 1;
                  copasMlToday += Math.abs(m.mlDelta);
                } else {
                  fullBottlesSoldToday += m.quantity;
                }
              });

            const mlFromMovements = copasMlToday;
            let mlFromUnlinkedGlassSales = 0;
            let directFullUnitsQty = 0;
            let directFullUnitsGanancia = 0;
            let directCopasQty = 0;
            let directCopasGanancia = 0;

            const dateSales = (sales || []).filter(s => {
              const saleDate = s.date ? s.date.substring(0, 10) : '';
              const saleCaja = s.cajaAsociada || 'Caja 1';
              if (saleDate !== fecha || saleCaja !== cajaAsociada) return false;
              if (lastClosedCutoff && s.date && s.date <= lastClosedCutoff) return false;
              return true;
            });

            dateSales.forEach(s => {
              (s.items || []).forEach(it => {
                const qty = it.quantity || 1;
                const itemSubtotal = (it.subtotal ?? ((it.price || 0) * qty));

                if (it.productId === p.id) {
                  if (it.selectedShotMl && it.selectedShotMl > 0) {
                    directCopasQty += qty;
                    directCopasGanancia += itemSubtotal;
                    if (mlFromMovements === 0) {
                      mlFromUnlinkedGlassSales += (it.selectedShotMl * qty);
                    }
                  } else {
                    directFullUnitsQty += qty;
                    directFullUnitsGanancia += itemSubtotal;
                  }
                }
              });
            });

            if (isBottleProduct) {
              if (fullBottlesSoldToday === 0) {
                fullBottlesSoldToday = directFullUnitsQty;
              }
              copasMlToday = mlFromMovements + mlFromUnlinkedGlassSales;
              if (directCopasGanancia > 0) {
                copasGananciaToday = directCopasGanancia;
              }
              if (copasSoldToday === 0 && (mlFromUnlinkedGlassSales > 0 || directCopasQty > 0)) {
                copasSoldToday = directCopasQty;
              }

              if (copasMlToday > 0 && copasGananciaToday === 0 && p.price) {
                const capacityMl = p.bottleConfig?.capacityMl || 750;
                copasGananciaToday = (copasMlToday / capacityMl) * p.price * 1.5;
              }
            } else {
              // Non-bottle unit product (e.g. Vaso de Fernet, Cerveza, Refresco)
              if (fullBottlesSoldToday === 0) {
                fullBottlesSoldToday = directFullUnitsQty + directCopasQty;
              }
              copasSoldToday = 0;
              copasGananciaToday = 0;
              copasMlToday = 0;
            }
          }

          const fullBottlesFromCopasToday = isBottleProduct && capacityMl > 0
            ? Math.floor(copasMlToday / capacityMl)
            : 0;

          const soldQtyInFullUnits = isBottleProduct
            ? (fullBottlesSoldToday + fullBottlesFromCopasToday)
            : fullBottlesSoldToday;

          // Undo movements on or after selected date starting from current Caja stock to find initial stock in this Caja
          let computedInitialStock = p.cajaStock?.[cajaAsociada] ?? 0;
          let totalShotMlOnOrAfter = 0;

          movementsOnOrAfter.forEach(m => {
            if (m.type === MovementType.TRANSFER || m.type === MovementType.ENTRY) {
              computedInitialStock -= m.quantity;
            } else if (m.type === MovementType.SALE) {
              if (m.mlDelta && m.mlDelta < 0) {
                totalShotMlOnOrAfter += Math.abs(m.mlDelta);
              } else {
                computedInitialStock += m.quantity;
              }
            } else if (
              m.type === MovementType.EXIT ||
              m.type === MovementType.ADJUSTMENT
            ) {
              computedInitialStock += m.quantity;
            }
          });

          if (isBottleProduct && capacityMl > 0) {
            computedInitialStock += Math.floor(totalShotMlOnOrAfter / capacityMl);
          }

          computedInitialStock = Math.max(0, computedInitialStock);

          const existingRow = sourceRows[p.id];
          
          if (existingRow) {
            // Preserve manual inputs
            const promos = existingRow.promos;
            const cortesias = existingRow.cortesias;
            const botellasAbiertas = existingRow.botellasAbiertas;
            const botellasVacias = existingRow.botellasVacias ?? (p.cajaFinishedBottlesCount?.[cajaAsociada] ?? 0);
            
            // Calculate new theoretical stock
            const totalConsumo = soldQtyInFullUnits + promos + cortesias;
            const theoreticalStock = Math.max(0, computedInitialStock + entradasToday - totalConsumo);
            
            // Re-sync physical count if it hasn't been manually overridden
            const oldTotalConsumo = existingRow.consumoNoche + existingRow.promos + existingRow.cortesias;
            const oldTheoretical = Math.max(0, existingRow.initialStock + (existingRow.entradas || 0) - oldTotalConsumo);
            
            let fisicoEnBarra = existingRow.fisicoEnBarra;
            if (fisicoEnBarra === oldTheoretical) {
              fisicoEnBarra = theoreticalStock;
            }
            
            updatedRows[p.id] = {
              productId: p.id,
              productName: p.name,
              category: p.category,
              unitPrice: p.price,
              initialStock: computedInitialStock,
              entradas: entradasToday,
              consumoNoche: soldQtyInFullUnits,
              promos,
              botellasAbiertas,
              botellasVacias,
              cortesias,
              fisicoEnBarra,
              copasVendidas: copasSoldToday,
              copasMl: copasMlToday,
              copasGanancia: copasGananciaToday
            };
          } else {
            // First time loading this product in the rows state
            const totalConsumo = soldQtyInFullUnits;
            const theoreticalStock = Math.max(0, computedInitialStock + entradasToday - totalConsumo);
            const initialOpenCount = p.cajaOpenBottlesCount?.[cajaAsociada] ?? (p.openBottles?.[cajaAsociada] ? 1 : 0);
            const initialFinishedCount = p.cajaFinishedBottlesCount?.[cajaAsociada] ?? 0;
            
            updatedRows[p.id] = {
              productId: p.id,
              productName: p.name,
              category: p.category,
              unitPrice: p.price,
              initialStock: computedInitialStock,
              entradas: entradasToday,
              consumoNoche: soldQtyInFullUnits,
              promos: 0,
              botellasAbiertas: initialOpenCount,
              botellasVacias: initialFinishedCount,
              cortesias: 0,
              fisicoEnBarra: theoreticalStock,
              copasVendidas: copasSoldToday,
              copasMl: copasMlToday,
              copasGanancia: copasGananciaToday
            };
          }
        });
        
        // Save computed rows draft back to localStorage for this Caja
        try {
          localStorage.setItem(`ambar_audit_sheet_draft_${cajaAsociada}`, JSON.stringify(updatedRows));
        } catch (e) {
          console.error('Failed to save audit sheet draft to localStorage:', e);
        }

        return updatedRows;
      });
    }
  }, [products, movements, fecha, sincronizarPOS, cajaAsociada, sales, lastClosedCutoff]);

  // Load History Sheets from Firestore
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const q = query(collection(db, 'dailySheets'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setHistorySheets(list);
    } catch (err) {
      console.error('Error fetching daily sheets history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Category Colors matching the excel sheet style
  const getCategoryColor = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes('cerveza')) return { bg: 'bg-yellow-400 text-zinc-950', border: 'border-yellow-500' };
    if (norm.includes('champagne')) return { bg: 'bg-red-400 text-zinc-950', border: 'border-red-500' };
    if (norm.includes('cigarro')) return { bg: 'bg-zinc-800 text-white', border: 'border-zinc-700' };
    if (norm.includes('coctel') || norm.includes('cóctel')) return { bg: 'bg-blue-600 text-white', border: 'border-blue-700' };
    if (norm.includes('fernet')) return { bg: 'bg-stone-700 text-white', border: 'border-stone-600' };
    if (norm.includes('gin')) return { bg: 'bg-amber-100 text-zinc-950', border: 'border-amber-200' };
    if (norm.includes('licor')) return { bg: 'bg-rose-400 text-zinc-950', border: 'border-rose-500' };
    if (norm.includes('mezclador') || norm.includes('gaseosa') || norm.includes('refresco')) return { bg: 'bg-orange-300 text-zinc-950', border: 'border-orange-400' };
    if (norm.includes('ron')) return { bg: 'bg-amber-200 text-zinc-950', border: 'border-amber-300' };
    if (norm.includes('rtd') || norm.includes('mambo')) return { bg: 'bg-emerald-400 text-zinc-950', border: 'border-emerald-500' };
    if (norm.includes('singani')) return { bg: 'bg-teal-700 text-white', border: 'border-teal-600' };
    if (norm.includes('tequila')) return { bg: 'bg-indigo-600 text-white', border: 'border-indigo-700' };
    if (norm.includes('vodka')) return { bg: 'bg-sky-700 text-white', border: 'border-sky-600' };
    if (norm.includes('whisky')) return { bg: 'bg-amber-800 text-white', border: 'border-amber-900' };
    return { bg: 'bg-zinc-700 text-white', border: 'border-zinc-600' };
  };

  // Get active product categories from rows
  const activeCategories: string[] = useMemo(() => 
    Array.from(new Set(products.filter(p => p.isActive).map(p => p.category))),
    [products]
  );

  // Inputs handler helper
  const updateRowField = (productId: string, field: keyof SheetRowState, value: number) => {
    setRows(prev => {
      const current: SheetRowState = prev[productId] || {
        productId,
        productName: '',
        category: '',
        unitPrice: 0,
        initialStock: 0,
        entradas: 0,
        consumoNoche: 0,
        promos: 0,
        botellasAbiertas: 0,
        botellasVacias: 0,
        cortesias: 0,
        fisicoEnBarra: 0
      };

      const updated = {
        ...current,
        [field]: value
      };

      // Auto-update físico en barra (físico) if consumo, promos or cortesías changes and it was equal to the previous theoretical stock
      const totalConsumoAnterior = current.consumoNoche + current.promos + current.cortesias;
      const totalConsumoNuevo = (field === 'consumoNoche' ? value : current.consumoNoche) +
                                (field === 'promos' ? value : current.promos) +
                                (field === 'cortesias' ? value : current.cortesias);

      const theoreticalAnterior = Math.max(0, current.initialStock - totalConsumoAnterior);
      const theoreticalNuevo = Math.max(0, current.initialStock - totalConsumoNuevo);

      // If physical count matches the old theoretical count, update it automatically to the new theoretical count
      if (current.fisicoEnBarra === theoreticalAnterior || field === 'fisicoEnBarra') {
        updated.fisicoEnBarra = field === 'fisicoEnBarra' ? value : theoreticalNuevo;
      }

      const nextRows = {
        ...prev,
        [productId]: updated
      };

      // Save updated rows to localStorage
      try {
        localStorage.setItem(`ambar_audit_sheet_draft_${cajaAsociada}`, JSON.stringify(nextRows));
      } catch (e) {
        console.error('Failed to save audit sheet draft in updateRowField:', e);
      }

      return nextRows;
    });
  };

  // Calculations for individual row
  const getRowCalculations = (row: SheetRowState) => {
    const totalConsumo = row.consumoNoche + row.promos + row.cortesias;
    const bottleGanancia = (row.consumoNoche + row.promos) * row.unitPrice;
    const copasGanancia = row.copasGanancia || 0;
    const totalGanancia = bottleGanancia + copasGanancia;
    const theoreticalStock = Math.max(0, row.initialStock + (row.entradas || 0) - totalConsumo);
    const discrepancy = row.fisicoEnBarra - theoreticalStock;
    return {
      totalConsumo,
      totalGanancia,
      bottleGanancia,
      copasGanancia,
      theoreticalStock,
      discrepancy
    };
  };

  // General Totals of the current sheet
  const getSheetTotals = () => {
    let globalConsumo = 0;
    let globalGanancia = 0;
    let globalCortesias = 0;
    let globalDiferenciaCount = 0;
    let productsWithDiscrepancies = 0;

    (Object.values(rows) as SheetRowState[]).forEach(row => {
      const { totalConsumo, totalGanancia, discrepancy } = getRowCalculations(row);
      globalConsumo += totalConsumo;
      globalGanancia += totalGanancia;
      globalCortesias += row.cortesias;
      if (discrepancy !== 0) {
        globalDiferenciaCount += discrepancy;
        productsWithDiscrepancies++;
      }
    });

    return {
      globalConsumo,
      globalGanancia,
      globalCortesias,
      globalDiferenciaCount,
      productsWithDiscrepancies
    };
  };

  const totals = getSheetTotals();

  // Reset current form values
  const resetForm = () => {
    setSincronizarPOS(false);
    const initialRows: Record<string, SheetRowState> = {};
    products.filter(p => p.isActive).forEach(p => {
      initialRows[p.id] = {
        productId: p.id,
        productName: p.name,
        category: p.category,
        unitPrice: p.price,
        initialStock: p.quantity,
        entradas: 0,
        consumoNoche: 0,
        promos: 0,
        botellasAbiertas: 0,
        botellasVacias: 0,
        cortesias: 0,
        fisicoEnBarra: p.quantity
      };
    });
    setRows(initialRows);
    setFecha(new Date().toISOString().split('T')[0]);
    setPaymentBreakdown({
      efectivo: 0,
      qr: 0,
      tarjeta: 0,
      transferencia: 0
    });
    try {
      localStorage.removeItem(`ambar_audit_sheet_draft_${cajaAsociada}`);
    } catch (e) {
      console.error('Failed to clear audit sheet draft on resetForm:', e);
    }
  };

  // Handle Save Planilla & Reconcile Inventory
  const handleSaveSheet = () => {
    if (!encargado.trim()) {
      setValidationError('Por favor, ingrese el nombre del encargado o supervisor de bar.');
      return;
    }

    if (Object.keys(rows).length === 0) {
      setValidationError('No hay productos disponibles para registrar.');
      return;
    }

    setValidationError('');
    setShowConfirmModal(true);
  };

  const executeSaveSheet = async () => {
    setShowConfirmModal(false);
    try {
      setIsSaving(true);

      const itemsToSave: any[] = [];
      const timestamp = new Date().toISOString();

      // Loop through rows to apply stock adjustments and gather data
      for (const [prodId, row] of Object.entries(rows) as [string, SheetRowState][]) {
        const calcs = getRowCalculations(row);
        
        // Save metadata of all items, even if 0, to reproduce spreadsheet perfectly later
        itemsToSave.push({
          productId: row.productId,
          productName: row.productName,
          category: row.category,
          unitPrice: row.unitPrice,
          initialStock: row.initialStock,
          entradas: row.entradas || 0,
          consumoNoche: row.consumoNoche,
          copasVendidas: row.copasVendidas || 0,
          copasMl: row.copasMl || 0,
          copasGanancia: row.copasGanancia || 0,
          promos: row.promos,
          botellasAbiertas: row.botellasAbiertas,
          botellasVacias: row.botellasVacias || 0,
          cortesias: row.cortesias,
          fisicoEnBarra: row.fisicoEnBarra,
          totalConsumo: calcs.totalConsumo,
          totalGanancia: calcs.totalGanancia,
          theoreticalStock: calcs.theoreticalStock,
          discrepancy: calcs.discrepancy
        });

        // Calculate non-registered consumption (promos, cortesias, and any manual consumption exceeding POS sales) for this specific Caja
        let soldQtyInFullUnits = 0;
        if (sincronizarPOS) {
          let fullBottlesSold = 0;
          let copasMlTotal = 0;

          (movements || [])
            .filter(m => 
              m.productId === row.productId &&
              m.type === MovementType.SALE &&
              m.date && m.date.split('T')[0] === fecha &&
              m.observations && m.observations.includes(cajaAsociada)
            )
            .forEach(m => {
              if (m.mlDelta && m.mlDelta < 0) {
                copasMlTotal += Math.abs(m.mlDelta);
              } else {
                fullBottlesSold += m.quantity;
              }
            });

          const p = products.find(prod => prod.id === row.productId);
          const capacityMl = p?.bottleConfig?.capacityMl || 750;
          const isBottleProduct = p?.bottleConfig?.isBottle || p?.unit === 'botella';
          const fullBottlesFromCopas = isBottleProduct && capacityMl > 0
            ? Math.floor(copasMlTotal / capacityMl)
            : 0;

          soldQtyInFullUnits = fullBottlesSold + fullBottlesFromCopas;
        }

        const extraConsumoNoche = Math.max(0, row.consumoNoche - soldQtyInFullUnits);
        const nonRegisteredConsumo = extraConsumoNoche + row.promos + row.cortesias;

        if (nonRegisteredConsumo > 0) {
          let obs = 'Cierre Planilla Diaria - ';
          const obsParts = [];
          if (extraConsumoNoche > 0) obsParts.push(`Consumo no registrado: ${extraConsumoNoche}`);
          if (row.promos > 0) obsParts.push(`Promos: ${row.promos}`);
          if (row.cortesias > 0) obsParts.push(`Cortesías: ${row.cortesias}`);
          obs += obsParts.join(', ');

          await adjustStock(
            row.productId,
            nonRegisteredConsumo,
            MovementType.EXIT,
            obs
          );
        }

        // If user manually declared a discrepancy, reconcile stock to match their entered physical stock
        if (calcs.discrepancy !== 0) {
          const adjQuantity = Math.abs(calcs.discrepancy);
          const adjType = calcs.discrepancy < 0 ? MovementType.EXIT : MovementType.ENTRY;
          const obs = `Conciliación Planilla Diaria - Ajuste por discrepancia de conteo físico (Conteo: ${row.fisicoEnBarra}, Teórico: ${calcs.theoreticalStock})`;
          
          await adjustStock(
            row.productId,
            adjQuantity,
            adjType,
            obs
          );
        }
      }

      // Compute waiter contributions for this sheet
      const activeWaiterReportsForSave = (waiterReports || []).filter(
        r => r.date && r.date.substring(0, 10) === fecha &&
        (r.targetCaja === cajaAsociada || !r.targetCaja || r.targetCaja === 'Caja 1') &&
        r.status === 'aprobado'
      );

      const waiterSalesMapSave: Record<string, { waiterName: string; total: number; count: number; items: { productName: string; quantity: number }[] }> = {};
      activeWaiterReportsForSave.forEach(r => {
        const name = r.waiterName || 'Mesero';
        if (!waiterSalesMapSave[name]) {
          waiterSalesMapSave[name] = { waiterName: name, total: 0, count: 0, items: [] };
        }
        waiterSalesMapSave[name].total += r.total || 0;
        waiterSalesMapSave[name].count += 1;
        if (r.items) {
          r.items.forEach(it => {
            const ex = waiterSalesMapSave[name].items.find(x => x.productName === it.productName);
            if (ex) ex.quantity += it.quantity;
            else waiterSalesMapSave[name].items.push({ productName: it.productName, quantity: it.quantity });
          });
        }
      });
      const waiterContributionsToSave = Object.values(waiterSalesMapSave).sort((a, b) => a.waiterName.localeCompare(b.waiterName));

      // Save Planilla Record to Firestore
      const sheetDoc = {
        encargado,
        fecha,
        establecimiento,
        cajaAsociada,
        paymentBreakdown: {
          efectivo: Number(paymentBreakdown.efectivo) || 0,
          qr: Number(paymentBreakdown.qr) || 0,
          tarjeta: Number(paymentBreakdown.tarjeta) || 0,
          transferencia: Number(paymentBreakdown.transferencia) || 0,
          totalDeclared: Number(totalDeclaredPayments.toFixed(2))
        },
        waiterContributions: waiterContributionsToSave,
        totals: {
          globalConsumo: totals.globalConsumo,
          globalGanancia: totals.globalGanancia,
          globalCortesias: totals.globalCortesias,
          globalDiferenciaCount: totals.globalDiferenciaCount,
          productsWithDiscrepancies: totals.productsWithDiscrepancies
        },
        items: itemsToSave,
        userId: currentUser?.uid || 'system',
        createdAt: timestamp
      };

      const docRef = await addDoc(collection(db, 'dailySheets'), sheetDoc);

      // Delete waiter reports from Firestore for this shift so waiters start completely clean for the next shift
      const waiterReportsToDelete = (waiterReports || []).filter(
        r => (r.date && r.date.substring(0, 10) === fecha) ||
             (r.targetCaja === cajaAsociada || !r.targetCaja || r.targetCaja === 'Caja 1')
      );
      if (waiterReportsToDelete.length > 0) {
        await Promise.all(
          waiterReportsToDelete.map(r => 
            deleteDoc(doc(db, 'waiterReports', r.id)).catch(err => console.error("Error al borrar reporte de mesero:", err))
          )
        );
      }

      // Audit Log
      addAuditLog(
        'Inventarios',
        `Guardado de Planilla de Cierre Diario: ${fecha}`,
        null,
        {
          sheetId: docRef.id,
          encargado,
          ganancia: totals.globalGanancia,
          productosAfectados: itemsToSave.filter(i => i.totalConsumo > 0 || i.discrepancy !== 0).length
        }
      );

      setSavedSheetId(docRef.id);
      setShowSuccessModal(true);
      setHistorySheets(prev => [{ id: docRef.id, ...sheetDoc }, ...prev]);
      resetForm();
    } catch (err: any) {
      setValidationError(`Error al guardar la planilla de cierre: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to trigger browser print
  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;

    // Create style block specifically to hide default headers/footers and apply gorgeous print overrides
    const style = document.createElement('style');
    style.id = 'print-style-override';
    style.innerHTML = `
      @media print {
        @page {
          margin: 0;
        }
        body {
          background: white !important;
          color: black !important;
          margin: 1.6cm !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Hide everything by default except the custom print container */
        body > *:not(#print-mount-point) {
          display: none !important;
        }
        
        #print-mount-point {
          display: block !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          font-family: system-ui, -apple-system, sans-serif !important;
        }

        /* High-contrast and clean layout adaptations for physical print */
        #print-mount-point * {
          color: #18181b !important; /* zinc-900 */
          border-color: #e4e4e7 !important; /* zinc-200 */
          box-shadow: none !important;
          text-shadow: none !important;
        }

        /* Keep important visual badges/highlights but in safe print-friendly colors */
        #print-mount-point .text-emerald-500,
        #print-mount-point .text-emerald-400,
        #print-mount-point .font-bold.text-emerald-400,
        #print-mount-point .text-emerald-600 {
          color: #059669 !important; /* green-600 */
          font-weight: bold !important;
        }

        #print-mount-point .text-red-500,
        #print-mount-point .text-red-400,
        #print-mount-point .text-red-600 {
          color: #dc2626 !important; /* red-600 */
          font-weight: bold !important;
        }

        #print-mount-point .text-amber-500,
        #print-mount-point .text-amber-400,
        #print-mount-point .text-amber-600 {
          color: #d97706 !important; /* amber-600 */
          font-weight: bold !important;
        }

        #print-mount-point .text-zinc-500,
        #print-mount-point .text-zinc-400 {
          color: #71717a !important; /* zinc-500 */
        }

        #print-mount-point .bg-zinc-950,
        #print-mount-point .bg-zinc-900,
        #print-mount-point .bg-zinc-900\\/50,
        #print-mount-point .bg-zinc-900\\/30,
        #print-mount-point .bg-zinc-900\\/40,
        #print-mount-point .bg-zinc-950\\/40 {
          background-color: #f4f4f5 !important; /* zinc-100 */
          border: 1px solid #e4e4e7 !important;
        }

        #print-mount-point .bg-emerald-950\\/10,
        #print-mount-point .bg-emerald-950\\/20,
        #print-mount-point .bg-emerald-950\\/40 {
          background-color: #ecfdf5 !important; /* emerald-50 */
          border: 1px solid #a7f3d0 !important;
        }

        #print-mount-point .bg-red-950\\/20,
        #print-mount-point .bg-red-950\\/40 {
          background-color: #fef2f2 !important; /* red-50 */
          border: 1px solid #fca5a5 !important;
        }

        #print-mount-point table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        #print-mount-point th {
          background-color: #f4f4f5 !important;
          color: #27272a !important;
          font-weight: bold !important;
          border-bottom: 2px solid #e4e4e7 !important;
          padding: 8px 12px !important;
        }

        #print-mount-point td {
          padding: 8px 12px !important;
          border-bottom: 1px solid #f4f4f5 !important;
        }

        /* Hide buttons inside print scope */
        #print-mount-point button,
        #print-mount-point .no-print {
          display: none !important;
        }

        /* Trailing Blank Page Rule */
        .print-trailing-blank-page {
          page-break-before: always !important;
          break-before: page !important;
          height: 100vh !important;
          min-height: 800px !important;
          background: white !important;
          display: block !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Create temporary container for printed element
    const tempContainer = document.createElement('div');
    tempContainer.id = 'print-mount-point';
    tempContainer.style.display = 'none';
    tempContainer.innerHTML = printContent.innerHTML;

    // Append trailing blank page
    const blankPage = document.createElement('div');
    blankPage.className = 'print-trailing-blank-page';
    tempContainer.appendChild(blankPage);

    document.body.appendChild(tempContainer);

    // Run browser print dialog
    window.print();

    // Clean up
    document.head.removeChild(style);
    document.body.removeChild(tempContainer);
  };

  return (
    <div className="space-y-6" id="daily-audit-sheet-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide font-sans flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-500 animate-pulse" />
            <span>Planilla de Inventario y Ganancia Diaria</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">PLANILLA DE CIERRE DE BARRA • CONTROL OPERATIVO DE AMBAR CLUB</p>
        </div>

        {/* Tab Selection buttons */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
          <button
            onClick={() => setActiveTab('new-sheet')}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'new-sheet'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Nueva Planilla</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Cierres</span>
          </button>
          <button
            onClick={() => setActiveTab('consolidated')}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'consolidated'
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Cierre Total de Cajas</span>
          </button>
        </div>
      </div>

      {activeTab === 'new-sheet' && (() => {
        const activeWaiterReports = (waiterReports || []).filter(
          r => r.date && r.date.substring(0, 10) === fecha &&
          (r.targetCaja === cajaAsociada || !r.targetCaja || r.targetCaja === 'Caja 1')
        );

        const approvedWaiterReports = activeWaiterReports.filter(r => r.status === 'aprobado');
        const totalMontoMeserosAprobadoNew = approvedWaiterReports.reduce((acc, r) => acc + (r.total || 0), 0);

        const waiterSalesMap: Record<string, { waiterName: string; total: number; count: number; items: { productName: string; quantity: number }[] }> = {};
        approvedWaiterReports.forEach(r => {
          const name = r.waiterName || 'Mesero';
          if (!waiterSalesMap[name]) {
            waiterSalesMap[name] = { waiterName: name, total: 0, count: 0, items: [] };
          }
          waiterSalesMap[name].total += r.total || 0;
          waiterSalesMap[name].count += 1;
          if (r.items) {
            r.items.forEach(it => {
              const ex = waiterSalesMap[name].items.find(x => x.productName === it.productName);
              if (ex) ex.quantity += it.quantity;
              else waiterSalesMap[name].items.push({ productName: it.productName, quantity: it.quantity });
            });
          }
        });

        const activeWaiterSalesList = Object.values(waiterSalesMap).sort((a, b) => a.waiterName.localeCompare(b.waiterName));

        return (
        <div className="space-y-6 animate-fade-in" id="printable-new-sheet-area">
          {/* Top Info Header Inputs (Resembles the Excel banner) */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
            {/* AMBAR Header */}
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-850 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-white text-lg shadow-lg">
                  A
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase font-sans">AMBAR CLUB</h2>
                  <p className="text-[9px] text-emerald-400 font-mono font-bold uppercase tracking-wider">AUDITORÍA DIARIA DE STOCK & RECAUDACIÓN</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <span className="bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg">
                  HOJA DE CONCILIACIÓN FÍSICA
                </span>
              </div>
            </div>

            {/* Inputs Banner */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider block flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Nombre de Encargado</span>
                </label>
                <input
                  type="text"
                  placeholder="Escriba el nombre del supervisor/encargado"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors"
                  value={encargado}
                  onChange={(e) => setEncargado(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Fecha de Inventario</span>
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider block flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Caja de Barra</span>
                </label>
                <select
                  disabled={currentUser?.role !== UserRole.ALMACENERO && currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.GERENTE && currentUser?.role !== UserRole.AUDITOR}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  value={cajaAsociada}
                  onChange={(e) => setCajaAsociada(e.target.value)}
                >
                  <option value="Caja 1">Caja 1</option>
                  <option value="Caja 2">Caja 2</option>
                  <option value="Caja 3">Caja 3</option>
                  <option value="Caja 4">Caja 4</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Establecimiento</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-emerald-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-colors"
                  value={establecimiento}
                  onChange={(e) => setEstablecimiento(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" id="sheet-stats">
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Consumo Total Noche</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {totals.globalConsumo} <span className="text-xs text-zinc-500 font-normal">unidades</span>
                </h3>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <Boxes className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ganancia Estimada</p>
                <h3 className="text-xl font-bold text-emerald-400 mt-1">
                  Bs {totals.globalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[9px] font-mono text-zinc-500 mt-1">
                  Caja: Bs {Math.max(0, totals.globalGanancia - totalMontoMeserosAprobadoNew).toLocaleString('es-ES', { minimumFractionDigits: 2 })} | Meseros: Bs {totalMontoMeserosAprobadoNew.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-sky-900/40 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ventas por Meseros</span>
                </p>
                <h3 className="text-xl font-bold text-sky-400 mt-1">
                  Bs {totalMontoMeserosAprobadoNew.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[9.5px] font-mono text-zinc-400 mt-0.5">
                  {approvedWaiterReports.length} comandas ({activeWaiterSalesList.length} meseros)
                </p>
              </div>
              <div className="bg-sky-950/30 p-2 rounded-lg border border-sky-800/50">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Cortesías</p>
                <h3 className="text-xl font-bold text-amber-400 mt-1">
                  {totals.globalCortesias} <span className="text-xs text-zinc-500 font-normal">unidades</span>
                </h3>
              </div>
              <div className="bg-amber-950/20 p-2 rounded-lg border border-amber-900/40">
                <Gift className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Productos c/ Diferencia</p>
                <h3 className={`text-xl font-bold mt-1 ${totals.productsWithDiscrepancies > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                  {totals.productsWithDiscrepancies} <span className="text-xs text-zinc-500 font-normal">ítems</span>
                </h3>
              </div>
              <div className={`p-2 rounded-lg border ${totals.productsWithDiscrepancies > 0 ? 'bg-red-950/20 border-red-900/40' : 'bg-zinc-900 border-zinc-800'}`}>
                <AlertTriangle className={`w-5 h-5 ${totals.productsWithDiscrepancies > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-600'}`} />
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown Card (Anotación de Pagos: Efectivo, QR, Tarjeta, Transferencia) */}
          <div className="bg-zinc-950 border border-amber-900/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Anotación de Recaudación por Método de Pago (Planilla de Cierre)
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Anote o verifique los montos cobrados por Efectivo, QR, Tarjeta y Transferencia en este turno.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-xl shadow-sm">
                  Total Declarado: Bs {totalDeclaredPayments.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Efectivo */}
              <div className="bg-zinc-900/90 border border-emerald-900/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
                <label className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex items-center justify-between">
                  <span>💵 Efectivo</span>
                  <span className="text-[9px] text-zinc-500 font-normal">Caja</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500 font-bold">Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentBreakdown.efectivo || ''}
                    onChange={(e) => setPaymentBreakdown(prev => ({ ...prev, efectivo: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm font-mono text-white font-bold focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Pago QR */}
              <div className="bg-zinc-900/90 border border-cyan-900/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
                <label className="text-[11px] font-mono text-cyan-400 uppercase font-bold flex items-center justify-between">
                  <span>📱 Pago QR</span>
                  <span className="text-[9px] text-zinc-500 font-normal">Banco</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500 font-bold">Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentBreakdown.qr || ''}
                    onChange={(e) => setPaymentBreakdown(prev => ({ ...prev, qr: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm font-mono text-white font-bold focus:outline-none focus:border-cyan-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Tarjeta */}
              <div className="bg-zinc-900/90 border border-indigo-900/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
                <label className="text-[11px] font-mono text-indigo-400 uppercase font-bold flex items-center justify-between">
                  <span>💳 Tarjeta</span>
                  <span className="text-[9px] text-zinc-500 font-normal">POS</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500 font-bold">Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentBreakdown.tarjeta || ''}
                    onChange={(e) => setPaymentBreakdown(prev => ({ ...prev, tarjeta: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm font-mono text-white font-bold focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Transferencia */}
              <div className="bg-zinc-900/90 border border-purple-900/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
                <label className="text-[11px] font-mono text-purple-400 uppercase font-bold flex items-center justify-between">
                  <span>🏦 Transferencia</span>
                  <span className="text-[9px] text-zinc-500 font-normal">Banco</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-zinc-500 font-bold">Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentBreakdown.transferencia || ''}
                    onChange={(e) => setPaymentBreakdown(prev => ({ ...prev, transferencia: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-sm font-mono text-white font-bold focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: VENTAS DE MESEROS REGISTRADAS Y APROBADAS EN ESTA CAJA */}
          <div className="bg-zinc-950 border border-sky-900/40 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>Control y Atribución de Ventas por Mesero ({cajaAsociada} - {fecha})</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-3 py-1 rounded-xl">
                Total Contribución Meseros: Bs {totalMontoMeserosAprobadoNew.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-5 space-y-6">
              {activeWaiterSalesList.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 font-mono text-xs italic border border-dashed border-zinc-850 rounded-xl">
                  - No se registraron ventas o comandas de meseros enviadas a caja en esta fecha ({fecha}) -
                </div>
              ) : (
                <>
                  {/* Grid de Atribución de Ventas de Todos los Meseros */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeWaiterSalesList.map((w, idx) => {
                      const percentage = totalMontoMeserosAprobadoNew > 0 
                        ? ((w.total / totalMontoMeserosAprobadoNew) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <div key={idx} className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
                            <div>
                              <h4 className="font-sans font-bold text-white text-sm flex items-center gap-2">
                                <User className="w-4 h-4 text-sky-400" />
                                <span>{w.waiterName}</span>
                              </h4>
                              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                Contribución total: <span className="text-sky-400 font-bold">{percentage}%</span>
                              </p>
                            </div>
                            <span className="bg-sky-950 text-sky-300 border border-sky-800/50 font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                              Bs {w.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-900">
                            <span>Comandas aprobadas en caja:</span>
                            <span className="text-white font-bold">{w.count}</span>
                          </div>

                          {w.items.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold">Bebidas y Productos Vendidos:</p>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {w.items.map((it, i) => (
                                  <span key={i} className="bg-zinc-950 text-zinc-300 text-[9px] font-mono px-2 py-0.5 rounded border border-zinc-800">
                                    {it.quantity}x {it.productName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabla con detalle de comandas de meseros antes del cierre */}
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-sky-400" />
                      <span>Comandas Aprobadas de Meseros enviadas a {cajaAsociada}</span>
                    </h5>
                    <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="bg-zinc-900/80 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                            <th className="p-3 pl-4">Hora</th>
                            <th className="p-3">Mesero</th>
                            <th className="p-3">Productos Enviados a Caja</th>
                            <th className="p-3">Método Pago</th>
                            <th className="p-3 text-center">Estado Caja</th>
                            <th className="p-3 text-right pr-4">Monto Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/80 font-mono">
                          {activeWaiterReports.map((report) => (
                            <tr key={report.id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="p-3 pl-4 text-zinc-400 text-[10px]">
                                {new Date(report.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-3 font-bold text-white font-sans">{report.waiterName}</td>
                              <td className="p-3 text-zinc-300 font-sans max-w-xs">
                                <div className="line-clamp-2">
                                  {report.items?.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                                </div>
                              </td>
                              <td className="p-3 text-zinc-400">{report.paymentMethod}</td>
                              <td className="p-3 text-center">
                                {report.status === 'aprobado' ? (
                                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                    ✓ Aprobado
                                  </span>
                                ) : report.status === 'pendiente' ? (
                                  <span className="bg-amber-950 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse">
                                    ⏳ Pendiente
                                  </span>
                                ) : (
                                  <span className="bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                    ✕ Rechazado
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right pr-4 font-bold text-emerald-400">
                                Bs {(report.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
            {/* Text Search */}
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-600 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-zinc-500"
                placeholder="Buscar por nombre o código de bebida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Controls Row */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Category Quick Filter Select */}
              <div className="w-full sm:w-48">
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none cursor-pointer"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                >
                  <option value="all">Todas las Categorías</option>
                  {activeCategories.sort().map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* POS Auto Sync Toggle */}
              <div className="w-full sm:w-auto flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl shrink-0">
                <input
                  id="pos-sync-toggle"
                  type="checkbox"
                  checked={sincronizarPOS}
                  onChange={(e) => setSincronizarPOS(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-750 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 cursor-pointer"
                />
                <label htmlFor="pos-sync-toggle" className="text-[10px] text-zinc-300 font-mono font-bold cursor-pointer select-none uppercase tracking-wide">
                  Autosincronizar POS
                </label>
              </div>

              {/* Clear Sheet Button */}
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-3.5 py-2 bg-red-950/20 hover:bg-red-950/45 border border-red-900/30 hover:border-red-900/60 text-red-400 text-[10px] font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase shrink-0"
                title="Limpia la planilla y desactiva la sincronización del POS"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpiar Planilla</span>
              </button>
            </div>
          </div>

          {lastClosedSheet && (
            <div className="bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 rounded-xl p-3 text-xs font-mono flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Jornada anterior guardada</strong> ({new Date(lastClosedSheet.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}). Los datos de la jornada previa fueron archivados y esta planilla está limpia para registrar nuevas ventas.
                </span>
              </div>
              <span className="text-[10px] text-emerald-400/80 bg-emerald-900/40 px-2.5 py-0.5 rounded uppercase font-bold shrink-0">
                Archivado en Historial
              </span>
            </div>
          )}

          {/* SPREADSHEET CARD */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-zinc-900/50 border-b border-zinc-900 flex justify-between items-center flex-wrap gap-2">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Ingreso de Inventario Físico & Consumos</span>
              </span>
              <span className="text-[9px] font-mono text-zinc-500">CONECTADO AL KARDEX DE FIRESTORE EN TIEMPO REAL</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                    <th className="p-3 pl-4 min-w-[200px]">Producto</th>
                    <th className="p-3 text-center w-28 bg-zinc-900/60">Stock Inic.</th>
                    <th className="p-3 text-center w-24 bg-zinc-950/40 text-emerald-400 font-bold border-x border-zinc-900">Ingresos</th>
                    <th className="p-3 text-center min-w-[130px] bg-red-950/20 text-red-300">Consumo Noche</th>
                    <th className="p-3 text-center min-w-[110px] bg-red-950/10 text-red-400">Promos</th>
                    <th className="p-3 text-right w-24">Precio Un.</th>
                    <th className="p-3 text-center w-24">Tot. Consumo</th>
                    <th className="p-3 text-right w-28 bg-emerald-950/20 text-emerald-400 font-bold">Ganancia (Bs)</th>
                    <th className="p-3 text-center min-w-[110px] bg-purple-950/20 text-purple-300">Bot. Abiertas (Uso)</th>
                    <th className="p-3 text-center min-w-[110px] bg-amber-950/20 text-amber-300">Bot. Vacías / Desechadas</th>
                    <th className="p-3 text-center min-w-[110px] bg-amber-950/15 text-amber-400">Cortesía/Otros</th>
                    <th className="p-3 text-center min-w-[110px] bg-orange-950/20 text-orange-400 font-bold">Stock Físico Bar</th>
                    <th className="p-3 text-center w-24 pr-4">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {/* Group Products by Category to render the Excel format perfectly */}
                  {activeCategories
                    .sort()
                    .filter(cat => selectedCategoryFilter === 'all' || cat === selectedCategoryFilter)
                    .map(category => {
                      // Filter products in this category that match search
                      const categoryProducts = products.filter(p => 
                        p.isActive && 
                        p.category === category &&
                        ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.internalCode || '').toLowerCase().includes(searchQuery.toLowerCase()))
                      );

                      if (categoryProducts.length === 0) return null;

                      const catColor = getCategoryColor(category);

                      return (
                        <React.Fragment key={category}>
                          {/* Category Header Row (Excel Style) */}
                          <tr className={`${catColor.bg} font-display font-bold uppercase tracking-widest text-[10px] border-y border-zinc-850`}>
                            <td colSpan={13} className="p-3 pl-4">
                              <span className="flex items-center gap-1.5">
                                <span>{category}</span>
                                <span className="text-[8px] font-mono font-normal opacity-70">({categoryProducts.length} ítems)</span>
                              </span>
                            </td>
                          </tr>

                          {/* Category Product Rows */}
                          {categoryProducts.map(prod => {
                            const row = rows[prod.id] || {
                              productId: prod.id,
                              productName: prod.name,
                              category: prod.category,
                              unitPrice: prod.price,
                              initialStock: prod.quantity,
                              entradas: 0,
                              consumoNoche: 0,
                              promos: 0,
                              botellasAbiertas: 0,
                              botellasVacias: 0,
                              cortesias: 0,
                              fisicoEnBarra: prod.quantity
                            };

                            const { totalConsumo, totalGanancia, theoreticalStock, discrepancy } = getRowCalculations(row);
                            const waiterSoldQty = approvedWaiterReports.reduce((acc, r) => acc + (r.items?.filter(it => it.productId === prod.id).reduce((sum, it) => sum + it.quantity, 0) || 0), 0);

                            return (
                              <tr key={prod.id} className="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900">
                                {/* Name and barcode */}
                                <td className="p-3 pl-4">
                                  <div className="font-medium text-white text-[12px]">{prod.name}</div>
                                  <div className="text-[9px] font-mono text-zinc-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <span>COD: {prod.internalCode}</span>
                                    {prod.barCode && (
                                      <>
                                        <span className="text-zinc-700">•</span>
                                        <span>EAN: {prod.barCode}</span>
                                      </>
                                    )}
                                    {row.copasVendidas && row.copasVendidas > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.2 rounded font-bold">
                                        <Wine className="w-2.5 h-2.5 text-amber-400" />
                                        <span>{row.copasVendidas} copa{row.copasVendidas > 1 ? 's' : ''} ({row.copasMl}ml) POS</span>
                                      </span>
                                    ) : null}
                                    {waiterSoldQty > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-sky-400 bg-sky-950/50 border border-sky-800/50 px-1.5 py-0.2 rounded font-bold">
                                        <UserCheck className="w-2.5 h-2.5 text-sky-400" />
                                        <span>{waiterSoldQty} un. por Meseros</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Initial stock */}
                                <td className="p-3 text-center font-mono text-zinc-400 bg-zinc-900/30">
                                  {row.initialStock} {prod.unit}s
                                </td>

                                {/* Ingresos (automatic entries / purchases) */}
                                <td className="p-3 text-center font-mono text-emerald-400 bg-zinc-950/40 border-x border-zinc-900">
                                  +{row.entradas || 0} {prod.unit}s
                                </td>

                                {/* Consumo noche tally input */}
                                <td className="p-3 bg-red-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'consumoNoche', Math.max(0, row.consumoNoche - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.consumoNoche || ''}
                                      onChange={(e) => updateRowField(prod.id, 'consumoNoche', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 bg-zinc-900 border border-zinc-800 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-red-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'consumoNoche', row.consumoNoche + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {row.copasVendidas && row.copasVendidas > 0 ? (
                                    <div className="mt-1 text-center text-[9px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1 py-0.5 rounded flex items-center justify-center gap-1" title="Copas vendidas en POS">
                                      <Wine className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                                      <span>{row.copasVendidas} copa{row.copasVendidas > 1 ? 's' : ''} ({row.copasMl}ml)</span>
                                    </div>
                                  ) : null}
                                </td>

                                {/* Promos input */}
                                <td className="p-3 bg-red-950/5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'promos', Math.max(0, row.promos - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.promos || ''}
                                      onChange={(e) => updateRowField(prod.id, 'promos', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 bg-zinc-900 border border-zinc-800 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-red-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'promos', row.promos + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Unit Price */}
                                <td className="p-3 text-right font-mono text-zinc-400">
                                  Bs {row.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                </td>

                                {/* Total Consumo */}
                                <td className="p-3 text-center font-mono font-semibold text-zinc-300">
                                  {totalConsumo}
                                </td>

                                {/* Total de Ganancia */}
                                <td className="p-3 text-right font-mono font-bold text-emerald-400 bg-emerald-950/10">
                                  <div>Bs {totalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                                  {row.copasGanancia && row.copasGanancia > 0 ? (
                                    <div className="text-[9px] text-amber-300 font-normal mt-0.5" title="Recaudación por copas vendidas">
                                      +Bs {row.copasGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Copas)
                                    </div>
                                  ) : null}
                                </td>

                              {/* Botellas Abiertas */}
                                <td className="p-3 bg-purple-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'botellasAbiertas', Math.max(0, row.botellasAbiertas - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-purple-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.botellasAbiertas || ''}
                                      onChange={(e) => updateRowField(prod.id, 'botellasAbiertas', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-11 bg-zinc-900 border border-zinc-800 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-purple-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'botellasAbiertas', row.botellasAbiertas + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-purple-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Botellas Vacías / Desechadas */}
                                <td className="p-3 bg-amber-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'botellasVacias', Math.max(0, (row.botellasVacias || 0) - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-amber-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.botellasVacias || ''}
                                      onChange={(e) => updateRowField(prod.id, 'botellasVacias', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-11 bg-zinc-900 border border-zinc-800 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'botellasVacias', (row.botellasVacias || 0) + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-amber-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Cortesias */}
                                <td className="p-3 bg-amber-950/5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'cortesias', Math.max(0, row.cortesias - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-amber-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.cortesias || ''}
                                      onChange={(e) => updateRowField(prod.id, 'cortesias', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-11 bg-zinc-900 border border-zinc-800 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'cortesias', row.cortesias + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-amber-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Total en Barra (Físico real override) */}
                                <td className="p-3 bg-orange-950/10">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'fisicoEnBarra', Math.max(0, row.fisicoEnBarra - 1))}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-orange-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.fisicoEnBarra}
                                      onChange={(e) => updateRowField(prod.id, 'fisicoEnBarra', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 bg-zinc-900 border border-zinc-850 text-center py-1 rounded text-white font-mono text-xs focus:outline-none focus:border-orange-600 font-bold"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateRowField(prod.id, 'fisicoEnBarra', row.fisicoEnBarra + 1)}
                                      className="w-5 h-5 bg-zinc-900 border border-zinc-800 hover:border-orange-600 rounded flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* Discrepancy Difference */}
                                <td className="p-3 text-center pr-4">
                                  {discrepancy === 0 ? (
                                    <span className="text-zinc-600 font-mono text-xs">-</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                      discrepancy > 0 
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' 
                                        : 'bg-red-950 text-red-400 border border-red-900/30'
                                    }`}>
                                      {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Bottom Row totals overview */}
            <div className="bg-zinc-900/60 p-4 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-400 font-mono">
              <div>
                <span>* Las celdas de </span>
                <strong className="text-orange-400">Stock Físico</strong>
                <span> se pre-calculan automáticamente según la fórmula: Inicial - Consumo. Puede modificarlas libremente si el conteo físico real difiere.</span>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="bg-red-950/45 border border-red-900/60 text-red-200 p-4 rounded-xl flex items-center gap-3 text-xs font-mono mt-4 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <span className="font-bold">Error:</span> {validationError}
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Limpiar / Hoja en Blanco</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint('printable-new-sheet-area')}
              className="px-5 py-3 border border-emerald-800/60 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir Hoja de Cierre</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSheet}
              className={`px-6 py-3 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSaving 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20'
              }`}
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Registrando Planilla...' : 'Guardar y Cerrar Jornada'}</span>
            </button>
          </div>
        </div>
        );
      })()}

      {activeTab === 'history' && (
        /* HISTORY TAB VIEW */
        <div className="space-y-6 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                <span>Historial de Hojas de Inventario Consolidadas</span>
              </h3>
              
              {/* Filter by Caja */}
              {hasFullHistoryAccess ? (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase">Caja:</span>
                  <select
                    className="bg-zinc-900 border border-zinc-800 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
                    value={historyCajaFilter}
                    onChange={(e) => setHistoryCajaFilter(e.target.value)}
                  >
                    <option value="all">Todas las Cajas</option>
                    <option value="Caja 1">Caja 1</option>
                    <option value="Caja 2">Caja 2</option>
                    <option value="Caja 3">Caja 3</option>
                    <option value="Caja 4">Caja 4</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-850 px-3 py-1.5 rounded-xl">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase">Su Caja:</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{cajaAsociada}</span>
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 font-mono text-xs gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <span>Cargando registros históricos de base de datos...</span>
              </div>
            ) : filteredHistorySheets.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 font-mono text-xs border border-dashed border-zinc-850 rounded-xl">
                {!hasFullHistoryAccess 
                  ? `No se registran planillas guardadas anteriormente para ${cajaAsociada} en Firestore.`
                  : "No se registran planillas guardadas anteriormente en Firestore."
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                      <th className="p-4">Fecha / Hora de Cierre</th>
                      <th className="p-4">Encargado de Barra</th>
                      <th className="p-4">Caja de Barra</th>
                      <th className="p-4">Establecimiento</th>
                      <th className="p-4 text-center">Unidades Consumidas</th>
                      <th className="p-4 text-center">Total Cortesías</th>
                      <th className="p-4 text-right">Recaudación (Bs)</th>
                      <th className="p-4 text-center">Discrepancias</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredHistorySheets
                      .map(sheet => {
                        const sheetDate = new Date(sheet.createdAt);
                        return (
                          <tr key={sheet.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-mono text-white">
                              <div className="font-bold">{new Date(sheet.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</div>
                              <span className="text-[10px] text-zinc-500">Reg: {sheetDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="p-4 font-medium text-zinc-300">
                              {sheet.encargado}
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-400">
                              {sheet.cajaAsociada || 'Caja 1'}
                            </td>
                            <td className="p-4 font-mono text-zinc-500">
                              {sheet.establecimiento}
                            </td>
                            <td className="p-4 text-center font-mono font-bold text-zinc-300">
                              {sheet.totals?.globalConsumo || 0}
                            </td>
                            <td className="p-4 text-center font-mono text-amber-500">
                              {sheet.totals?.globalCortesias || 0}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                              Bs {(sheet.totals?.globalGanancia || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center">
                              {sheet.totals?.productsWithDiscrepancies > 0 ? (
                                <span className="bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                  {sheet.totals.productsWithDiscrepancies} discrepancias
                                </span>
                              ) : (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                  Sin diferencias
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setSelectedHistorySheet(sheet)}
                                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Inspeccionar</span>
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

      {activeTab === 'consolidated' && (() => {
        if (currentUser?.role !== UserRole.ALMACENERO) {
          return (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-6 my-12 shadow-2xl">
              <div className="w-16 h-16 bg-red-950/40 border border-red-900/60 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-lg shadow-red-950/20">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-wide font-sans">Acceso Restringido</h3>
                <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                  El módulo de <span className="text-red-400 font-semibold">Cierre Total de Cajas (Reconciliación Consolidada)</span> es de uso exclusivo para el personal con el rol de <span className="text-emerald-400 font-semibold">Almacenero</span>.
                </p>
                <p className="text-[11px] text-zinc-500 font-mono mt-2">
                  Su rol actual: <span className="text-amber-400 font-bold">{currentUser?.role || 'Ninguno'}</span>
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-900/60">
                <button
                  onClick={() => setActiveTab('new-sheet')}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono text-white rounded-xl transition-all cursor-pointer"
                >
                  Volver a Nueva Planilla
                </button>
              </div>
            </div>
          );
        }

        const getCajaSessionSummary = (cajaName: string, daySessionsList: any[]) => {
          const matches = daySessionsList.filter(s => (s.cajaAsociada || 'Caja 1') === cajaName);
          if (matches.length === 0) return null;
          
          const isAnyOpen = matches.some(s => s.status === 'Abierta');
          const userNames = Array.from(new Set(matches.map(s => s.userName))).join(', ');
          const openingBalance = matches.reduce((acc, s) => acc + (s.openingBalance || 0), 0);
          const salesTotal = matches.reduce((acc, s) => acc + (s.salesTotal || 0), 0);
          const cashInflows = matches.reduce((acc, s) => acc + (s.cashInflows || 0), 0);
          const cashOutflows = matches.reduce((acc, s) => acc + (s.cashOutflows || 0), 0);
          const expectedBalance = matches.reduce((acc, s) => acc + (s.expectedBalance || 0), 0);
          const realBalance = matches.reduce((acc, s) => acc + (s.realBalance !== undefined ? s.realBalance : (s.expectedBalance || 0)), 0);
          const difference = matches.reduce((acc, s) => acc + (s.difference !== undefined ? s.difference : 0), 0);
          const isFullyClosed = matches.every(s => s.status === 'Cerrada');

          return {
            cajaName,
            userName: userNames,
            status: isAnyOpen ? 'Abierta' : 'Cerrada',
            isFullyClosed,
            openingBalance,
            salesTotal,
            cashInflows,
            cashOutflows,
            expectedBalance,
            realBalance,
            difference,
            sessionsCount: matches.length
          };
        };

        const getCajaSheetSummary = (cajaName: string, daySheetsList: any[]) => {
          const matches = daySheetsList.filter(sheet => (sheet.cajaAsociada || 'Caja 1') === cajaName);
          if (matches.length === 0) return null;
          
          const supervisors = Array.from(new Set(matches.map(s => s.encargado))).join(', ');
          const globalConsumo = matches.reduce((acc, s) => acc + (s.totals?.globalConsumo || 0), 0);
          const globalCortesias = matches.reduce((acc, s) => acc + (s.totals?.globalCortesias || 0), 0);
          const globalGanancia = matches.reduce((acc, s) => acc + (s.totals?.globalGanancia || 0), 0);
          const productsWithDiscrepancies = matches.reduce((acc, s) => acc + (s.totals?.productsWithDiscrepancies || 0), 0);
          const globalDiferenciaCount = matches.reduce((acc, s) => acc + (s.totals?.globalDiferenciaCount || 0), 0);

          return {
            cajaName,
            encargado: supervisors,
            globalConsumo,
            globalCortesias,
            globalGanancia,
            productsWithDiscrepancies,
            globalDiferenciaCount,
            sheetsList: matches
          };
        };

        const targetDate = consolidatedFecha;
        const daySessions = cashSessions.filter(s => s.openedAt && s.openedAt.substring(0, 10) === targetDate);
        const daySheets = historySheets.filter(sheet => sheet.fecha === targetDate);
        const dayExpenses = cashExpenses.filter(exp => exp.date && exp.date.substring(0, 10) === targetDate);
        const totalExpensesDayCount = dayExpenses.reduce((acc, exp) => acc + exp.amount, 0);

        const cajas = ['Caja 1', 'Caja 2', 'Caja 3', 'Caja 4'];

        // Totals of all cash sessions
        let totalSencillo = 0;
        let totalVentasPOS = 0;
        let totalIngresos = 0;
        let totalEgresos = 0;
        let totalEsperado = 0;
        let totalEntregado = 0;
        let totalDiferenciaCaja = 0;
        let hasActiveSessions = false;

        daySessions.forEach(s => {
          hasActiveSessions = true;
          totalSencillo += s.openingBalance || 0;
          totalVentasPOS += s.salesTotal || 0;
          totalIngresos += s.cashInflows || 0;
          totalEgresos += s.cashOutflows || 0;
          totalEsperado += s.expectedBalance || 0;
          totalEntregado += s.realBalance !== undefined ? s.realBalance : (s.expectedBalance || 0);
          totalDiferenciaCaja += s.difference !== undefined ? s.difference : 0;
        });

        // Totals of all sheets
        let totalConsumoUnidades = 0;
        let totalCortesiasUnidades = 0;
        let totalGananciaEstimadaBarra = 0;
        let totalDiferenciaFisico = 0;
        let totalDiscrepanciesItemsCount = 0;

        daySheets.forEach(sheet => {
          totalConsumoUnidades += sheet.totals?.globalConsumo || 0;
          totalCortesiasUnidades += sheet.totals?.globalCortesias || 0;
          totalGananciaEstimadaBarra += sheet.totals?.globalGanancia || 0;
          totalDiferenciaFisico += sheet.totals?.globalDiferenciaCount || 0;
          totalDiscrepanciesItemsCount += sheet.totals?.productsWithDiscrepancies || 0;
        });

        // Calculate Payment Breakdown across all planillas or POS sales of the target date
        let consolidatedEfectivo = 0;
        let consolidatedQR = 0;
        let consolidatedTarjeta = 0;
        let consolidatedTransferencia = 0;

        let hasSheetBreakdown = false;
        daySheets.forEach(sheet => {
          if (sheet.paymentBreakdown) {
            hasSheetBreakdown = true;
            consolidatedEfectivo += Number(sheet.paymentBreakdown.efectivo) || 0;
            consolidatedQR += Number(sheet.paymentBreakdown.qr) || 0;
            consolidatedTarjeta += Number(sheet.paymentBreakdown.tarjeta) || 0;
            consolidatedTransferencia += Number(sheet.paymentBreakdown.transferencia) || 0;
          }
        });

        if (!hasSheetBreakdown) {
          const dateSales = (sales || []).filter(s => s.date && s.date.substring(0, 10) === targetDate);
          dateSales.forEach(s => {
            const cat = parsePaymentCategory(s.paymentMethod);
            if (cat === 'efectivo') consolidatedEfectivo += s.total || 0;
            else if (cat === 'qr') consolidatedQR += s.total || 0;
            else if (cat === 'tarjeta') consolidatedTarjeta += s.total || 0;
            else if (cat === 'transferencia') consolidatedTransferencia += s.total || 0;
          });
        }

        const consolidatedTotalRecaudado = consolidatedEfectivo + consolidatedQR + consolidatedTarjeta + consolidatedTransferencia;

        // Compile list of individual product count discrepancies across all sheets of the day
        const allDiscrepancies: any[] = [];
        daySheets.forEach(sheet => {
          if (sheet.items && sheet.items.length > 0) {
            sheet.items.forEach((item: any) => {
              if (item.discrepancy !== 0) {
                allDiscrepancies.push({
                  cajaAsociada: sheet.cajaAsociada || 'Caja 1',
                  encargado: sheet.encargado,
                  ...item
                });
              }
            });
          }
        });

        // Waiter sales & comanda reports sent to caja for targetDate
        const dayWaiterReports = (waiterReports || []).filter(r => r.date && r.date.substring(0, 10) === targetDate);
        
        let totalMontoMeserosAprobado = 0;
        let totalComandasAprobadasCount = 0;
        let totalComandasPendientesCount = 0;

        dayWaiterReports.forEach(r => {
          if (r.status === 'aprobado') {
            totalMontoMeserosAprobado += r.total || 0;
            totalComandasAprobadasCount++;
          } else if (r.status === 'pendiente') {
            totalComandasPendientesCount++;
          }
        });

        const waiterSummaryMap: Record<string, {
          waiterName: string;
          totalReportes: number;
          aprobados: number;
          pendientes: number;
          rechazados: number;
          totalMonto: number;
          itemsVendidos: { productName: string; quantity: number }[];
          cajasDestino: Set<string>;
        }> = {};

        dayWaiterReports.forEach(r => {
          const wName = r.waiterName || 'Mesero';
          if (!waiterSummaryMap[wName]) {
            waiterSummaryMap[wName] = {
              waiterName: wName,
              totalReportes: 0,
              aprobados: 0,
              pendientes: 0,
              rechazados: 0,
              totalMonto: 0,
              itemsVendidos: [],
              cajasDestino: new Set()
            };
          }
          const w = waiterSummaryMap[wName];
          w.totalReportes++;
          if (r.targetCaja) w.cajasDestino.add(r.targetCaja);

          if (r.status === 'aprobado') {
            w.aprobados++;
            w.totalMonto += r.total || 0;
            if (r.items) {
              r.items.forEach(it => {
                const ex = w.itemsVendidos.find(x => x.productName === it.productName);
                if (ex) ex.quantity += it.quantity;
                else w.itemsVendidos.push({ productName: it.productName, quantity: it.quantity });
              });
            }
          } else if (r.status === 'pendiente') {
            w.pendientes++;
          } else if (r.status === 'rechazado') {
            w.rechazados++;
          }
        });

        const waiterSummaryList = Object.values(waiterSummaryMap);

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Control Panel / Date Picker */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-sans flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Consolidación y Auditoría General de Caja y Barra</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-1">VISTA CONSOLIDADA DE TURNOS DE EFECTIVO E INVENTARIOS DE BEBIDAS</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <input
                    type="date"
                    className="bg-transparent border-none text-xs text-white focus:outline-none font-mono cursor-pointer"
                    value={targetDate}
                    onChange={(e) => setConsolidatedFecha(e.target.value)}
                  />
                </div>

                <button
                  onClick={loadHistory}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Sincronizar Datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handlePrint('consolidated-report-print')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Planilla General</span>
                </button>
              </div>
            </div>

            {/* Print Container Wrapper */}
            <div id="consolidated-report-print" className="space-y-6">
              {/* Printable Header - hidden on screen, visible on print */}
              <div className="hidden print:block border-b border-zinc-900 pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-xl font-bold text-zinc-950">AMBAR CLUB - RECONCILIACIÓN DIARIA</h1>
                    <p className="text-xs text-zinc-600 font-mono">CIERRE GENERAL DE CAJAS & BARRA • FECHA: {new Date(targetDate).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 font-mono">
                    Generado por: {currentUser?.name || 'Administración'} • {new Date().toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              {/* Top Consolidated Metrics Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Cash in registers summary */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Recaudación Total POS</p>
                    <h3 className="text-xl font-bold text-emerald-400 mt-1">
                      Bs {totalVentasPOS.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">En {daySessions.length} turnos declarados</p>
                  </div>
                  <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                {/* Waiter Sales summary */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ventas por Meseros</p>
                    <h3 className="text-xl font-bold text-sky-400 mt-1">
                      Bs {totalMontoMeserosAprobado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">
                      {totalComandasAprobadasCount} comandas aprobadas {totalComandasPendientesCount > 0 ? `(${totalComandasPendientesCount} pend.)` : ''}
                    </p>
                  </div>
                  <div className="bg-sky-950/20 p-2 rounded-lg border border-sky-900/40">
                    <UserCheck className="w-5 h-5 text-sky-400" />
                  </div>
                </div>

                {/* Cash Balance total with discrepancy */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Arqueo Neto de Efectivo</p>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Bs {totalEntregado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      {totalDiferenciaCaja === 0 ? (
                        <span className="text-[9px] font-mono text-emerald-400">● Caja cuadrada</span>
                      ) : (
                        <span className={`text-[9px] font-mono px-1 rounded font-bold ${totalDiferenciaCaja > 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                          Dif: {totalDiferenciaCaja > 0 ? '+' : ''}{totalDiferenciaCaja.toFixed(2)} {config?.currency || 'Bs'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <Coins className="w-5 h-5 text-zinc-400" />
                  </div>
                </div>

                {/* Bar Consumption Units and Gain */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ventas Estimadas en Barra</p>
                    <h3 className="text-xl font-bold text-teal-400 mt-1">
                      Bs {totalGananciaEstimadaBarra.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">{totalConsumoUnidades} unidades de bebida vendidas</p>
                  </div>
                  <div className="bg-teal-950/20 p-2 rounded-lg border border-teal-900/40">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                  </div>
                </div>

                {/* Cash Expenses card */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Gastos de Caja Chica</p>
                    <h3 className="text-xl font-bold text-red-500 mt-1">
                      Bs {totalExpensesDayCount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">{dayExpenses.length} egresos registrados</p>
                  </div>
                  <div className="bg-red-950/20 p-2 rounded-lg border border-red-900/40">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                </div>

                {/* Stock Discrepancy metrics */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Diferencias Físicas Barra</p>
                    <h3 className={`text-xl font-bold mt-1 ${totalDiscrepanciesItemsCount > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                      {totalDiscrepanciesItemsCount} <span className="text-xs font-normal">bebidas</span>
                    </h3>
                    <p className="text-[9px] font-mono text-zinc-500 mt-1">
                      {totalDiferenciaFisico === 0 ? 'Conteo físico coincide' : `Discrepancia neta: ${totalDiferenciaFisico > 0 ? '+' : ''}${totalDiferenciaFisico} unidades`}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg border ${totalDiscrepanciesItemsCount > 0 ? 'bg-red-950/20 border-red-900/40' : 'bg-zinc-900 border-zinc-800'}`}>
                    <AlertTriangle className={`w-5 h-5 ${totalDiscrepanciesItemsCount > 0 ? 'text-red-500' : 'text-zinc-600'}`} />
                  </div>
                </div>
              </div>

              {/* CONSOLIDATED PAYMENT METHODS BREAKDOWN (Efectivo, QR, Tarjeta, Transferencia) */}
              <div className="bg-zinc-950 border border-amber-900/40 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Desglose Consolidado por Método de Pago (Efectivo, QR, Tarjeta, Transferencia)
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-sans">
                        Resumen de cobros totales agrupados para la fecha seleccionada ({targetDate})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-xl shadow-sm">
                      Total Recaudado: Bs {consolidatedTotalRecaudado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Efectivo */}
                  <div className="bg-zinc-900/60 border border-emerald-900/40 rounded-xl p-3.5 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 uppercase font-bold">
                      <span>💵 Efectivo</span>
                      <span className="text-zinc-500 text-[9px]">Efectivo Físico</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400 pt-0.5">
                      Bs {consolidatedEfectivo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Pago QR */}
                  <div className="bg-zinc-900/60 border border-cyan-900/40 rounded-xl p-3.5 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      <span>📱 Pago QR</span>
                      <span className="text-zinc-500 text-[9px]">Banco Digital</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-cyan-400 pt-0.5">
                      Bs {consolidatedQR.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Tarjeta */}
                  <div className="bg-zinc-900/60 border border-indigo-900/40 rounded-xl p-3.5 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-indigo-400 uppercase font-bold">
                      <span>💳 Tarjeta</span>
                      <span className="text-zinc-500 text-[9px]">Débito / Crédito</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-indigo-400 pt-0.5">
                      Bs {consolidatedTarjeta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Transferencia */}
                  <div className="bg-zinc-900/60 border border-purple-900/40 rounded-xl p-3.5 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-purple-400 uppercase font-bold">
                      <span>🏦 Transferencia</span>
                      <span className="text-zinc-500 text-[9px]">Abono Bancario</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-purple-400 pt-0.5">
                      Bs {consolidatedTransferencia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: DESGLOSE Y CONTROL DE VENTAS POR MESEROS (ENVIADAS A CAJA) */}
              <div className="bg-zinc-950 border border-sky-900/40 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>Control y Atribución de Ventas por Mesero (Comandas Enviadas a Caja)</span>
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                    REGISTRO INDIVIDUAL DE VENTAS Y PRODUCTOS ENVIADOS
                  </span>
                </div>

                <div className="p-5 space-y-6">
                  {waiterSummaryList.length === 0 ? (
                    <div className="py-6 text-center text-zinc-500 font-mono text-xs italic border border-dashed border-zinc-850 rounded-xl">
                      - No se registraron ventas o comandas de meseros enviadas a caja en esta fecha ({targetDate}) -
                    </div>
                  ) : (
                    <>
                      {/* Grid de Meseros */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {waiterSummaryList.map((w, idx) => (
                          <div key={idx} className="bg-zinc-900/60 border border-zinc-850 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
                              <div>
                                <h4 className="font-sans font-bold text-white text-sm flex items-center gap-2">
                                  <User className="w-4 h-4 text-sky-400" />
                                  <span>{w.waiterName}</span>
                                </h4>
                                <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                  Entregado en: <span className="text-zinc-200 font-semibold">{Array.from(w.cajasDestino).join(', ') || 'Caja'}</span>
                                </p>
                              </div>
                              <span className="bg-sky-950 text-sky-300 border border-sky-800/50 font-mono text-xs font-bold px-2.5 py-1 rounded-lg">
                                Bs {w.totalMonto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                              <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                                <span className="text-zinc-500 block uppercase">Enviadas</span>
                                <span className="font-bold text-white text-xs">{w.totalReportes}</span>
                              </div>
                              <div className="bg-emerald-950/30 p-2 rounded border border-emerald-900/40">
                                <span className="text-emerald-500 block uppercase">Aprobadas</span>
                                <span className="font-bold text-emerald-400 text-xs">{w.aprobados}</span>
                              </div>
                              <div className="bg-amber-950/30 p-2 rounded border border-amber-900/40">
                                <span className="text-amber-500 block uppercase">Pend/Rech</span>
                                <span className="font-bold text-amber-400 text-xs">{w.pendientes + w.rechazados}</span>
                              </div>
                            </div>

                            {w.itemsVendidos.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[9.5px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Detalle de Bebidas / Productos:</p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                  {w.itemsVendidos.map((it, i) => (
                                    <span key={i} className="bg-zinc-950 text-zinc-300 text-[9.5px] font-mono px-2 py-0.5 rounded border border-zinc-800">
                                      {it.quantity}x {it.productName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Tabla Histórica de Ventas por Mesero a Caja */}
                      <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs font-sans">
                          <thead>
                            <tr className="bg-zinc-900/80 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                              <th className="p-3 pl-4">Hora</th>
                              <th className="p-3">Mesero Solicitante</th>
                              <th className="p-3">Caja Destino</th>
                              <th className="p-3">Bebidas y Productos Enviados a Caja</th>
                              <th className="p-3">Método Pago</th>
                              <th className="p-3 text-center">Estado Caja</th>
                              <th className="p-3 text-right pr-4">Monto Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/80 font-mono">
                            {dayWaiterReports.map((report) => (
                              <tr key={report.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-3 pl-4 text-zinc-400 text-[10px]">
                                  {new Date(report.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-3 font-bold text-white font-sans">{report.waiterName}</td>
                                <td className="p-3 text-sky-400 font-semibold">{report.targetCaja || 'Caja 1'}</td>
                                <td className="p-3 text-zinc-300 font-sans max-w-xs">
                                  <div className="line-clamp-2">
                                    {report.items?.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                                  </div>
                                </td>
                                <td className="p-3 text-zinc-400">{report.paymentMethod}</td>
                                <td className="p-3 text-center">
                                  {report.status === 'aprobado' ? (
                                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                      ✓ Aprobado
                                    </span>
                                  ) : report.status === 'pendiente' ? (
                                    <span className="bg-amber-950 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse">
                                      ⏳ Pendiente
                                    </span>
                                  ) : (
                                    <span className="bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                      ✕ Rechazado
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right pr-4 font-bold text-emerald-400">
                                  Bs {report.total.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION A: CASH REGISTER SESSION RECONCILIATION */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Resumen y Cuadre de Turnos por Caja de Barra</span>
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">AUDITORÍA FISCAL DE EFECTIVO • ARQUEO GENERAL</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-zinc-900/60 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                        <th className="p-4 pl-5">Caja de Barra</th>
                        <th className="p-4">Cajero Responsable</th>
                        <th className="p-4 text-center">Estado Turno</th>
                        <th className="p-4 text-right">Fondo Apertura</th>
                        <th className="p-4 text-right text-emerald-400">Ventas POS (+)</th>
                        <th className="p-4 text-right text-sky-400">Ingresos (+)</th>
                        <th className="p-4 text-right text-red-400">Gastos/Egresos (-)</th>
                        <th className="p-4 text-right">Teórico Esperado</th>
                        <th className="p-4 text-right font-bold text-white">Declarado Real</th>
                        <th className="p-4 text-center pr-5">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {cajas.map(cajaName => {
                        const summary = getCajaSessionSummary(cajaName, daySessions);

                        if (!summary) {
                          return (
                            <tr key={cajaName} className="hover:bg-zinc-900/10 transition-colors text-zinc-600">
                              <td className="p-4 pl-5 font-mono font-bold text-zinc-500">{cajaName}</td>
                              <td className="p-4 italic font-mono text-[10px]">- Sin Actividad Registrada -</td>
                              <td className="p-4 text-center">
                                <span className="bg-zinc-900 border border-zinc-850 text-zinc-600 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Inactiva
                                </span>
                              </td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-right font-mono text-zinc-500">Bs 0.00</td>
                              <td className="p-4 text-center pr-5 font-mono">-</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={cajaName} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 pl-5 font-mono font-bold text-zinc-300">{cajaName}</td>
                            <td className="p-4 text-zinc-400 font-medium truncate max-w-[150px]">{summary.userName}</td>
                            <td className="p-4 text-center">
                              {summary.status === 'Abierta' ? (
                                <span className="bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  Abierta
                                </span>
                              ) : (
                                <span className="bg-red-950/40 border border-red-900/40 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                  Cerrada
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono text-zinc-400">Bs {summary.openingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono text-emerald-400 font-semibold">Bs {summary.salesTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono text-zinc-400">Bs {summary.cashInflows.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono text-zinc-400">Bs {summary.cashOutflows.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono text-zinc-300 font-semibold">Bs {summary.expectedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right font-mono font-bold text-white bg-zinc-900/30">Bs {summary.realBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-center pr-5">
                              {!summary.isFullyClosed ? (
                                <span className="text-[10px] text-zinc-500 font-mono italic">Esperando cierre...</span>
                              ) : summary.difference === 0 ? (
                                <span className="text-emerald-400 font-mono font-bold">Cuadrada</span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${summary.difference > 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                                  {summary.difference > 0 ? `+${summary.difference.toFixed(2)}` : summary.difference.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Cash Register Table Grand Totals Row */}
                      {hasActiveSessions && (
                        <tr className="bg-zinc-900/80 font-mono font-bold border-t border-zinc-800 text-[11px]">
                          <td colSpan={2} className="p-4 pl-5 uppercase tracking-wider text-zinc-400">Total General de Cajas</td>
                          <td className="p-4 text-center">
                            <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {daySessions.filter(s => s.status === 'Abierta').length} Abiertas / {daySessions.filter(s => s.status === 'Cerrada').length} Cerradas
                            </span>
                          </td>
                          <td className="p-4 text-right text-zinc-300">Bs {totalSencillo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-emerald-400">Bs {totalVentasPOS.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-zinc-300">Bs {totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-zinc-300">Bs {totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-zinc-300 font-black">Bs {totalEsperado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-white font-black bg-zinc-900/90">Bs {totalEntregado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-center pr-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${totalDiferenciaCaja >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                              {totalDiferenciaCaja > 0 ? '+' : ''}{totalDiferenciaCaja.toFixed(2)} {config?.currency || 'Bs'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: DAILY CASH EXPENSES DETAIL */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Detalle de Gastos de Caja Chica del Día</span>
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider">EGRESOS REPORTADOS • RESPALDO DE COMPRAS Y RETIROS</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-zinc-900/60 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                        <th className="p-4 pl-5">Hora</th>
                        <th className="p-4">Caja Origen</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Detalle / Concepto</th>
                        <th className="p-4">Entregado a (Beneficiario)</th>
                        <th className="p-4">Autorizado por</th>
                        <th className="p-4">Registrado por</th>
                        <th className="p-4 text-right pr-5">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {dayExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-zinc-500 italic font-mono text-[11px]">
                            - No se registraron egresos o gastos de caja en esta fecha -
                          </td>
                        </tr>
                      ) : (
                        dayExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-zinc-900/10 transition-colors">
                            <td className="p-4 pl-5 font-mono text-zinc-450">
                              {new Date(exp.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-4 font-mono text-red-400 font-bold">{exp.cajaAsociada}</td>
                            <td className="p-4 font-mono text-zinc-300">
                              <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-[9px] font-bold">
                                {exp.category}
                              </span>
                            </td>
                            <td className="p-4 font-sans text-zinc-200 font-semibold">{exp.description}</td>
                            <td className="p-4 font-sans text-zinc-400">{exp.recipient}</td>
                            <td className="p-4 font-mono text-[10px] text-zinc-400">{exp.authorizedBy}</td>
                            <td className="p-4 font-sans text-zinc-500">{exp.registeredBy}</td>
                            <td className="p-4 text-right pr-5 font-mono text-white font-bold">
                              Bs {exp.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}

                      {dayExpenses.length > 0 && (
                        <tr className="bg-zinc-900/80 font-mono font-bold border-t border-zinc-800 text-[11px]">
                          <td colSpan={7} className="p-4 pl-5 uppercase tracking-wider text-zinc-450">
                            Total Gastos y Retiros del Día
                          </td>
                          <td className="p-4 text-right pr-5 text-red-400 font-black">
                            Bs {totalExpensesDayCount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION B: DAILY INVENTORY BAR SHEETS */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span>Planillas Diarias de Cierre de Barra (Inventarios Físicos)</span>
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">KARDEX DIARIO • RECONCILIACIÓN DE CONTEO FÍSICO</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-zinc-900/60 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-850">
                        <th className="p-4 pl-5">Caja Asociada</th>
                        <th className="p-4">Supervisor / Bartender</th>
                        <th className="p-4 text-center">Estado Planilla</th>
                        <th className="p-4 text-center">Bebidas Vendidas</th>
                        <th className="p-4 text-center">Cortesías</th>
                        <th className="p-4 text-right text-teal-400">Ganancia Barra Estimada</th>
                        <th className="p-4 text-center">Diferencias Físicas</th>
                        <th className="p-4 text-center pr-5">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {cajas.map(cajaName => {
                        const summary = getCajaSheetSummary(cajaName, daySheets);

                        if (!summary) {
                          return (
                            <tr key={cajaName} className="hover:bg-zinc-900/10 transition-colors text-zinc-600">
                              <td className="p-4 pl-5 font-mono font-bold text-zinc-500">{cajaName}</td>
                              <td className="p-4 italic font-mono text-[10px]">- No Enviada Aún -</td>
                              <td className="p-4 text-center">
                                <span className="bg-amber-950/20 border border-amber-900/30 text-amber-500 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Pendiente
                                </span>
                              </td>
                              <td className="p-4 text-center font-mono">-</td>
                              <td className="p-4 text-center font-mono">-</td>
                              <td className="p-4 text-right font-mono">Bs 0.00</td>
                              <td className="p-4 text-center font-mono text-zinc-500 font-bold">Sin auditar</td>
                              <td className="p-4 text-center pr-5">-</td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={cajaName} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 pl-5 font-mono font-bold text-zinc-300">{cajaName}</td>
                            <td className="p-4 text-zinc-400 font-medium truncate max-w-[150px]">{summary.encargado}</td>
                            <td className="p-4 text-center">
                              <span className="bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 font-mono text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                Completado
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono text-zinc-300 font-semibold">{summary.globalConsumo} uds</td>
                            <td className="p-4 text-center font-mono text-amber-500">{summary.globalCortesias} uds</td>
                            <td className="p-4 text-right font-mono font-bold text-teal-400">Bs {summary.globalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 text-center">
                              {summary.productsWithDiscrepancies > 0 ? (
                                <span className="bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                  {summary.productsWithDiscrepancies} diferencias ({summary.globalDiferenciaCount > 0 ? '+' : ''}{summary.globalDiferenciaCount} uds)
                                </span>
                              ) : (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                                  Sin diferencias
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center pr-5">
                              {summary.sheetsList.map(sheet => (
                                <button
                                  key={sheet.id}
                                  onClick={() => setSelectedHistorySheet(sheet)}
                                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono px-2 py-1 rounded transition-all inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-emerald-500" />
                                  <span>Revisar Planilla</span>
                                </button>
                              ))}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Inventory Sheets Table Grand Totals Row */}
                      {daySheets.length > 0 && (
                        <tr className="bg-zinc-900/80 font-mono font-bold border-t border-zinc-800 text-[11px]">
                          <td colSpan={2} className="p-4 pl-5 uppercase tracking-wider text-zinc-400">Total General de Barra</td>
                          <td className="p-4 text-center">
                            <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {daySheets.length} de 4 planillas
                            </span>
                          </td>
                          <td className="p-4 text-center text-zinc-300">{totalConsumoUnidades} unidades</td>
                          <td className="p-4 text-center text-amber-500">{totalCortesiasUnidades} unidades</td>
                          <td className="p-4 text-right text-teal-400 font-black">Bs {totalGananciaEstimadaBarra.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${totalDiferenciaFisico === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                              Total: {totalDiferenciaFisico > 0 ? '+' : ''}{totalDiferenciaFisico} uds ({totalDiscrepanciesItemsCount} ítems)
                            </span>
                          </td>
                          <td className="p-4 pr-5 text-center">-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION C: DETAILED PRODUCT DISCREPANCIES FINDER */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-zinc-900/40 border-b border-zinc-900">
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                    <span>Incidencias de Inventario y Faltantes Detectados</span>
                  </h4>
                  <p className="text-[9px] text-zinc-500 font-mono mt-0.5">DETALLE CONSOLIDADO DE BEBIDAS QUE NO CUADRARON CON EL CONTEO FÍSICO DE TURNOS</p>
                </div>

                <div className="p-4">
                  {allDiscrepancies.length === 0 ? (
                    <div className="py-6 text-center text-zinc-600 font-mono text-xs border border-dashed border-zinc-850 rounded-xl flex flex-col items-center gap-1">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span>¡Perfecto! No se detectaron discrepancias de stock físico en ninguna de las planillas de barra cerradas en esta fecha.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-900/40 text-zinc-400 font-mono uppercase tracking-wider text-[9px] border-b border-zinc-850">
                            <th className="p-3 pl-4">Caja Asociada</th>
                            <th className="p-3">Supervisor / Bartender</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Producto / Bebida</th>
                            <th className="p-3 text-right">Precio Un.</th>
                            <th className="p-3 text-center">Stock Inic.</th>
                            <th className="p-3 text-center">Ingresos</th>
                            <th className="p-3 text-center">Consumo Noche</th>
                            <th className="p-3 text-center">Stock Teórico</th>
                            <th className="p-3 text-center font-bold text-orange-400">Stock Físico Real</th>
                            <th className="p-3 text-center pr-4">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 font-mono">
                          {allDiscrepancies.map((item, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="p-3 pl-4 font-bold text-emerald-400">{item.cajaAsociada}</td>
                              <td className="p-3 text-zinc-500 font-sans">{item.encargado}</td>
                              <td className="p-3 text-zinc-500 uppercase text-[10px]">{item.category}</td>
                              <td className="p-3 text-zinc-300 font-sans font-semibold">{item.productName}</td>
                              <td className="p-3 text-right text-zinc-500">Bs {item.unitPrice.toFixed(2)}</td>
                              <td className="p-3 text-center text-zinc-500">{item.initialStock}</td>
                              <td className="p-3 text-center text-emerald-500">+{item.entradas || 0}</td>
                              <td className="p-3 text-center text-zinc-400">{item.consumoNoche + item.promos + item.cortesias}</td>
                              <td className="p-3 text-center text-zinc-400">{item.theoreticalStock}</td>
                              <td className="p-3 text-center font-bold text-white bg-zinc-900/20">{item.fisicoEnBarra}</td>
                              <td className="p-3 text-center pr-4">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.discrepancy > 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                                  {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy} uds
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* INSPECTION DETAIL MODAL */}
      {selectedHistorySheet && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setSelectedHistorySheet(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Area Wrapper */}
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 flex-1" id="print-sheet-area">
              {/* Header Banner */}
              <div className="border-b border-zinc-900 pb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-xl">
                    A
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-widest font-sans">AMBAR CLUB</h2>
                    <p className="text-[10px] text-zinc-500 font-mono">CONCILIACIÓN DIARIA DE CIERRE DE BARRA</p>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-zinc-400 space-y-1">
                  <p><span className="text-zinc-500">Planilla ID:</span> <span className="text-zinc-300 font-bold">{selectedHistorySheet.id}</span></p>
                  <p><span className="text-zinc-500">Registro Fiscal:</span> <span className="text-zinc-300">{new Date(selectedHistorySheet.createdAt).toLocaleString('es-ES')}</span></p>
                </div>
              </div>

              {/* Title & Metadata Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-900/30 p-4 border border-zinc-900 rounded-xl text-xs font-mono text-zinc-300">
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] mb-0.5">Encargado de Barra</span>
                  <span className="font-bold text-white">{selectedHistorySheet.encargado}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] mb-0.5">Fecha Declarada</span>
                  <span className="font-bold text-white">{new Date(selectedHistorySheet.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] mb-0.5">Caja de Barra</span>
                  <span className="font-bold text-emerald-400">{selectedHistorySheet.cajaAsociada || 'Caja 1'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] mb-0.5">Establecimiento</span>
                  <span className="font-bold text-white">{selectedHistorySheet.establecimiento}</span>
                </div>
              </div>

              {/* Dynamic summary blocks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-900">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Consumo Global</div>
                  <div className="text-base font-bold text-white mt-1">{selectedHistorySheet.totals?.globalConsumo || 0} u.</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-900">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Cortesías Entregadas</div>
                  <div className="text-base font-bold text-amber-400 mt-1">{selectedHistorySheet.totals?.globalCortesias || 0} u.</div>
                </div>
                <div className="bg-emerald-950/10 p-3 rounded-lg border border-emerald-900/30">
                  <div className="text-[9px] font-mono text-emerald-500 uppercase">Ganancia de la Noche</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">Bs {(selectedHistorySheet.totals?.globalGanancia || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-900">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Ajuste Discrepancia</div>
                  <div className={`text-base font-bold mt-1 ${selectedHistorySheet.totals?.globalDiferenciaCount !== 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {selectedHistorySheet.totals?.globalDiferenciaCount > 0 ? `+${selectedHistorySheet.totals.globalDiferenciaCount}` : selectedHistorySheet.totals?.globalDiferenciaCount || 0} u.
                  </div>
                </div>
              </div>

              {/* Payment Method Breakdown Section */}
              <div className="bg-zinc-900/40 border border-amber-900/30 rounded-xl p-4 space-y-2 font-mono">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-2">
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Anotación de Pagos Registrados</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">
                    Total Declarado: Bs {(selectedHistorySheet.paymentBreakdown?.totalDeclared || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">💵 Efectivo</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      Bs {(selectedHistorySheet.paymentBreakdown?.efectivo || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">📱 Pago QR</span>
                    <span className="font-bold text-cyan-400 text-sm">
                      Bs {(selectedHistorySheet.paymentBreakdown?.qr || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">💳 Tarjeta</span>
                    <span className="font-bold text-indigo-400 text-sm">
                      Bs {(selectedHistorySheet.paymentBreakdown?.tarjeta || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px] uppercase font-bold">🏦 Transferencia</span>
                    <span className="font-bold text-purple-400 text-sm">
                      Bs {(selectedHistorySheet.paymentBreakdown?.transferencia || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Waiter Contributions Section in Saved Sheet Inspection */}
              {(() => {
                const contributions = selectedHistorySheet.waiterContributions || (() => {
                  const sheetFecha = selectedHistorySheet.fecha;
                  const sheetCaja = selectedHistorySheet.cajaAsociada || 'Caja 1';
                  const matches = (waiterReports || []).filter(r => 
                    r.date && r.date.substring(0, 10) === sheetFecha &&
                    (r.targetCaja === sheetCaja || !r.targetCaja || r.targetCaja === 'Caja 1') &&
                    r.status === 'aprobado'
                  );
                  const map: Record<string, { waiterName: string; total: number; count: number; items: { productName: string; quantity: number }[] }> = {};
                  matches.forEach(r => {
                    const name = r.waiterName || 'Mesero';
                    if (!map[name]) map[name] = { waiterName: name, total: 0, count: 0, items: [] };
                    map[name].total += r.total || 0;
                    map[name].count += 1;
                    if (r.items) {
                      r.items.forEach(it => {
                        const ex = map[name].items.find(x => x.productName === it.productName);
                        if (ex) ex.quantity += it.quantity;
                        else map[name].items.push({ productName: it.productName, quantity: it.quantity });
                      });
                    }
                  });
                  return Object.values(map).sort((a, b) => a.waiterName.localeCompare(b.waiterName));
                })();

                const totalWaiterVal = contributions.reduce((acc: number, w: any) => acc + (w.total || 0), 0);

                if (contributions.length === 0) return null;

                return (
                  <div className="bg-zinc-900/40 border border-sky-900/30 rounded-xl p-4 space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-zinc-850 pb-2 flex-wrap gap-2">
                      <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-sky-400" />
                        <span>Contribuciones y Atribución de Ventas por Mesero</span>
                      </div>
                      <span className="text-[11px] font-bold text-sky-300 bg-sky-950/60 border border-sky-800/40 px-2.5 py-0.5 rounded">
                        Total Aportado a Caja: Bs {totalWaiterVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {contributions.map((w: any, idx: number) => {
                        const pct = totalWaiterVal > 0 ? ((w.total / totalWaiterVal) * 100).toFixed(1) : '0.0';
                        return (
                          <div key={idx} className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 text-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white font-sans">{w.waiterName}</span>
                              <span className="font-bold text-sky-400 text-xs">
                                Bs {(w.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-zinc-400">
                              <span>Comandas: <strong className="text-zinc-200">{w.count}</strong></span>
                              <span>Aporte: <strong className="text-sky-300">{pct}%</strong></span>
                            </div>
                            {w.items && w.items.length > 0 && (
                              <div className="pt-1 border-t border-zinc-900 text-[8px] text-zinc-500">
                                <span className="block font-bold text-zinc-400 uppercase">Productos:</span>
                                <p className="line-clamp-2 text-zinc-300 font-mono mt-0.5">
                                  {w.items.map((it: any) => `${it.quantity}x ${it.productName}`).join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Table Data list of items inside sheet */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[9px] border-b border-zinc-850">
                      <th className="p-3 pl-4">Producto</th>
                      <th className="p-3 text-center">Stock Inic.</th>
                      <th className="p-3 text-center text-emerald-400">Ingresos</th>
                      <th className="p-3 text-center">Consumo</th>
                      <th className="p-3 text-center">Promos</th>
                      <th className="p-3 text-right">Precio Un.</th>
                      <th className="p-3 text-center">Tot. Consumo</th>
                      <th className="p-3 text-right font-bold text-emerald-400">Total (Bs)</th>
                      <th className="p-3 text-center">Bot. Abiertas</th>
                      <th className="p-3 text-center">Bot. Vacías</th>
                      <th className="p-3 text-center">Cortesía</th>
                      <th className="p-3 text-center">Físico Barra</th>
                      <th className="p-3 text-center pr-4">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {selectedHistorySheet.items
                      ?.filter((item: any) => item.totalConsumo > 0 || item.copasVendidas > 0 || item.copasGanancia > 0 || item.discrepancy !== 0 || item.botellasAbiertas > 0 || (item.entradas && item.entradas > 0))
                      .map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-900/10">
                          <td className="p-3 pl-4 font-semibold text-white">
                            {item.productName}
                            <span className="text-[8px] font-mono text-zinc-500 uppercase ml-2 block sm:inline">[{item.category}]</span>
                            {item.copasVendidas > 0 && (
                              <div className="text-[8px] font-mono text-amber-400 font-normal flex flex-wrap items-center gap-1 mt-0.5">
                                <Wine className="w-2.5 h-2.5 text-amber-400" />
                                <span>{item.copasVendidas} copa{item.copasVendidas > 1 ? 's' : ''} ({item.copasMl || 0}ml)</span>
                                {item.copasGanancia > 0 && (
                                  <span className="text-emerald-400 font-bold">• Bs {item.copasGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-zinc-500">{item.initialStock}</td>
                          <td className="p-3 text-center font-mono text-emerald-500 font-bold">+{item.entradas || 0}</td>
                          <td className="p-3 text-center font-mono text-zinc-300 font-bold">
                            <div>{item.consumoNoche}</div>
                            {item.copasVendidas > 0 && (
                              <div className="text-[8px] font-mono text-amber-400 font-normal flex items-center justify-center gap-0.5 mt-0.5">
                                <Wine className="w-2.5 h-2.5 text-amber-400" />
                                <span>{item.copasVendidas} copa{item.copasVendidas > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-zinc-500">{item.promos}</td>
                          <td className="p-3 text-right font-mono text-zinc-500">Bs {item.unitPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center font-mono font-bold text-zinc-300">{item.totalConsumo}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            <div>Bs {item.totalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                            {item.copasGanancia > 0 && (
                              <div className="text-[8px] font-mono text-amber-300 font-normal mt-0.5">
                                +Bs {item.copasGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Copas)
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-zinc-400">{item.botellasAbiertas || 0}</td>
                          <td className="p-3 text-center font-mono text-amber-400 font-bold">{item.botellasVacias || 0}</td>
                          <td className="p-3 text-center font-mono text-zinc-500">{item.cortesias || 0}</td>
                          <td className="p-3 text-center font-mono text-orange-400 font-bold">{item.fisicoEnBarra}</td>
                          <td className="p-3 text-center pr-4">
                            {item.discrepancy === 0 ? (
                              <span className="text-zinc-600 font-mono">-</span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${item.discrepancy > 0 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                                {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures Panel */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-[10px] font-mono text-zinc-500">
                <div className="space-y-1.5">
                  <div className="border-t border-zinc-850 mx-auto w-48 pt-2 text-zinc-400 font-bold uppercase">{selectedHistorySheet.encargado}</div>
                  <p>Firma Encargado de Barra</p>
                </div>
                <div className="space-y-1.5">
                  <div className="border-t border-zinc-850 mx-auto w-48 pt-2 text-zinc-400 font-bold uppercase">SUPERVISOR DE BARRA</div>
                  <p>Firma Auditor / Gerente</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-zinc-900/30 border-t border-zinc-900 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedHistorySheet(null)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono py-2 px-4 rounded-xl cursor-pointer transition-colors"
              >
                Cerrar Detalle
              </button>

              <button
                onClick={() => handlePrint('print-sheet-area')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold py-2 px-5 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja de Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md p-6 text-center space-y-6 shadow-2xl relative border-t-4 border-t-emerald-500">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-sans font-semibold text-white">¡Planilla Procesada Exitosamente!</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                La planilla de inventario y ganancia diaria se ha consolidado correctamente. Se han actualizado los stocks de los productos consumidos en la base de datos de Firestore y se registraron las entradas correspondientes en la bitácora del Kardex.
              </p>
            </div>

            <div className="bg-zinc-900/60 p-4 border border-zinc-850 rounded-xl space-y-1 text-xs font-mono text-zinc-300">
              <p className="text-[10px] text-zinc-500 uppercase">Cierre Declarado</p>
              <p className="font-bold text-white">Fecha: {fecha}</p>
              <p className="font-bold text-emerald-400 text-sm mt-1">Ganancia: Bs {totals.globalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab('history');
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono py-2.5 rounded-xl cursor-pointer transition-colors uppercase font-bold"
              >
                Ver Historial
              </button>
              <button
                onClick={async () => {
                  setShowSuccessModal(false);
                  // Load saved sheet to inspect it immediately
                  try {
                    const q = query(collection(db, 'dailySheets'), orderBy('createdAt', 'desc'));
                    const querySnapshot = await getDocs(q);
                    const list: any[] = [];
                    querySnapshot.forEach(doc => {
                      if (doc.id === savedSheetId) {
                        setSelectedHistorySheet({ id: doc.id, ...doc.data() });
                      }
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono py-2.5 rounded-xl cursor-pointer transition-all uppercase font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hoja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative border-t-4 border-t-emerald-500 animate-scale-up">
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
              <AlertTriangle className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h3 className="text-base font-sans font-bold text-white uppercase tracking-wider">Confirmar Cierre de Barra</h3>
                <p className="text-[10px] text-zinc-500 font-mono">HOJA DE CONCILIACIÓN FÍSICA & RECAUDACIÓN</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              ¿Está seguro de que desea guardar la Planilla Diaria? Se registrarán las ganancias y se conciliarán los niveles de inventario en el Kardex y catálogo general.
            </p>

            <div className="bg-zinc-900/60 p-4 border border-zinc-850 rounded-xl space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Encargado/Supervisor:</span>
                <span className="font-bold text-white">{encargado}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Caja de Barra:</span>
                <span className="font-bold text-emerald-400">{cajaAsociada}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Fecha del Cierre:</span>
                <span className="font-bold text-white">{fecha}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Establecimiento:</span>
                <span className="font-bold text-white">{establecimiento}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Total Unidades Consumidas:</span>
                <span className="font-bold text-white">{totals.globalConsumo} uds</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850 pb-2">
                <span className="text-zinc-500">Total Cortesías de Barra:</span>
                <span className="font-bold text-white">{totals.globalCortesias} uds</span>
              </div>
              {totals.productsWithDiscrepancies > 0 && (
                <div className="flex justify-between border-b border-zinc-850 pb-2">
                  <span className="text-orange-400">Productos con Discrepancia:</span>
                  <span className="font-bold text-orange-400">{totals.productsWithDiscrepancies} items ({totals.globalDiferenciaCount > 0 ? `+` : ``}{totals.globalDiferenciaCount} uds)</span>
                </div>
              )}
              {/* Payment Breakdown Summary */}
              <div className="pt-2 border-t border-zinc-800 space-y-1">
                <span className="text-amber-400 font-bold block text-[10px] uppercase">Desglose de Pagos Declarados:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px]">💵 Efectivo</span>
                    <span className="text-emerald-400 font-bold">Bs {(Number(paymentBreakdown.efectivo) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px]">📱 Pago QR</span>
                    <span className="text-cyan-400 font-bold">Bs {(Number(paymentBreakdown.qr) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px]">💳 Tarjeta</span>
                    <span className="text-indigo-400 font-bold">Bs {(Number(paymentBreakdown.tarjeta) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[9px]">🏦 Transferencia</span>
                    <span className="text-purple-400 font-bold">Bs {(Number(paymentBreakdown.transferencia) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                <span className="text-emerald-400 font-bold">Ganancia Estimada:</span>
                <span className="font-bold text-emerald-400 text-sm">Bs {totals.globalGanancia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-white font-bold">Total Recaudado Declarado:</span>
                <span className="font-bold text-white text-sm font-mono">Bs {totalDeclaredPayments.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeSaveSheet}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
