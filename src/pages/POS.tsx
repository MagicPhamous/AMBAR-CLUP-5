/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDebounce } from '../hooks/useDebounce';
import { CartItem, Product, PaymentMethod, TableStatus, MovementType, isPhysicalProduct, UserRole } from '../types';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Check, 
  Sparkles, 
  DollarSign, 
  Maximize2, 
  ShoppingBag, 
  X, 
  Printer, 
  Percent, 
  Wine,
  Plus,
  Minus,
  Bell,
  Eye,
  FileText,
  Download,
  Shuffle,
  RotateCcw
} from 'lucide-react';
import PaleteoModal from '../components/PaleteoModal';
import ReturnToWarehouseModal from '../components/ReturnToWarehouseModal';
import { isOpeningControlledProduct } from '../utils/recipeUtils';

interface CocktailRecipe {
  id: string;
  name: string;
  category: string;
  description: string;
  baseCategory: string; // e.g. "Ron", "Whisky", "Vodka", "Gin", "Fernet"
  defaultLiquorName: string;
  defaultDoseMl: number;
  defaultMixerId: string | null; // e.g. "p_coca_cola" for Coca Cola
  defaultMixerName: string;
}

const PRESET_COCKTAILS: CocktailRecipe[] = [
  {
    id: 'chuflay',
    name: 'Singani (Chuflay)',
    category: 'Destilados',
    description: 'Singani 2 oz (60 ml) + 9 oz (270 ml) Ginger Ale en vaso 18 oz.',
    baseCategory: 'Singani',
    defaultLiquorName: 'Singani',
    defaultDoseMl: 60,
    defaultMixerId: 'p_sante',
    defaultMixerName: 'Ginger Ale / Mezclador'
  },
  {
    id: 'ron_coca',
    name: 'Ron + Coca Cola',
    category: 'Destilados',
    description: 'Ron Havana / 37 Lenguas 2 oz (60 ml) + 9 oz (270 ml) Coca-Cola en vaso 18 oz.',
    baseCategory: 'Ron',
    defaultLiquorName: 'Ron',
    defaultDoseMl: 60,
    defaultMixerId: 'p_coca_cola',
    defaultMixerName: 'Coca Cola'
  },
  {
    id: 'fernet_coca',
    name: 'Fernet + Coca Cola',
    category: 'Destilados',
    description: 'Fernet Branca 2 oz (60 ml) + 9 oz (270 ml) Coca-Cola en vaso 18 oz.',
    baseCategory: 'Licor',
    defaultLiquorName: 'Fernet',
    defaultDoseMl: 60,
    defaultMixerId: 'p_coca_cola',
    defaultMixerName: 'Coca Cola'
  },
  {
    id: 'gin_tonica',
    name: 'Gin + Agua Tónica',
    category: 'Destilados',
    description: 'Gin Beefeater / Insurgente 2 oz (60 ml) + 9 oz (270 ml) Agua Tónica en vaso 18 oz.',
    baseCategory: 'Gin',
    defaultLiquorName: 'Gin',
    defaultDoseMl: 60,
    defaultMixerId: 'p_sante',
    defaultMixerName: 'Agua Tónica'
  },
  {
    id: 'vodka_sprite',
    name: 'Vodka + Sprite',
    category: 'Destilados',
    description: 'Vodka 1825 2 oz (60 ml) + 9 oz (270 ml) Sprite en vaso 18 oz.',
    baseCategory: 'Vodka',
    defaultLiquorName: 'Vodka',
    defaultDoseMl: 60,
    defaultMixerId: 'p_sprite',
    defaultMixerName: 'Sprite'
  },
  {
    id: 'whisky_mezclado',
    name: 'Whisky c/ Agua o Coca Cola',
    category: 'Whisky',
    description: "Whisky Jack Daniel's / Chivas 2 oz (60 ml) + 2 oz mezclador en vaso 10 oz.",
    baseCategory: 'Whisky',
    defaultLiquorName: 'Whisky',
    defaultDoseMl: 60,
    defaultMixerId: 'p_coca_cola',
    defaultMixerName: 'Coca Cola'
  },
  {
    id: 'whisky_rocks',
    name: 'Whisky On the Rocks',
    category: 'Whisky',
    description: 'Whisky Premium 2 oz (60 ml) servido puro sobre hielo en vaso 10 oz.',
    baseCategory: 'Whisky',
    defaultLiquorName: 'Whisky',
    defaultDoseMl: 60,
    defaultMixerId: null,
    defaultMixerName: 'Sin Mezclador'
  },
  {
    id: 'pina_colada',
    name: 'Piña Colada',
    category: 'Cócteles de Autor',
    description: 'Ron Blanco 2 oz (60 ml) + Licor Coco 1 oz (30 ml) + Leche (90 ml) + Almíbar en copa Huracán 15 oz.',
    baseCategory: 'Ron',
    defaultLiquorName: 'Ron',
    defaultDoseMl: 60,
    defaultMixerId: null,
    defaultMixerName: 'Leche + Licor Coco + Almíbar'
  },
  {
    id: 'mojito',
    name: 'Mojito Clásico',
    category: 'Cócteles de Autor',
    description: 'Ron Blanco 2 oz (60 ml) + Almíbar + Jugo Limón 1 oz + Sprite 2.5 oz en vaso 18 oz.',
    baseCategory: 'Ron',
    defaultLiquorName: 'Ron',
    defaultDoseMl: 60,
    defaultMixerId: 'p_sprite',
    defaultMixerName: 'Sprite'
  },
  {
    id: 'tequila_sunrise',
    name: 'Tequila Sunrise',
    category: 'Cócteles de Autor',
    description: 'Tequila Blanco/Dorado 2 oz (60 ml) + Jugo Naranja 6 oz + Granadina 0.5 oz en vaso 18 oz.',
    baseCategory: 'Tequila',
    defaultLiquorName: 'Tequila',
    defaultDoseMl: 60,
    defaultMixerId: null,
    defaultMixerName: 'Jugo Naranja + Granadina'
  },
  {
    id: 'daiquiri_frutilla',
    name: 'Daiquiri Frutilla Frozen',
    category: 'Cócteles de Autor',
    description: 'Ron Blanco 2 oz (60 ml) + Jugo Limón 0.75 oz + Almíbar 1 oz + Frutillas en copa Martini.',
    baseCategory: 'Ron',
    defaultLiquorName: 'Ron',
    defaultDoseMl: 60,
    defaultMixerId: null,
    defaultMixerName: 'Frutillas + Almíbar'
  },
  {
    id: 'ambar_royale',
    name: 'Ámbar Royale',
    category: 'Cócteles de Autor',
    description: 'Singani Casa Real 2 oz (60 ml) + Miel 0.75 oz + Limón 0.75 oz + Sprite 2 oz en copa Flauta.',
    baseCategory: 'Singani',
    defaultLiquorName: 'Singani',
    defaultDoseMl: 60,
    defaultMixerId: 'p_sprite',
    defaultMixerName: 'Sprite'
  },
  {
    id: 'illimani_ambar',
    name: 'Illimani Ámbar',
    category: 'Cócteles de Autor',
    description: 'Gin Insurgente Frutos Bosque 2.5 oz (75 ml) + Limón + Almíbar + Licor Coco en copa Coupe.',
    baseCategory: 'Gin',
    defaultLiquorName: 'Gin',
    defaultDoseMl: 75,
    defaultMixerId: null,
    defaultMixerName: 'Mezcla Illimani'
  },
  {
    id: 'shot_estandar',
    name: 'Shot Estándar (1 oz / 30 ml)',
    category: 'Shots',
    description: 'Shot individual de 1 oz (30 ml) de Tequila, Jäger o Singani.',
    baseCategory: 'Tequila',
    defaultLiquorName: 'Tequila',
    defaultDoseMl: 30,
    defaultMixerId: null,
    defaultMixerName: 'Sin Mezclador'
  },
  {
    id: 'shot_doble',
    name: 'Shot Doble (1.5 oz / 45 ml)',
    category: 'Shots',
    description: 'Shot doble de 1.5 oz (45 ml) de Tequila, Jäger o Licor.',
    baseCategory: 'Tequila',
    defaultLiquorName: 'Tequila',
    defaultDoseMl: 45,
    defaultMixerId: null,
    defaultMixerName: 'Sin Mezclador'
  },
  {
    id: 'jagerbomb',
    name: 'JägerBomb',
    category: 'Shots',
    description: 'Jägermeister 1.5 oz (45 ml) servido en shot de vidrio arrojado a vaso con lata de Red Bull.',
    baseCategory: 'Licor',
    defaultLiquorName: 'Jagermeister',
    defaultDoseMl: 45,
    defaultMixerId: 'p_red_bull',
    defaultMixerName: 'Red Bull'
  }
];

export default function POS() {
  const { 
    products, 
    categories, 
    activeSession, 
    selectedCaja,
    processPOSSale, 
    openBottles,
    discardOpenBottle,
    config, 
    employees, 
    tables, 
    addConsumptionToTable,
    waiterReports,
    resolveWaiterReport,
    adjustStock,
    verifyReservationPayment,
    updateTableStatus,
    cancelTableReservation,
    updateReservationStatus
  } = useApp();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Cashier Reservations Modal state
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [resFilterDate, setResFilterDate] = useState('');

  // Search query & filter for Bartender open bottles
  const [bottleSearchQuery, setBottleSearchQuery] = useState('');
  const [showOnlyOpenBottles, setShowOnlyOpenBottles] = useState(false);

  // Confirmation Modals State for Bottle Operations in POS
  const [confirmDiscardModalPOS, setConfirmDiscardModalPOS] = useState<{ id: string; name: string } | null>(null);
  const [confirmOpenModalPOS, setConfirmOpenModalPOS] = useState<{ id: string; name: string; capacity: number } | null>(null);
  const [posBottleFeedback, setPosBottleFeedback] = useState<string | null>(null);
  const [isProcessingPosBottle, setIsProcessingPosBottle] = useState(false);

  // Helper to resolve open bottle count safely
  const getOpenCountInPOS = useCallback((p: Product, cajaName: string) => {
    const countNum = p.cajaOpenBottlesCount?.[cajaName];
    if (typeof countNum === 'number' && countNum > 0) {
      return countNum;
    }
    if (typeof p.openBottles === 'object' && p.openBottles !== null && p.openBottles[cajaName]) {
      return 1;
    }
    if (typeof p.openBottles === 'boolean' && p.openBottles) {
      return 1;
    }
    if (p.cajaMl && typeof p.cajaMl[cajaName] === 'number' && p.cajaMl[cajaName] > 0) {
      return 1;
    }
    return typeof countNum === 'number' ? Math.max(0, countNum) : 0;
  }, []);

  const totalOpenBottlesInBar = useMemo(() => {
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
    return products.reduce((acc, p) => {
      if (p.isActive && (p.bottleConfig?.isBottle || isOpeningControlledProduct(p) || isPhysicalProduct(p))) {
        const count = getOpenCountInPOS(p, currentCajaName);
        return acc + count;
      }
      return acc;
    }, 0);
  }, [products, activeSession, selectedCaja, getOpenCountInPOS]);

  const filteredAndSortedBottles = useMemo(() => {
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
    
    let list = products.filter(p => 
      p.isActive && (p.bottleConfig?.isBottle || isOpeningControlledProduct(p) || isPhysicalProduct(p))
    );

    if (showOnlyOpenBottles) {
      list = list.filter(p => {
        const openCount = getOpenCountInPOS(p, currentCajaName);
        return openCount > 0;
      });
    }

    if (bottleSearchQuery.trim()) {
      const q = bottleSearchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const stockA = a.cajaStock?.[currentCajaName] ?? 0;
      const stockB = b.cajaStock?.[currentCajaName] ?? 0;
      const openA = a.cajaOpenBottlesCount?.[currentCajaName] ?? (a.openBottles?.[currentCajaName] ? 1 : 0);
      const openB = b.cajaOpenBottlesCount?.[currentCajaName] ?? (b.openBottles?.[currentCajaName] ? 1 : 0);

      // 1. Stock > 0 comes first (al comienzo)
      const hasStockA = stockA > 0 ? 1 : 0;
      const hasStockB = stockB > 0 ? 1 : 0;
      if (hasStockA !== hasStockB) {
        return hasStockB - hasStockA;
      }

      // 2. Higher stock quantity first
      if (stockA !== stockB) {
        return stockB - stockA;
      }

      // 3. Open bottles count first
      if (openA !== openB) {
        return openB - openA;
      }

      return a.name.localeCompare(b.name);
    });
  }, [products, activeSession, selectedCaja, bottleSearchQuery, showOnlyOpenBottles]);
  
  // Checkout & loyalty states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [saleDescription, setSaleDescription] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [associatedTableId, setAssociatedTableId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [shouldPrintTicket, setShouldPrintTicket] = useState(false);
  
  // Waiter disco sale notification states
  const [showWaiterReportsModal, setShowWaiterReportsModal] = useState(false);
  const [viewingReportReceipt, setViewingReportReceipt] = useState<string | null>(null);
  const [isResolvingReportId, setIsResolvingReportId] = useState<string | null>(null);

  // Get pending reports addressed to this Cash Register
  const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
  const pendingReports = useMemo(() => 
    waiterReports ? waiterReports.filter(r => r.status === 'pendiente' && r.targetCaja === currentCaja) : [],
    [waiterReports, currentCaja]
  );

  // Auto-default selectedWaiterId to the corresponding Caja employee (e.g., "Caja 1")
  useEffect(() => {
    if (!selectedWaiterId && employees && employees.length > 0) {
      const targetCajaClean = currentCaja.toLowerCase().trim();
      const matchingCajaEmp = employees.find(
        e => e.isActive && (
          e.name.toLowerCase().trim() === targetCajaClean ||
          e.id === `e_${targetCajaClean.replace(/\s+/g, '')}`
        )
      ) || employees.find(
        e => e.isActive && (e.name.toLowerCase().includes('caja 1') || e.id === 'e_caja1')
      ) || employees.find(
        e => e.isActive && (e.role === UserRole.CAJA || e.name.toLowerCase().includes('caja'))
      );

      if (matchingCajaEmp) {
        setSelectedWaiterId(matchingCajaEmp.id);
      }
    }
  }, [currentCaja, employees, selectedWaiterId]);
  
  // Receipt popup & USB barcode scanning simulator
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  const [barcodeInputVal, setBarcodeInputVal] = useState('');

  // Paleteo & Return Stock Modal States
  const [isPaleteoModalOpen, setIsPaleteoModalOpen] = useState(false);
  const [paleteoTargetProductId, setPaleteoTargetProductId] = useState<string | undefined>(undefined);
  const [isReturnToWarehouseOpen, setIsReturnToWarehouseOpen] = useState(false);
  
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // USB Scanner Logic: Hardware scanners trigger keyboard events rapidly and terminate with an 'Enter' key.
  // We can attach a window keydown listener or have a dedicated focus input. Let's do a designated input box.
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = barcodeInputVal.trim();
    if (!cleanCode) return;

    const prodMatch = products.find(p => p.isActive && (p.barCode === cleanCode || (p.internalCode || '').toLowerCase() === cleanCode.toLowerCase()));
    if (prodMatch) {
      const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
      const localStock = prodMatch.cajaStock?.[currentCaja] ?? 0;
      if (localStock <= 0) {
        alert(`¡Alerta! El producto ${prodMatch.name} se encuentra temporalmente sin stock en ${currentCaja}.`);
      } else {
        addToCart(prodMatch);
      }
    } else {
      alert(`Código de barras "${cleanCode}" no coincide con ningún producto registrado.`);
    }
    setBarcodeInputVal('');
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('thermal-receipt-print-area');
    if (!printContent) return;

    // Create style block specifically to hide default headers/footers and apply gorgeous print overrides
    const style = document.createElement('style');
    style.id = 'print-style-override-pos';
    style.innerHTML = `
      @media print {
        @page {
          margin: 0;
          size: 80mm auto;
        }
        body {
          background: white !important;
          color: black !important;
          margin: 0.4cm !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Hide everything by default except the custom print container */
        body > *:not(#print-mount-point-pos) {
          display: none !important;
        }
        
        #print-mount-point-pos {
          display: block !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          font-family: 'JetBrains Mono', ui-monospace, Courier, monospace !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
        }

        #print-mount-point-pos * {
          color: #000000 !important;
          border-color: #000000 !important;
        }

        #print-mount-point-pos button,
        #print-mount-point-pos .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Create temporary container for printed element
    const tempContainer = document.createElement('div');
    tempContainer.id = 'print-mount-point-pos';
    tempContainer.style.display = 'none';
    tempContainer.innerHTML = printContent.innerHTML;
    document.body.appendChild(tempContainer);

    window.print();

    // Clean up
    document.head.removeChild(style);
    document.body.removeChild(tempContainer);
  };

  const addToCart = (product: Product, shotMl?: number) => {
    if (!activeSession) {
      alert('Debe realizar la Apertura de Caja para registrar ventas. Diríjase al menú "Caja".');
      return;
    }

    let calculatedPrice = product.price;

    if (shotMl && product.bottleConfig?.isBottle) {
      const propPrice = product.price * (shotMl / product.bottleConfig.capacityMl);
      calculatedPrice = Number((propPrice * 1.5).toFixed(2));
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.selectedShotMl === shotMl
      );

      const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';

      if (existingIdx > -1) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          subtotal: Number((calculatedPrice * newQty).toFixed(2))
        };
        return copy;
      } else {
        return [...prev, {
          product,
          quantity: 1,
          selectedShotMl: shotMl,
          subtotal: calculatedPrice
        }];
      }
    });
  };

  const addCocktailToCart = (
    cocktailName: string,
    price: number,
    liquor: Product,
    doseMl: number,
    mixer: Product | null,
    cost: number
  ) => {
    if (!activeSession) {
      alert('Debe realizar la Apertura de Caja para registrar ventas. Diríjase al menú "Caja".');
      return;
    }

    const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';

    const virtualProduct: Product = {
      id: `virtual-cocktail-${Date.now()}`,
      name: `${cocktailName}`,
      category: 'Cócteles',
      price: price,
      cost: cost,
      quantity: 1,
      isActive: true,
      internalCode: 'COCKTAIL',
      barCode: '',
      brand: '',
      supplierId: '',
      description: 'Cóctel preparado en POS',
      unit: 'Trago',
      minStock: 0,
      maxStock: 9999,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cajaStock: { [currentCaja]: 9999 },
      cajaMl: { [currentCaja]: 0 }
    };

    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.isCocktail && 
        item.product.name === virtualProduct.name &&
        item.cocktailLiquorId === liquor.id &&
        item.cocktailMixerId === (mixer ? mixer.id : null)
      );

      if (existingIdx > -1) {
        const copy = [...prev];
        const newQty = copy[existingIdx].quantity + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: newQty,
          subtotal: Number((price * newQty).toFixed(2))
        };
        return copy;
      } else {
        return [...prev, {
          product: virtualProduct,
          quantity: 1,
          subtotal: price,
          isCocktail: true,
          cocktailLiquorId: liquor.id,
          cocktailLiquorName: liquor.name,
          cocktailDoseMl: doseMl,
          cocktailMixerId: mixer ? mixer.id : null,
          cocktailMixerName: mixer ? mixer.name : 'Sin Mezclador'
        }];
      }
    });
  };

  const handleOpenBottleForBartender = (productId: string) => {
    if (!activeSession) {
      alert('Debe abrir la Caja para poder registrar la apertura de botellas para el bartender.');
      return;
    }
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const currentStock = prod.cajaStock?.[currentCajaName] ?? 0;
    if (currentStock <= 0) {
      alert(`No quedan botellas de "${prod.name}" en stock de "${currentCajaName}".`);
      return;
    }

    setConfirmOpenModalPOS({
      id: prod.id,
      name: prod.name,
      capacity: prod.bottleConfig?.capacityMl || 750
    });
  };

  const handleDiscardOpenBottleForBartender = (productId: string) => {
    if (!activeSession) {
      alert('Debe abrir la Caja para realizar esta operación.');
      return;
    }
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setConfirmDiscardModalPOS({
      id: prod.id,
      name: prod.name
    });
  };

  const executeDiscardPOS = async () => {
    if (!confirmDiscardModalPOS) return;
    const { id, name } = confirmDiscardModalPOS;
    setConfirmDiscardModalPOS(null);
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';

    try {
      setIsProcessingPosBottle(true);
      await discardOpenBottle(id, currentCajaName);
      setPosBottleFeedback(`¡Botella de "${name}" declarada VACÍA y desechada con éxito! Registro guardado para ${currentCajaName}.`);
      setTimeout(() => setPosBottleFeedback(null), 6000);
    } catch (err: any) {
      alert(`Error al desechar botella: ${err.message || err}`);
    } finally {
      setIsProcessingPosBottle(false);
    }
  };

  const executeOpenPOS = async () => {
    if (!confirmOpenModalPOS) return;
    const { id, name } = confirmOpenModalPOS;
    setConfirmOpenModalPOS(null);
    const currentCajaName = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';

    try {
      setIsProcessingPosBottle(true);
      await openBottles([id], currentCajaName);
      setPosBottleFeedback(`¡Botella de "${name}" abierta exitosamente en ${currentCajaName}!`);
      setTimeout(() => setPosBottleFeedback(null), 5000);
    } catch (err: any) {
      alert(`Error al abrir botella: ${err.message || err}`);
    } finally {
      setIsProcessingPosBottle(false);
    }
  };

  const updateCartItemUnitPrice = (
    productId: string, 
    shotMl: number | undefined, 
    isCocktail: boolean | undefined, 
    newPrice: number
  ) => {
    setCart(prev => {
      const idx = prev.findIndex(it => 
        it.product.id === productId && 
        it.selectedShotMl === shotMl &&
        Boolean(it.isCocktail) === Boolean(isCocktail)
      );
      if (idx === -1) return prev;

      const copy = [...prev];
      const item = copy[idx];
      const validPrice = isNaN(newPrice) || newPrice < 0 ? 0 : newPrice;
      const newSubtotal = Number((validPrice * item.quantity).toFixed(2));

      copy[idx] = {
        ...item,
        customUnitPrice: validPrice,
        subtotal: newSubtotal
      };
      return copy;
    });
  };

  const adjustCartQty = (productId: string, shotMl: number | undefined, delta: number) => {
    setCart(prev => {
      const idx = prev.findIndex(it => it.product.id === productId && it.selectedShotMl === shotMl);
      if (idx === -1) return prev;

      const copy = [...prev];
      const item = copy[idx];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        copy.splice(idx, 1);
      } else {
        const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
        if (item.isCocktail) {
          const dose = item.cocktailDoseMl || 50;
          const totalLiquorMlNeeded = dose * newQty;
          
          const liquorProd = products.find(p => p.id === item.cocktailLiquorId);
          if (liquorProd) {
            const liquorMl = liquorProd.cajaMl?.[currentCaja] ?? liquorProd.bottleConfig?.capacityMl ?? 750;
            const liquorStock = liquorProd.cajaStock?.[currentCaja] ?? 0;
            const availableMl = liquorMl + (liquorStock * (liquorProd.bottleConfig?.capacityMl ?? 750));
            if (delta > 0 && availableMl < totalLiquorMlNeeded) {
              alert(`Insumo de licor insuficiente en ${currentCaja} para preparar ${newQty} de este cóctel.`);
              return prev;
            }
          }

          if (item.cocktailMixerId) {
            const mixerProd = products.find(p => p.id === item.cocktailMixerId);
            if (mixerProd) {
              const mixerStock = mixerProd.cajaStock?.[currentCaja] ?? 0;
              if (delta > 0 && mixerStock < newQty) {
                alert(`Insumo de mezclador insuficiente en ${currentCaja} para preparar ${newQty} de este cóctel.`);
                return prev;
              }
            }
          }
        } else {
          const localStock = item.product.cajaStock?.[currentCaja] ?? 0;
          if (delta > 0 && newQty > localStock) {
            alert(`Insumo insuficiente en ${currentCaja}. Máximo disponible: ${localStock}`);
            return prev;
          }
        }
        const singlePrice = item.customUnitPrice !== undefined ? item.customUnitPrice : (item.subtotal / item.quantity);
        copy[idx] = {
          ...item,
          quantity: newQty,
          subtotal: Number((singlePrice * newQty).toFixed(2))
        };
      }
      return copy;
    });
  };

  const removeFromCart = (productId: string, shotMl?: number) => {
    setCart(prev => prev.filter(it => !(it.product.id === productId && it.selectedShotMl === shotMl)));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const cartSubtotal = useMemo(() => cart.reduce((acc, it) => acc + it.subtotal, 0), [cart]);
  const discountVal = useMemo(() => Number((cartSubtotal * (discountPercent / 100)).toFixed(2)), [cartSubtotal, discountPercent]);
  const cartTotal = useMemo(() => Math.max(0, cartSubtotal - discountVal), [cartSubtotal, discountVal]);
  const calculatedChange = useMemo(() => 
    amountPaid && amountPaid >= cartTotal ? Number((amountPaid - cartTotal).toFixed(2)) : 0,
    [amountPaid, cartTotal]
  );

  const executeFinalPOSSale = () => {
    const payVal = amountPaid === '' ? cartTotal : Number(amountPaid);
    const completedSale = processPOSSale(
      cart,
      selectedPaymentMethod,
      payVal,
      discountVal,
      associatedTableId || undefined,
      undefined,
      selectedWaiterId || undefined,
      discountPercent > 0 ? discountReason.trim() : undefined,
      saleDescription.trim() || undefined
    );

    setLastCompletedSale(completedSale);
    if (shouldPrintTicket) {
      setShowReceipt(true);
    } else {
      alert(`¡Venta realizada con éxito! (${cart.length} productos procesados)`);
    }
    
    // Reset Cart
    setCart([]);
    setDiscountPercent(0);
    setDiscountReason('');
    setSaleDescription('');
    setAmountPaid('');
    setAssociatedTableId('');
    setSelectedWaiterId('');
  };

  // Checkout submission
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('El carrito se encuentra vacío.');
      return;
    }

    if (!activeSession) {
      alert('Operación no autorizada. Debe registrar una sesión de caja abierta primero.');
      return;
    }

    const payVal = amountPaid === '' ? cartTotal : Number(amountPaid);
    if (payVal < cartTotal) {
      alert(`Monto insuficiente para completar la venta. Falta: ${cartTotal - payVal} ${config.currency}`);
      return;
    }

    if (discountPercent > 0 && discountReason.trim() === '') {
      alert('Por favor ingrese el detalle o motivo del descuento.');
      return;
    }

    // Process sale directly
    executeFinalPOSSale();
  };

  // Filters catalog
  const filteredCatalog = useMemo(() => {
    const term = debouncedSearchQuery.toLowerCase().trim();
    const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';

    const filtered = products.filter(p => {
      const matchesSearch = !term ||
                            (p.name || '').toLowerCase().includes(term) || 
                            (p.internalCode || '').toLowerCase().includes(term) ||
                            (p.barCode || '').includes(term);
      const matchesCategory = activeCategory === 'Todas' || p.category === activeCategory;
      return p.isActive && matchesSearch && matchesCategory;
    });

    // Prioritize products with stock in current caja (or non-physical items like vasos/cocteles that are available by default in all cajas)
    return filtered.sort((a, b) => {
      const isPhysA = isPhysicalProduct(a);
      const isPhysB = isPhysicalProduct(b);
      const stockA = isPhysA ? (a.cajaStock?.[currentCaja] ?? 0) : 999;
      const stockB = isPhysB ? (b.cajaStock?.[currentCaja] ?? 0) : 999;
      const hasStockA = stockA > 0 ? 1 : 0;
      const hasStockB = stockB > 0 ? 1 : 0;

      if (hasStockA !== hasStockB) {
        return hasStockB - hasStockA; // Items with stock (>0) first
      }
      if (stockB !== stockA) {
        return stockB - stockA; // Higher stock first
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearchQuery, activeCategory, activeSession?.cajaAsociada, selectedCaja]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-130px)] min-h-[600px]" id="pos-interface">
      {/* LEFT COLUMN: Catalog and menu (Col span 7) */}
      <div className="xl:col-span-7 flex flex-col justify-between" id="pos-catalog-column">
        {/* Search bar & Barcode Quick Field */}
        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-3">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-800/80 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none"
                placeholder="Buscar bebida por nombre, código o marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Hardware Barcode USB input simulation form */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 items-center max-w-[200px]" id="form-usb-scanner">
              <Barcode className="w-4 h-4 text-red-500 shrink-0" />
              <input
                ref={scannerInputRef}
                type="text"
                className="bg-transparent text-xs text-white focus:outline-none w-full font-mono placeholder-zinc-600"
                placeholder="Escáner USB..."
                value={barcodeInputVal}
                onChange={(e) => setBarcodeInputVal(e.target.value)}
              />
              <button type="submit" className="hidden" />
            </form>
          </div>

          {/* Quick categories horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-900">
            <button
              onClick={() => setActiveCategory('Todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider whitespace-nowrap transition-colors uppercase cursor-pointer ${activeCategory === 'Todas' ? 'bg-red-900/40 text-red-400 border border-red-800/40' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveCategory('COCKTAILS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider whitespace-nowrap transition-colors uppercase cursor-pointer ${activeCategory === 'COCKTAILS' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/40' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'}`}
            >
              🍹 Cócteles y Descorches
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider whitespace-nowrap transition-colors uppercase cursor-pointer ${activeCategory === c.name ? 'bg-red-900/40 text-red-400 border border-red-800/40' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active box stock notification banner */}
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 p-2.5 px-4 rounded-xl mt-3 text-xs" id="pos-active-caja-banner">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-mono text-[11px] uppercase tracking-wider">Punto de Venta Abierto en:</span>
            <span className="bg-red-950/30 text-red-400 border border-red-900/30 px-2.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase tracking-wider">
              {activeSession?.cajaAsociada || selectedCaja || 'Caja 1'} {!activeSession ? '(SIN APERTURA)' : ''}
            </span>
          </div>

          <div className="flex gap-2">
            {/* Cashier Reservations Button */}
            <button
              onClick={() => setShowReservationsModal(true)}
              className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                tables.filter(t => t.status === TableStatus.RESERVED && !t.reservationPaymentVerified).length > 0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 font-black shadow-md shadow-amber-950/30'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-amber-400 border-zinc-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>RESERVAS & PAGOS ({tables.filter(t => t.status === TableStatus.RESERVED).length})</span>
              {tables.filter(t => t.status === TableStatus.RESERVED && !t.reservationPaymentVerified).length > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1 rounded font-bold animate-pulse">
                  {tables.filter(t => t.status === TableStatus.RESERVED && !t.reservationPaymentVerified).length} PEND
                </span>
              )}
            </button>

            {/* Waiter Notifications button */}
            <button
              onClick={() => {
                if (!activeSession) {
                  alert('Debe abrir la Caja para poder procesar solicitudes de meseros.');
                  return;
                }
                setShowWaiterReportsModal(true);
              }}
              className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                pendingReports.length > 0 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 animate-pulse shadow-md shadow-amber-950/30 font-black' 
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border-zinc-800'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${pendingReports.length > 0 ? 'animate-bounce text-white' : ''}`} />
              <span>NOTIFICACIONES MESEROS ({pendingReports.length})</span>
            </button>

            {/* Paleteo de Cajas button */}
            <button
              onClick={() => {
                setPaleteoTargetProductId(undefined);
                setIsPaleteoModalOpen(true);
              }}
              className="px-3 py-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="Traspaso e intercambio de stock directo entre Cajas"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>PALETEO DE CAJAS</span>
            </button>

            {/* Retorno de Productos al Almacén button */}
            <button
              onClick={() => setIsReturnToWarehouseOpen(true)}
              className="px-3 py-1 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title="Devolver todo el stock remanente en caja al Almacén Central (Cierre de Día)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>RETORNO A ALMACÉN</span>
            </button>
          </div>
        </div>

        {/* Catalog items grid or Cocktails Workspace */}
        {activeCategory === 'COCKTAILS' ? (
          <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 max-h-[calc(100vh-320px)]" id="cocktails-workspace">
            <div className="bg-zinc-950 border border-amber-900/40 rounded-xl p-5 space-y-4 shadow-xl">
              {/* Panel Header, Counter & Buscador */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-3">
                  <Wine className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Registro de Botellas Abiertas para Bartender
                      </h3>
                      <span className="text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 rounded-full shadow-sm">
                        🟢 {totalOpenBottlesInBar} Abierta{totalOpenBottlesInBar === 1 ? '' : 's'} en Barra
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Caja Activa: <span className="font-bold text-white font-mono">{currentCaja}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Filter tabs */}
                  <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setShowOnlyOpenBottles(false)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        !showOnlyOpenBottles 
                          ? 'bg-amber-500 text-black font-bold shadow' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOnlyOpenBottles(true)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        showOnlyOpenBottles 
                          ? 'bg-emerald-500 text-black font-bold shadow' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>🟢 Solo Abiertas</span>
                      <span className="text-[10px] bg-zinc-950/40 px-1.5 py-0.2 rounded-full font-bold">
                        {totalOpenBottlesInBar}
                      </span>
                    </button>
                  </div>

                  {/* Buscador de Botellas */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bottleSearchQuery}
                      onChange={(e) => setBottleSearchQuery(e.target.value)}
                      placeholder="Buscar botella..."
                      className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl pl-9 pr-8 py-1.5 text-xs font-sans focus:outline-none focus:border-amber-500 transition-all"
                    />
                    {bottleSearchQuery && (
                      <button
                        onClick={() => setBottleSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Informativo */}
              <div className="text-xs font-mono text-zinc-300 bg-amber-950/20 p-3 rounded-xl border border-amber-900/30 flex items-start gap-2">
                <span className="text-amber-400 font-bold text-sm">📝</span>
                <div>
                  <span className="text-amber-300 font-bold">Registro de Apertura:</span> Cuando el bartender necesite abrir una botella para la preparación de tragos (ej. Coca Cola, Licores, etc.), busque el producto y presione <span className="text-amber-400 font-bold">+ Abrir Botella para Bartender</span>. Se descontará 1 unidad de stock de {currentCaja} y quedará registrada como botella abierta.
                </div>
              </div>

              {/* Toast Feedback for POS Bottle Operations */}
              {posBottleFeedback && (
                <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs font-mono animate-fade-in shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span className="font-semibold">{posBottleFeedback}</span>
                  </div>
                  <button
                    onClick={() => setPosBottleFeedback(null)}
                    className="text-emerald-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Tarjetas de Botellas (Ordenadas con stock al comienzo) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-480px)] pr-1 scrollbar-thin scrollbar-thumb-zinc-900">
                {filteredAndSortedBottles.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-zinc-500 font-mono text-xs">
                    {bottleSearchQuery 
                      ? `No se encontraron botellas que coincidan con "${bottleSearchQuery}".`
                      : 'No hay botellas registradas en el catálogo.'}
                  </div>
                ) : (
                  filteredAndSortedBottles.map((p, idx) => {
                    const stock = p.cajaStock?.[currentCaja] ?? 0;
                    const openCount = getOpenCountInPOS(p, currentCaja);
                    const finishedCount = p.cajaFinishedBottlesCount?.[currentCaja] ?? 0;
                    const hasStock = stock > 0;

                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        className={`border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                          hasStock || openCount > 0
                            ? 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/50'
                            : 'bg-zinc-950/40 border-zinc-900/60 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-sans font-bold text-white text-sm">{p.name}</h4>
                              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
                                {p.category || 'Botella'}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                                hasStock
                                  ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                                  : 'bg-red-950/30 text-red-400 border-red-900/40'
                              }`}
                            >
                              Stock: {stock} bot.
                            </span>
                          </div>

                          <div className="mt-2.5 text-[11px] font-mono space-y-1 bg-zinc-950/60 p-2 rounded-lg border border-zinc-900">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">🟢 En uso (Bartender):</span>
                              <span className={openCount > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                                {openCount > 0 ? `${openCount} abierta${openCount > 1 ? 's' : ''}` : '0 abiertas'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-900/80">
                              <span className="text-zinc-400">🏁 Vacías/Desechadas:</span>
                              <span className={finishedCount > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                                {finishedCount} bot.
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-900/80 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleOpenBottleForBartender(p.id)}
                            disabled={!hasStock}
                            className="w-full text-xs bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold py-2 px-3 rounded-lg transition-all disabled:opacity-20 disabled:hover:bg-amber-500 cursor-pointer flex justify-center items-center gap-1.5 shadow uppercase tracking-wider"
                            title="Descontar 1 botella de caja y anotar apertura para el bartender"
                          >
                            <Wine className="w-4 h-4 text-black" />
                            <span>+ Abrir Botella</span>
                          </button>

                          {openCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDiscardOpenBottleForBartender(p.id)}
                              className="w-full text-[11px] bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 font-mono font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1.5 shadow"
                              title="Declarar que 1 botella abierta se vació y se procede a desechar"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                              <span>Declarar Vacía (Desechar)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-4 pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-320px)]">
            {filteredCatalog.map((p, idx) => {
              const currentCaja = activeSession?.cajaAsociada || selectedCaja || 'Caja 1';
              const isPhys = isPhysicalProduct(p);
              const localStock = isPhys ? (p.cajaStock?.[currentCaja] ?? 0) : 999;
              const isOutOfStock = isPhys && localStock <= 0;
              return (
                <div 
                  key={`${p.id}-${idx}`} 
                  className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col justify-between hover:border-red-950 transition-colors shadow"
                >
                  <div>
                    <div className="relative h-24 bg-zinc-900 rounded-lg overflow-hidden mb-2">
                      {p.imageUrl && !p.imageUrl.includes('photo-1514362545857') ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-60"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-zinc-600">
                          <Wine className="w-8 h-8 opacity-40 mb-1" />
                          <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">{p.category}</span>
                        </div>
                      )}
                      {p.bottleConfig?.isBottle && (
                        <span className="absolute bottom-1.5 left-1.5 bg-red-600 text-[8px] px-1 rounded font-bold font-sans flex items-center gap-0.5 shadow text-white">
                          <Wine className="w-2.5 h-2.5" />
                          <span>BOTELLA CONTROLADA</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-sans font-medium text-white text-xs line-clamp-2">{p.name}</h4>
                    <div className="flex justify-between mt-1 text-[10px] font-mono">
                      <span className="text-zinc-500">Cód: {p.internalCode}</span>
                      <span className={isOutOfStock ? 'text-red-500 font-bold' : (isPhys ? 'text-zinc-400' : 'text-emerald-400 font-semibold')}>
                        {isOutOfStock ? 'SIN STOCK' : (isPhys ? `Caja: ${localStock}` : 'Disponible')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-zinc-900 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-red-400 font-bold font-mono">{p.price} {config.currency}</span>
                    </div>

                    {isOutOfStock ? (
                      <button
                        onClick={() => {
                          setPaleteoTargetProductId(p.id);
                          setIsPaleteoModalOpen(true);
                        }}
                        className="w-full bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 py-1.5 text-[9px] font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow"
                        title={`Solicitar o paletear esta bebida hacia ${currentCaja}`}
                      >
                        <Shuffle className="w-3 h-3 text-amber-400" />
                        <span>PALETEAR A {currentCaja.toUpperCase()}</span>
                      </button>
                    ) : p.bottleConfig?.isBottle ? (
                      /* Smart bottle option trigger: Full or Shot */
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => addToCart(p)}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-1 text-[9px] font-mono rounded transition-colors cursor-pointer"
                          title="Vender botella completa"
                        >
                          Entera
                        </button>
                        <button
                          onClick={() => addToCart(p, 50)} // default 50ml shot
                          className="bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400 py-1 text-[9px] font-mono rounded transition-colors cursor-pointer"
                          title="Vender trago/copa 50ml"
                        >
                          Copa 50ml
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="w-full bg-zinc-900 hover:bg-red-950/40 hover:border-red-900/40 border border-zinc-800 text-zinc-300 py-1.5 text-[10px] font-mono rounded-lg transition-all cursor-pointer"
                      >
                        Añadir a cuenta
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Interactive Cart, loyalty, table association and checkout (Col span 5) */}
      <div className="xl:col-span-5 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-full shadow-xl" id="pos-cart-column">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-red-500" />
              <h3 className="font-sans font-semibold text-white text-sm">Consumos del Turno</h3>
            </div>
            <button 
              onClick={clearCart} 
              className="text-xs font-mono text-zinc-500 hover:text-red-400 transition-colors"
            >
              Vaciar
            </button>
          </div>

          {/* Cart list */}
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1" id="cart-list">
            {cart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-600 font-mono text-xs gap-2">
                <Barcode className="w-8 h-8 text-zinc-800 animate-pulse" />
                <span>Carrito de compra vacío</span>
                <span className="text-[9px] text-zinc-700">Fije el cursor en escáner USB para registrar códigos de barra</span>
              </div>
            ) : (
              cart.map(item => {
                const currentUnitPrice = item.customUnitPrice !== undefined 
                  ? item.customUnitPrice 
                  : (item.subtotal / item.quantity);
                const isModified = item.customUnitPrice !== undefined && item.customUnitPrice !== (item.isCocktail ? item.product.price : (item.selectedShotMl ? (item.product.price * (item.selectedShotMl / (item.product.bottleConfig?.capacityMl || 750)) * 1.5) : item.product.price));

                return (
                  <div key={`${item.product.id}-${item.selectedShotMl || ''}-${item.isCocktail ? 'cocktail' : ''}`} className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80 gap-2">
                    <div className="flex-1 min-w-0 pr-1">
                      <h5 className="font-sans font-medium text-white text-xs truncate">
                        {item.selectedShotMl ? `${item.product.name} (Copa ${item.selectedShotMl}ml)` : item.product.name}
                      </h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-zinc-500">{item.selectedShotMl ? 'Servicio Trago' : item.product.unit}</span>
                        {isModified && (
                          <span className="text-[8px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1 rounded font-bold">
                            Precio Modificado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      {/* Quantity adjustment */}
                      <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                        <button 
                          type="button"
                          onClick={() => adjustCartQty(item.product.id, item.selectedShotMl, -1)}
                          className="text-zinc-500 hover:text-red-500 p-0.5 transition-colors"
                          title="Disminuir cantidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono text-zinc-300 font-semibold px-1 w-4 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => adjustCartQty(item.product.id, item.selectedShotMl, 1)}
                          className="text-zinc-500 hover:text-red-500 p-0.5 transition-colors"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Custom price edit input */}
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase">P. Unitario</span>
                        <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 focus-within:border-amber-500 transition-colors">
                          <span className="text-[10px] font-mono text-zinc-500">Bs</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-14 bg-transparent text-xs font-mono font-bold text-amber-400 text-right focus:outline-none"
                            value={item.customUnitPrice !== undefined ? item.customUnitPrice : currentUnitPrice}
                            onChange={(e) => updateCartItemUnitPrice(item.product.id, item.selectedShotMl, item.isCocktail, parseFloat(e.target.value))}
                            title="Haz clic para modificar el precio del producto (ej. combos o promociones)"
                          />
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[50px]">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block">Subtotal</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          Bs {item.subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={() => removeFromCart(item.product.id, item.selectedShotMl)}
                        className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        title="Quitar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Integration Block (Loyalty VIPs, Waiters and physical Tables) */}
        <div className="mt-4 pt-4 border-t border-zinc-900 space-y-3">
          {/* Table Selector */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 mb-1 uppercase">Mesa Física</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                value={associatedTableId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssociatedTableId(val);
                  if (val) {
                    const matchT = tables.find(t => t.id === val);
                    if (matchT && matchT.currentWaiterId) {
                      setSelectedWaiterId(matchT.currentWaiterId);
                    }
                  }
                }}
              >
                <option value="">Venta Directa de Barra</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.number} - {t.name} ({t.status}) {t.consumption?.length ? `[${t.consumption.reduce((a,b)=>a+b.subtotal,0)} ${config.currency}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Waiter Attribution */}
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 mb-1 uppercase">Mesero / Bartender</label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
              >
                <option value="">Cajero Directo ({currentCaja})</option>
                {employees.filter(e => e.isActive).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Import open consumption from selected Table into POS Cart */}
          {(() => {
            const selectedT = tables.find(t => t.id === associatedTableId);
            if (selectedT && selectedT.consumption && selectedT.consumption.length > 0) {
              const tTotal = selectedT.consumption.reduce((acc, it) => acc + it.subtotal, 0);
              return (
                <div className="bg-amber-950/40 border border-amber-600/40 p-2.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono my-2 animate-fade-in">
                  <div>
                    <span className="font-bold text-amber-400 block font-sans">
                      Mesa {selectedT.number}: {tTotal.toLocaleString()} {config.currency} en consumo
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {selectedT.consumption.length} ítem(s) • Mesero: {selectedT.currentWaiterName || 'Sin asignar'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCart(selectedT.consumption);
                      if (selectedT.currentWaiterId) {
                        setSelectedWaiterId(selectedT.currentWaiterId);
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 shadow transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cargar Cuenta a Caja</span>
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Sale Description / Notes field */}
          <div className="mt-2">
            <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider flex items-center gap-1 font-semibold">
              <FileText className="w-3 h-3 text-amber-500" />
              <span>Descripción / Nota de la Venta (Opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Cliente solicitó hielo extra, venta especial evento, etc."
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 font-sans"
              value={saleDescription}
              onChange={(e) => setSaleDescription(e.target.value)}
              maxLength={150}
            />
          </div>
        </div>

        {/* Calculation summary checkout pane */}
        <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2 text-xs">
          <div className="flex justify-between font-mono text-zinc-500">
            <span>Subtotal Consumos:</span>
            <span>{cartSubtotal.toLocaleString()} {config.currency}</span>
          </div>

          {/* Discount Selector */}
          <div className="flex flex-col gap-2 font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>Descuento aplicado:</span>
              <div className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-red-500" />
                <select
                  className="bg-zinc-900 border border-zinc-800 text-[11px] text-white px-1 py-0.5 rounded focus:outline-none"
                  value={discountPercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDiscountPercent(val);
                    if (val === 0) setDiscountReason('');
                  }}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                  <option value="50">50% (Staff)</option>
                  <option value="60">60%</option>
                  <option value="70">70%</option>
                  <option value="80">80%</option>
                  <option value="90">90%</option>
                  <option value="100">100%</option>
                </select>
                <span>(-{discountVal} {config.currency})</span>
              </div>
            </div>
            {discountPercent > 0 && (
              <div className="flex flex-col gap-1 bg-zinc-900/60 border border-zinc-800 p-2 rounded-lg mt-1 font-sans">
                <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span>Detalle / Motivo del Descuento:</span>
                  <span className="text-[8px] text-red-400 font-normal lowercase italic">(requerido)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cortesía, promoción de temporada, etc."
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-red-900"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  maxLength={100}
                />
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="flex justify-between items-center font-mono text-zinc-500">
            <span>Método de Pago:</span>
            <select
              className="bg-zinc-900 border border-zinc-800 text-[11px] text-white px-2 py-1 rounded focus:outline-none"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
            >
              {Object.values(PaymentMethod).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Cash calculator input */}
          <div className="flex justify-between items-center font-mono text-zinc-500">
            <span>Efectivo Entregado:</span>
            <div className="relative max-w-[120px]">
              <DollarSign className="absolute left-1.5 top-1.5 w-3 h-3 text-zinc-600" />
              <input
                type="number"
                min="0"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 pl-5 text-[11px] text-white text-right focus:outline-none focus:border-red-800"
                placeholder={cartTotal.toString()}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60 font-sans">
            <span className="text-zinc-400 font-medium">CAMBIO DEVOLVER:</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              {calculatedChange.toLocaleString()} {config.currency}
            </span>
          </div>

          {/* Grand total large */}
          <div className="flex justify-between items-center pt-1.5">
            <span className="text-white text-xs font-mono font-semibold tracking-wider uppercase">Total a Liquidar:</span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {cartTotal.toLocaleString()} <span className="text-xs text-red-500 font-normal">{config.currency}</span>
            </span>
          </div>

          {/* Ticket option toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-900/40">
            <span className="text-xs text-zinc-500 font-mono">¿Imprimir Ticket de Venta?</span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={shouldPrintTicket}
                onChange={(e) => setShouldPrintTicket(e.target.checked)}
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* Control Checkout Trigger */}
          <div className="pt-3">
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold py-3 rounded-xl shadow-lg shadow-red-950/40 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Lanzar Venta POS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual thermal ticket receipt dialog */}
      {showReceipt && lastCompletedSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white text-black p-6 rounded-xl w-full max-w-sm font-mono text-xs shadow-2xl relative border-t-8 border-red-600" id="thermal-receipt-print-area">
            <button 
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black transition-colors font-sans text-lg font-bold no-print"
            >
              &times;
            </button>

            <div className="text-center space-y-1 pb-4 border-b border-dashed border-zinc-300">
              <h2 className="font-bold text-sm tracking-widest uppercase">Comprobante de Venta</h2>
              <p className="text-[10px] text-zinc-500 font-mono">Terminal: {config.printerSeries}</p>
            </div>

            <div className="py-3 border-b border-dashed border-zinc-300 space-y-1 text-[10px] text-zinc-600">
              <div className="flex justify-between">
                <span>Nro Ticket:</span>
                <span className="font-bold text-black">{lastCompletedSale.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha / Hora:</span>
                <span>{new Date(lastCompletedSale.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{lastCompletedSale.userName}</span>
              </div>
              {lastCompletedSale.description && (
                <div className="flex justify-between text-zinc-700 font-medium">
                  <span>Notas / Detalle:</span>
                  <span className="font-semibold text-zinc-900">{lastCompletedSale.description}</span>
                </div>
              )}
            </div>

            {/* Ticket line items */}
            <div className="py-3 border-b border-dashed border-zinc-300 space-y-2">
              <div className="grid grid-cols-12 gap-1 font-bold text-[9px] text-zinc-500">
                <span className="col-span-6">Descripción</span>
                <span className="col-span-2 text-center">Cant</span>
                <span className="col-span-4 text-right">Monto</span>
              </div>
              {lastCompletedSale.items.map((it: any) => (
                <div key={it.productId} className="grid grid-cols-12 gap-1 text-[10px]">
                  <span className="col-span-6 truncate font-sans">{it.productName}</span>
                  <span className="col-span-2 text-center font-bold">{it.quantity}</span>
                  <span className="col-span-4 text-right">{it.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Ticket Totals */}
            <div className="py-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{lastCompletedSale.subtotal.toFixed(2)} {config.currency}</span>
              </div>
              {lastCompletedSale.discount > 0 && (
                <>
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Descuento:</span>
                    <span>-{lastCompletedSale.discount.toFixed(2)} {config.currency}</span>
                  </div>
                  {lastCompletedSale.discountReason && (
                    <div className="text-[10px] text-zinc-600 italic font-medium leading-tight">
                      Detalle desc: {lastCompletedSale.discountReason}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Impuesto IVA Inc ({config.taxRate * 100}%):</span>
                <span>{lastCompletedSale.tax.toFixed(2)} {config.currency}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-dashed border-zinc-300 pt-2 text-black">
                <span>TOTAL LIQUIDADO:</span>
                <span>{lastCompletedSale.total.toFixed(2)} {config.currency}</span>
              </div>
              
              <div className="flex justify-between text-[10px] text-zinc-600 pt-2">
                <span>Efectivo Pagado:</span>
                <span>{lastCompletedSale.amountPaid.toFixed(2)} {config.currency}</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>Cambio Entregado:</span>
                <span className="font-bold text-emerald-600">{lastCompletedSale.change.toFixed(2)} {config.currency}</span>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-dashed border-zinc-300 text-[9px] text-zinc-400 whitespace-pre-line leading-tight">
              {config.ticketFooter}
            </div>

            {/* Simulate print button */}
            <button 
              onClick={() => {
                alert('Impresora térmica de tickets enviando señal de impresión de 80mm...');
                handlePrintReceipt();
              }}
              className="mt-6 w-full bg-zinc-950 hover:bg-zinc-800 text-white font-mono font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-red-500" />
              <span>Imprimir Ticket Físico</span>
            </button>
          </div>
        </div>
      )}

      {/* WAITER NOTIFICATIONS MODAL */}
      {showWaiterReportsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-40 animate-fade-in" id="waiter-notifications-modal">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <div className="space-y-1">
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Solicitudes de Venta de Meseros ({currentCaja})
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Revisa el comprobante de pago y aprueba para descontar de tu stock de Caja
                </p>
              </div>
              <button 
                onClick={() => setShowWaiterReportsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh] custom-scrollbar bg-zinc-950">
              {pendingReports.map(report => {
                const isLoading = isResolvingReportId === report.id;

                return (
                  <div 
                    key={report.id} 
                    className="border border-zinc-850 rounded-xl p-4 space-y-4 bg-zinc-900/10 hover:border-zinc-800 transition-colors"
                  >
                    {/* Waiter info header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono text-zinc-500">{new Date(report.date).toLocaleString()}</p>
                        <h4 className="text-sm font-sans font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          Mesero: {report.waiterName}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-950/30 text-amber-500 border border-amber-900/30 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {report.paymentMethod}
                      </span>
                    </div>

                    {/* Products details */}
                    <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-lg p-3">
                      <table className="w-full text-left font-mono text-[11px] text-zinc-300">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 text-[10px]">
                            <th className="pb-1.5 uppercase font-medium">Producto</th>
                            <th className="pb-1.5 text-center uppercase font-medium">Cant.</th>
                            <th className="pb-1.5 text-right uppercase font-medium">Unit.</th>
                            <th className="pb-1.5 text-right uppercase font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {report.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-white font-sans font-medium">{it.productName}</td>
                              <td className="py-2 text-center font-bold text-zinc-400">{it.quantity}</td>
                              <td className="py-2 text-right">{it.price.toFixed(2)}</td>
                              <td className="py-2 text-right text-emerald-400 font-bold">{it.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-zinc-900 pt-2 font-bold">
                            <td colSpan={3} className="py-2.5 text-zinc-400 text-right uppercase">Total a Liquidar:</td>
                            <td className="py-2.5 text-right text-white text-xs">{report.total.toFixed(2)} {config.currency}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {report.observations && (
                      <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900/30 p-2 border border-zinc-900/60 rounded italic">
                        Detalle del mesero: {report.observations}
                      </div>
                    )}

                    {/* Receipt thumbnail & Action buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1 border-t border-zinc-900/50">
                      <div>
                        {report.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewingReportReceipt(report.imageUrl || null)}
                            className="text-[10px] font-mono border border-zinc-800 hover:border-amber-900/40 hover:text-amber-400 bg-zinc-900/40 text-zinc-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Comprobante de Pago
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-600">Sin comprobante adjunto</span>
                        )}
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={async () => {
                            setIsResolvingReportId(report.id);
                            try {
                              await resolveWaiterReport(report.id, 'rechazado');
                            } catch (err: any) {
                              console.error(`Error al rechazar: ${err.message}`);
                            } finally {
                              setIsResolvingReportId(null);
                            }
                          }}
                          className="flex-1 sm:flex-none text-[10px] font-mono font-bold bg-zinc-900 hover:bg-zinc-850 hover:text-red-400 text-zinc-400 border border-zinc-800 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={async () => {
                            setIsResolvingReportId(report.id);
                            try {
                              await resolveWaiterReport(report.id, 'aprobado');
                              alert(`¡Solicitud aprobada! El stock de tu ${currentCaja} ha sido descontado y la venta quedó asentada.`);
                            } catch (err: any) {
                              alert(`Error al aprobar venta: ${err.message}`);
                            } finally {
                              setIsResolvingReportId(null);
                            }
                          }}
                          className="flex-1 sm:flex-none text-[10px] font-mono font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
                        >
                          {isLoading ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Aprobar y Registrar Venta
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {pendingReports.length === 0 && (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
                  <span className="text-zinc-600">No tienes solicitudes pendientes de meseros para tu {currentCaja} actualmente.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-900 text-center bg-zinc-950">
              <button
                onClick={() => setShowWaiterReportsModal(false)}
                className="px-5 py-1.5 bg-zinc-900 hover:bg-zinc-850 rounded-lg text-[10px] font-mono text-zinc-400 border border-zinc-850 uppercase cursor-pointer"
              >
                Cerrar Notificaciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WAITER REPORT RECEIPT DETAILED POPUP OVERLAY */}
      {viewingReportReceipt && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-lg w-full overflow-hidden p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" />
                Validación de Pago • Captura Recibida
              </h3>
              <button 
                onClick={() => setViewingReportReceipt(null)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="border border-zinc-900 bg-zinc-900/20 rounded-xl overflow-hidden p-2 flex items-center justify-center max-h-[500px]">
              <img 
                src={viewingReportReceipt} 
                alt="Captura comprobante mesero" 
                className="max-h-[450px] object-contain rounded-lg"
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => setViewingReportReceipt(null)}
                className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-800 uppercase cursor-pointer"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CASHIER RESERVATIONS & PAYMENT VERIFICATION OVERLAY MODAL */}
      {showReservationsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase">Control de Reservaciones & Pagos en Caja</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Verifique prepagos, covers y estado de cierre de mesas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReservationsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-400">Filtrar por Fecha:</span>
                <input
                  type="date"
                  value={resFilterDate}
                  onChange={(e) => setResFilterDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-amber-400 px-2 py-1 rounded-lg text-xs focus:outline-none"
                />
                {resFilterDate && (
                  <button
                    onClick={() => setResFilterDate('')}
                    className="text-[10px] text-zinc-500 hover:text-white underline"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>

              <div className="text-[10px] font-mono text-zinc-400">
                Total Reservas: <strong className="text-amber-400">{tables.filter(t => t.status === TableStatus.RESERVED).length}</strong> • Pendientes Pago: <strong className="text-red-400">{tables.filter(t => t.status === TableStatus.RESERVED && !t.reservationPaymentVerified).length}</strong>
              </div>
            </div>

            {/* Reservations List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 font-mono text-xs">
              {tables
                .filter(t => t.status === TableStatus.RESERVED && (!resFilterDate || t.reservationDate === resFilterDate))
                .map(resTable => (
                  <div 
                    key={resTable.id}
                    className={`bg-zinc-900 p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      resTable.reservationPaymentVerified ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-amber-900/50 bg-amber-950/10'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-950 text-amber-400 border border-amber-900/50 text-[11px] font-bold px-2.5 py-0.5 rounded">
                          Mesa {resTable.number} (Piso {resTable.floor || 0})
                        </span>
                        <span className="text-zinc-400 font-bold text-xs">
                          📅 {resTable.reservationDate || 'Hoy'} • ⏰ {resTable.reservationTime || '22:00'}
                        </span>
                        {resTable.reservationPaymentVerified ? (
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-2 py-0.5 rounded font-bold">
                            ✓ PAGO VERIFICADO
                          </span>
                        ) : (
                          <span className="bg-red-950 text-red-400 border border-red-900/40 text-[9px] px-2 py-0.5 rounded font-bold animate-pulse">
                            ⏳ PENDIENTE DE VERIFICACIÓN
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-xs font-sans">
                        <span><strong>Cliente:</strong> {resTable.reservationClient || 'Anónimo'}</span>
                        {resTable.reservationPhone && <span><strong>Tel:</strong> {resTable.reservationPhone}</span>}
                        <span><strong>Pax:</strong> {resTable.reservationPeople || 4} personas</span>
                        <span><strong>Prepago / Cover:</strong> <strong className="text-emerald-400 font-mono">{resTable.reservationCoverPaid || 0} {config.currency}</strong></span>
                      </div>

                      {resTable.reservationDrinkAlert && (
                        <div className="text-[11px] font-sans text-amber-300 bg-amber-950/30 p-1.5 rounded border border-amber-900/30">
                          🍹 <strong>Cortesía / Bebida:</strong> {resTable.reservationDrinkAlert}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap md:flex-col gap-2 shrink-0 justify-end">
                      <button
                        onClick={() => verifyReservationPayment(resTable.id, !resTable.reservationPaymentVerified)}
                        className={`px-3 py-1.5 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          resTable.reservationPaymentVerified 
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-black'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{resTable.reservationPaymentVerified ? 'Desmarcar Pago' : 'Confirmar Pago en Caja'}</span>
                      </button>

                      <button
                        onClick={() => {
                          updateTableStatus(resTable.id, TableStatus.OCCUPIED);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Check-In (Ocupar)</span>
                      </button>

                      <button
                        onClick={() => {
                          cancelTableReservation(resTable.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-red-950 hover:text-red-400 text-zinc-400 font-mono text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Cerrar / Liberar</span>
                      </button>
                    </div>
                  </div>
                ))}

              {tables.filter(t => t.status === TableStatus.RESERVED && (!resFilterDate || t.reservationDate === resFilterDate)).length === 0 && (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No hay reservaciones registradas {resFilterDate ? `para la fecha ${resFilterDate}` : ''}.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950 text-right">
              <button
                onClick={() => setShowReservationsModal(false)}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 border border-zinc-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Paleteo Modal for POS Cashiers */}
      <PaleteoModal 
        isOpen={isPaleteoModalOpen} 
        onClose={() => setIsPaleteoModalOpen(false)} 
        initialProductId={paleteoTargetProductId}
        initialTargetCaja={currentCaja}
      />

      {/* Return To Warehouse Modal (Cierre de Día) */}
      <ReturnToWarehouseModal
        isOpen={isReturnToWarehouseOpen}
        onClose={() => setIsReturnToWarehouseOpen(false)}
        defaultCaja={currentCaja}
      />

      {/* CONFIRMATION MODAL: DECLARAR BOTELLA VACÍA (POS / CAJA) */}
      {confirmDiscardModalPOS && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-red-950/60 relative text-center">
            <button
              onClick={() => setConfirmDiscardModalPOS(null)}
              disabled={isProcessingPosBottle}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="p-4 bg-red-950/80 border border-red-700/60 rounded-full text-red-400 shadow-inner">
                <Trash2 className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest bg-red-950/40 px-3 py-1 rounded-full border border-red-800/40">
                Confirmación de Desecho ({currentCaja})
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white leading-snug">
                ¿Confirmar que 1 botella abierta de <span className="text-red-400 font-extrabold">{confirmDiscardModalPOS.name}</span> está VACÍA?
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                • La botella ya NO figurará como activa con el bartender.<br />
                • Se registrará <strong>+1 botella vacía</strong> en {currentCaja} para la planilla diaria de cierre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setConfirmDiscardModalPOS(null)}
                disabled={isProcessingPosBottle}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executeDiscardPOS}
                disabled={isProcessingPosBottle}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-950/60 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingPosBottle ? (
                  <span className="animate-pulse">Procesando...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Desechar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DESCORCHAR / ABRIR BOTELLA NUEVA (POS / CAJA) */}
      {confirmOpenModalPOS && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-amber-800/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl shadow-amber-950/60 relative text-center">
            <button
              onClick={() => setConfirmOpenModalPOS(null)}
              disabled={isProcessingPosBottle}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="p-4 bg-amber-950/80 border border-amber-700/60 rounded-full text-amber-400 shadow-inner">
                <Wine className="w-8 h-8 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
                Apertura y Descorche ({currentCaja})
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white leading-snug">
                ¿Desea descorchar una botella nueva de <span className="text-amber-400 font-extrabold">{confirmOpenModalPOS.name}</span>?
              </h3>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                • Se descontará 1 unidad física del inventario.<br />
                • Quedará registrada como botella abierta para el bartender en {currentCaja}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setConfirmOpenModalPOS(null)}
                disabled={isProcessingPosBottle}
                className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-mono text-xs font-bold py-3 px-4 rounded-xl transition-all border border-zinc-800 uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executeOpenPOS}
                disabled={isProcessingPosBottle}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-950/50 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingPosBottle ? (
                  <span className="animate-pulse">Abriendo...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Sí, Descorchar</span>
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
