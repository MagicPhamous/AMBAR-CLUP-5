/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Table, TableStatus, CartItem, PaymentMethod, UserRole } from '../types';
import { formatDateDDMMAAAA } from '../utils/dateUtils';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { floorMapTables } from '../components/floorMapData';
import { 
  Check, 
  Trash2, 
  Wine, 
  User, 
  Map, 
  Clock, 
  ArrowRight, 
  Layers, 
  HelpCircle,
  Plus,
  Receipt,
  Scissors,
  Calendar,
  Users,
  Phone,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Info,
  DollarSign,
  Lock,
  ArrowRightLeft
} from 'lucide-react';

export default function Tables() {
  const { 
    currentUser,
    tables, 
    updateTableStatus, 
    removeConsumptionFromTable, 
    transferConsumption, 
    clearTableConsumption,
    saveTableReservation,
    deliverReservationCourtesyBottle,
    cancelTableReservation,
    verifyReservationPayment,
    updateReservationStatus,
    moveTableToAnother,
    employees,
    products,
    addConsumptionToTable,
    processPOSSale,
    config,
    clients
  } = useApp();

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [currentFloor, setCurrentFloor] = useState<number>(0);
  const [leftTab, setLeftTab] = useState<'map' | 'reservations'>('map');

  // Reservation form states
  const [resClient, setResClient] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resTime, setResTime] = useState('22:00');
  const [resDate, setResDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resPeople, setResPeople] = useState(4);
  const [resCoverPaid, setResCoverPaid] = useState(0);
  const [resPaymentVerified, setResPaymentVerified] = useState(false);
  const [resStatus, setResStatus] = useState<'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado'>('pendiente');
  const [resNotes, setResNotes] = useState('');
  const [resCourtesyBottleId, setResCourtesyBottleId] = useState('');
  const [resCourtesyBottleUpgradePaid, setResCourtesyBottleUpgradePaid] = useState(0);
  const [searchClientQuery, setSearchClientQuery] = useState('');

  // Move Table modal state
  const [tableToMove, setTableToMove] = useState<Table | null>(null);
  const [moveTargetTableId, setMoveTargetTableId] = useState<string>('');
  const [moveTargetDate, setMoveTargetDate] = useState<string | undefined>(undefined);

  const handleConfirmMoveTable = () => {
    if (!tableToMove || !moveTargetTableId) {
      alert("Por favor seleccione la mesa de destino.");
      return;
    }
    if (tableToMove.id === moveTargetTableId) {
      alert("La mesa de destino debe ser diferente a la mesa de origen.");
      return;
    }
    if (tableToMove.status === TableStatus.OCCUPIED || (tableToMove.consumption && tableToMove.consumption.length > 0)) {
      alert(`⛔ No se puede mover la Mesa #${tableToMove.number} porque se encuentra actualmente Ocupada o en atención.`);
      return;
    }
    const targetTab = tables.find(t => t.id === moveTargetTableId);
    if (!targetTab) return;

    const dateBeingMoved = moveTargetDate || new Date().toISOString().split('T')[0];
    const targetResList = targetTab.reservations ? targetTab.reservations : [];
    const isTargetReserved = targetResList.some(r => r.date === dateBeingMoved && r.status !== 'cancelado') ||
      (targetTab.reservationDate === dateBeingMoved && Boolean(targetTab.reservationClient) && targetTab.reservationStatus !== 'cancelado');

    if (isTargetReserved) {
      alert(`⛔ No se puede mover a la Mesa #${targetTab.number} porque ya tiene una reserva activa para el ${formatDateDDMMAAAA(dateBeingMoved)}.`);
      return;
    }

    moveTableToAnother(tableToMove.id, moveTargetTableId, moveTargetDate);
    const dateInfo = moveTargetDate ? ` (Reserva del ${formatDateDDMMAAAA(moveTargetDate)})` : ' (Servicio actual)';
    alert(`Reubicación realizada exitosamente a Mesa #${targetTab.number}${dateInfo}.`);
    setTableToMove(null);
    setMoveTargetTableId('');
    setMoveTargetDate(undefined);
    setActiveTableId(moveTargetTableId);
  };
  const [resDateFilter, setResDateFilter] = useState('');

  // Auto seeding/sync state
  const [isSeeding, setIsSeeding] = useState(false);

  const selectedTable = useMemo(() => 
    tables.find(t => t.id === activeTableId),
    [tables, activeTableId]
  );

  // Permission check: Only Gerente, Admin, or Caja can manage reservations
  const canManageReservations = useMemo(() => {
    return (
      currentUser?.role === UserRole.GERENTE ||
      currentUser?.role === UserRole.ADMIN ||
      currentUser?.role === UserRole.CAJA ||
      (currentUser?.role as string) === 'Gerente' ||
      (currentUser?.role as string) === 'Administrador' ||
      (currentUser?.role as string) === 'Caja'
    );
  }, [currentUser]);

  // Prefill reservation form when table changes
  useEffect(() => {
    if (selectedTable) {
      if (selectedTable.status === TableStatus.RESERVED) {
        setResClient(selectedTable.reservationClient || '');
        setResPhone(selectedTable.reservationPhone || '');
        setResTime(selectedTable.reservationTime || '22:00');
        setResDate(selectedTable.reservationDate || new Date().toISOString().split('T')[0]);
        setResPeople(selectedTable.reservationPeople || 4);
        setResCoverPaid(selectedTable.reservationCoverPaid || 0);
        setResPaymentVerified(selectedTable.reservationPaymentVerified || false);
        setResStatus(selectedTable.reservationStatus || 'pendiente');
        setResNotes(selectedTable.notes || '');
        setResCourtesyBottleId(selectedTable.reservationCourtesyBottleId || '');
        setResCourtesyBottleUpgradePaid(selectedTable.reservationCourtesyBottleUpgradePaid || 0);
      } else {
        setResClient('');
        setResPhone('');
        setResTime('22:00');
        setResDate(new Date().toISOString().split('T')[0]);
        setResPeople(4);
        setResCoverPaid(0);
        setResPaymentVerified(false);
        setResStatus('pendiente');
        setResNotes('');
        setResCourtesyBottleId('');
        setResCourtesyBottleUpgradePaid(0);
      }
    }
  }, [activeTableId, selectedTable]);

  const getStatusColor = (status: TableStatus, isSelected: boolean) => {
    switch (status) {
      case TableStatus.OCCUPIED:
        return isSelected
          ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)]'
          : 'bg-red-950/60 border-red-500/70 text-red-200 hover:border-red-400';
      case TableStatus.RESERVED:
        return isSelected
          ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.7)]'
          : 'bg-amber-950/50 border-amber-600/70 text-amber-200 hover:border-amber-400';
      case TableStatus.CLEANING:
        return isSelected
          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.7)] animate-pulse'
          : 'bg-blue-950/50 border-blue-500/70 text-blue-200 hover:border-blue-400 animate-pulse';
      case TableStatus.FREE:
      default:
        return isSelected
          ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]'
          : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200';
    }
  };

  const getStatusLabel = (status: TableStatus) => {
    switch (status) {
      case TableStatus.OCCUPIED:
        return 'Ocupada';
      case TableStatus.RESERVED:
        return 'Reservada';
      case TableStatus.CLEANING:
        return 'En limpieza';
      case TableStatus.FREE:
      default:
        return 'Libre';
    }
  };

  const handleTableClick = (tId: string) => {
    setActiveTableId(tId);
  };

  // Seeding full 66 tables
  const handleInitializeDefaultTables = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      floorMapTables.forEach((tLayout) => {
        // Only seed if not already present
        const existing = tables.find(t => t.number === tLayout.number && t.floor === tLayout.floor);
        if (!existing) {
          const id = `table_${tLayout.floor}_${tLayout.number.toLowerCase()}`;
          const tableRef = doc(db, 'tables', id);
          batch.set(tableRef, {
            id,
            number: tLayout.number,
            name: `${tLayout.name}`,
            status: TableStatus.FREE,
            consumption: [],
            floor: tLayout.floor,
            type: tLayout.type,
            notes: ''
          });
        }
      });
      await batch.commit();
      alert("¡Distribución de 66 mesas de Ámbar Casino-Club inicializada con éxito!");
    } catch (err) {
      console.error(err);
      alert("Error al inicializar mesas.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Handle saving new or updated reservation
  const handleSaveReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageReservations) {
      alert("🔒 Acceso Denegado: Únicamente el personal de Gerencia y Caja está autorizado para realizar o gestionar reservaciones.");
      return;
    }
    if (!selectedTable) return;
    if (!resClient.trim()) {
      alert("Por favor ingrese el nombre del cliente.");
      return;
    }

    const selectedBottleProduct = products.find(p => p.id === resCourtesyBottleId);
    const courtesyBottleName = selectedBottleProduct ? selectedBottleProduct.name : '';
    const courtesyBottlePrice = selectedBottleProduct ? selectedBottleProduct.price : 0;

    saveTableReservation(
      selectedTable.id,
      resClient,
      resPhone,
      resTime,
      resPeople,
      resCoverPaid,
      resNotes,
      resDate,
      resPaymentVerified,
      resStatus,
      resCourtesyBottleId,
      courtesyBottleName,
      courtesyBottlePrice,
      resCourtesyBottleUpgradePaid,
      selectedTable.reservationCourtesyBottleDelivered ?? false
    );
    
    alert(`Mesa ${selectedTable.number} reservada exitosamente para ${resClient} (${formatDateDDMMAAAA(resDate)}).${courtesyBottleName ? `\nBotella de Cortesía: ${courtesyBottleName}` : ''}`);
    // Clear form fields
    setResClient('');
    setResPhone('');
    setResNotes('');
    setResCoverPaid(0);
    setResPaymentVerified(false);
    setResCourtesyBottleId('');
    setResCourtesyBottleUpgradePaid(0);
  };

  // Helper to prepare new reservation for another date
  const handleNewResForAnotherDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    setResClient('');
    setResPhone('');
    setResTime('22:00');
    setResDate(tomorrowStr);
    setResPeople(4);
    setResCoverPaid(0);
    setResPaymentVerified(false);
    setResNotes('');
    setResCourtesyBottleId('');
    setResCourtesyBottleUpgradePaid(0);
  };

  // Deliver courtesy bottle from Central Warehouse
  const handleDeliverCourtesyBottle = async (tableId: string, targetDate?: string, bottleName?: string) => {
    if (!window.confirm(`¿Confirmar entrega de la botella de cortesía "${bottleName || 'de Almacén Central'}" para esta reservación?\n\nSe descontará 1 unidad del inventario del Almacén Central y se registrará en el Kardex.`)) {
      return;
    }
    try {
      await deliverReservationCourtesyBottle(tableId, targetDate);
      alert(`🍾 ¡Botella de cortesía "${bottleName || ''}" entregada con éxito! Se ha descontado 1 unidad de Almacén Central.`);
    } catch (err: any) {
      alert(`⚠️ Error al entregar la botella: ${err?.message || 'Intente nuevamente'}`);
    }
  };

  // Check-In (mark table occupied from reservation)
  const handleReservationCheckIn = () => {
    if (!selectedTable) return;
    updateTableStatus(selectedTable.id, TableStatus.OCCUPIED);
  };

  // Cancel reservation
  const handleCancelReservationClick = () => {
    if (!selectedTable) return;
    cancelTableReservation(selectedTable.id, selectedTable.reservationDate);
  };

  // Auto-fill form from clients directory
  const handleSelectClientFromDir = (cli: typeof clients[0]) => {
    setResClient(cli.name);
    setResPhone(cli.phone || '');
    setResNotes(`Cliente Frecuente (${cli.preferences || 'Sin preferencias'})`);
    setSearchClientQuery('');
  };

  // Calculations
  const tableTotal = useMemo(() => 
    selectedTable ? selectedTable.consumption.reduce((acc, it) => acc + it.subtotal, 0) : 0,
    [selectedTable]
  );
  
  // Filter tables currently displayed on map
  const activeTablesForFloor = useMemo(() => {
    return tables.filter(t => {
      // If the Firestore table has a floor property, use it. Otherwise, derive or seed!
      if (t.floor !== undefined) {
        return t.floor === currentFloor;
      }
      // Fallback: match the floorMap definition
      const layout = floorMapTables.find(fl => fl.number === t.number);
      return layout ? layout.floor === currentFloor : currentFloor === 0; // Default to Floor 0
    });
  }, [tables, currentFloor]);

  const allReservations = useMemo(() => {
    const list: any[] = [];
    tables.forEach(t => {
      if (t.reservations && t.reservations.length > 0) {
        t.reservations.forEach(r => {
          if (r.status !== 'cancelado') {
            list.push({
              ...r,
              tableId: t.id,
              tableNumber: t.number,
              floor: t.floor || 0
            });
          }
        });
      } else if (t.status === TableStatus.RESERVED && t.reservationClient) {
        list.push({
          id: `${t.id}_legacy`,
          tableId: t.id,
          tableNumber: t.number,
          clientName: t.reservationClient,
          phone: t.reservationPhone || '',
          time: t.reservationTime || '22:00',
          date: t.reservationDate || new Date().toISOString().split('T')[0],
          people: t.reservationPeople || 4,
          coverPaid: t.reservationCoverPaid || 0,
          paymentVerified: Boolean(t.reservationPaymentVerified),
          status: t.reservationStatus || 'pendiente',
          notes: t.notes || '',
          floor: t.floor || 0
        });
      }
    });
    return list;
  }, [tables]);

  const lowStockCount = useMemo(() => 
    products.filter(p => p.isActive && p.quantity <= p.minStock).length,
    [products]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-130px)] min-h-[500px]" id="tables-interface">
      {/* LEFT COLUMN: Map or Reservations List (Col span 7) */}
      <div className="xl:col-span-7 flex flex-col justify-between" id="tables-layout-column">
        {/* Header toolbar */}
        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-sans font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Map className="w-4.5 h-4.5 text-amber-500" />
                Ámbar Casino-Club • Control de Reservas & Mesas
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                Plano Oficial Interactiva • Visualización y Operaciones en Tiempo Real
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {tables.length < 35 && (
                <button
                  onClick={handleInitializeDefaultTables}
                  disabled={isSeeding}
                  className="bg-amber-950/40 border border-amber-900/50 hover:bg-amber-900 text-amber-400 text-[10px] font-mono px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Cargar mapa oficial de 66 mesas"
                >
                  <RefreshCw className={`w-3 h-3 ${isSeeding ? 'animate-spin' : ''}`} />
                  <span>Cargar 66 Mesas Mapa</span>
                </button>
              )}
              
              <div className="bg-zinc-900 p-0.5 rounded-lg flex border border-zinc-800">
                <button
                  onClick={() => setLeftTab('map')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${leftTab === 'map' ? 'bg-amber-600 text-black font-semibold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Vista Mapa
                </button>
                <button
                  onClick={() => setLeftTab('reservations')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer relative ${leftTab === 'reservations' ? 'bg-amber-600 text-black font-semibold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Reservas ({allReservations.length})
                  {allReservations.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                      {allReservations.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick status legends & Floor Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-900/60" id="tables-legends">
            <div className="flex flex-wrap gap-4 text-[10px] font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800" />
                <span>Libre</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-950 border border-red-600" />
                <span>Ocupada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-950 border border-amber-600" />
                <span>Reservada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-950 border border-blue-600 animate-pulse" />
                <span>En limpieza</span>
              </div>
            </div>

            {/* Floor selector (Piso 0 / Piso 1) */}
            {leftTab === 'map' && (
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setCurrentFloor(0)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${currentFloor === 0 ? 'bg-red-950 text-red-400 border border-red-900/50' : 'text-zinc-500 hover:text-white'}`}
                >
                  PISO 0 (Planta Baja)
                </button>
                <button
                  onClick={() => setCurrentFloor(1)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${currentFloor === 1 ? 'bg-red-950 text-red-400 border border-red-900/50' : 'text-zinc-500 hover:text-white'}`}
                >
                  PISO 1 (Planta Alta)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 mt-4 border border-zinc-900 rounded-2xl bg-zinc-950 p-1 overflow-hidden h-[calc(100vh-270px)] min-h-[400px]">
          {leftTab === 'map' ? (
            /* MAP INTERACTIVE CANVAS */
            <div className="w-full h-full relative overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(50,5,5,0.4)_0%,rgba(9,9,11,1)_100%)] p-2">
              <div className="absolute inset-0 bg-repeat bg-[size:16px_16px] opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)' }} />

              {/* Schematic Rooms / Layout elements for Piso 0 */}
              {currentFloor === 0 && (
                <>
                  {/* BAÑOS */}
                  <div className="absolute left-[3%] top-[3%] w-[18%] h-[8%] border border-dashed border-zinc-800/40 rounded-lg flex items-center justify-center text-[10px] font-mono text-zinc-600 bg-zinc-950/20 pointer-events-none">
                    BAÑOS 🚻
                  </div>
                  {/* BAR TOP */}
                  <div className="absolute right-[5%] top-[18%] w-[12%] h-[20%] border border-amber-950/30 rounded-xl flex flex-col items-center justify-center text-[11px] font-mono text-amber-500/50 bg-amber-950/10 pointer-events-none">
                    <Wine className="w-4 h-4 mb-1 text-amber-500/30" />
                    <span>BAR 🍷</span>
                  </div>
                  {/* ESCENARIO */}
                  <div className="absolute right-[4%] top-[45%] w-[22%] h-[20%] border-2 border-red-950/40 bg-gradient-to-br from-red-950/20 to-zinc-950/40 rounded-2xl flex flex-col items-center justify-center text-center p-2 shadow-inner pointer-events-none">
                    <Sparkles className="w-5 h-5 text-red-500/40 mb-1 animate-pulse" />
                    <span className="text-[10px] font-mono text-red-500/60 uppercase tracking-widest font-semibold">ESCENARIO</span>
                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-mono mt-0.5">Live Show</span>
                  </div>
                  {/* BAR BOTTOM */}
                  <div className="absolute left-[4%] top-[68%] w-[13%] h-[16%] border border-amber-950/30 rounded-xl flex flex-col items-center justify-center text-[11px] font-mono text-amber-500/50 bg-amber-950/10 pointer-events-none">
                    <Wine className="w-4 h-4 mb-1 text-amber-500/30" />
                    <span>BAR 🍹</span>
                  </div>
                  {/* STAIRS */}
                  <div className="absolute left-[24%] top-[81%] w-[14%] h-[11%] border border-dashed border-zinc-800/60 rounded-xl flex flex-col items-center justify-center text-center bg-zinc-900/20 pointer-events-none">
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">ESCALERAS 🪜</span>
                  </div>
                  {/* ENTRADA */}
                  <div className="absolute left-[42%] top-[87%] w-[18%] h-[10%] border-t border-x border-zinc-800 rounded-t-xl flex items-center justify-center text-center bg-zinc-900/40 pointer-events-none">
                    <span className="text-[9px] text-zinc-500 tracking-widest font-mono font-bold">ENTRADA 🚪</span>
                  </div>
                </>
              )}

              {/* Schematic Rooms / Layout elements for Piso 1 */}
              {currentFloor === 1 && (
                <>
                  {/* BAÑOS */}
                  <div className="absolute left-[10%] top-[4%] w-[18%] h-[8%] border border-dashed border-zinc-800/40 rounded-lg flex items-center justify-center text-[10px] font-mono text-zinc-600 bg-zinc-950/20 pointer-events-none">
                    BAÑOS 🚻
                  </div>
                  {/* BAR LEFT */}
                  <div className="absolute left-[10%] top-[35%] w-[12%] h-[18%] border border-amber-950/30 rounded-xl flex flex-col items-center justify-center text-[11px] font-mono text-amber-500/50 bg-amber-950/10 pointer-events-none">
                    <Wine className="w-4 h-4 mb-1 text-amber-500/30" />
                    <span>BAR 🍷</span>
                  </div>
                  {/* ESCENARIO HOLE */}
                  <div className="absolute right-[5%] top-[15%] w-[20%] h-[28%] border-2 border-dashed border-zinc-900 bg-zinc-950/60 rounded-2xl flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">VACÍO SOBRE</span>
                    <span className="text-[9px] text-red-500/40 font-bold uppercase tracking-wider font-mono">ESCENARIO</span>
                  </div>
                  {/* BAR HORIZONTAL */}
                  <div className="absolute right-[10%] top-[77%] w-[35%] h-[11%] border border-amber-950/30 rounded-xl flex items-center justify-center gap-2 text-[11px] font-mono text-amber-500/50 bg-amber-950/10 pointer-events-none">
                    <Wine className="w-4 h-4 text-amber-500/30" />
                    <span>BAR PRINCIPAL ALTA 🍷</span>
                  </div>
                </>
              )}

              {/* RENDER ACTIVE TABLES ON CANVAS MAP */}
              {floorMapTables.filter(t => t.floor === currentFloor).map((tLayout) => {
                // Find matching table inside active Firestore data
                const dbTable = tables.find(tb => tb.number === tLayout.number && tb.floor === currentFloor);
                const tableId = dbTable ? dbTable.id : `table_${currentFloor}_${tLayout.number.toLowerCase()}`;
                const status = dbTable ? dbTable.status : TableStatus.FREE;
                const isSelected = activeTableId === tableId;

                const shapeClass = 
                  tLayout.type === 'C' ? 'rounded-full' : 
                  tLayout.type === 'S' ? 'rounded-2xl' : 
                  tLayout.type === 'K' ? 'rounded-lg border-dashed' : 'rounded-lg';

                const displayNum = tLayout.number;

                return (
                  <button
                    key={tLayout.number}
                    onClick={() => {
                      // If table doesn't exist in DB, let's auto-create it on click to avoid crashes!
                      if (!dbTable) {
                        const batch = writeBatch(db);
                        const tableRef = doc(db, 'tables', tableId);
                        batch.set(tableRef, {
                          id: tableId,
                          number: tLayout.number,
                          name: tLayout.name,
                          status: TableStatus.FREE,
                          consumption: [],
                          floor: currentFloor,
                          type: tLayout.type,
                          notes: ''
                        });
                        batch.commit().catch(err => console.error("Error clicking unseeded table:", err));
                      }
                      handleTableClick(tableId);
                    }}
                    style={{
                      left: `${tLayout.x}%`,
                      top: `${tLayout.y}%`,
                      width: `${tLayout.w || 7}%`,
                      height: `${tLayout.h || 6}%`,
                    }}
                    className={`absolute flex flex-col items-center justify-center border-2 text-[10px] font-mono font-bold transition-all duration-300 transform hover:scale-110 cursor-pointer ${shapeClass} ${getStatusColor(status, isSelected)}`}
                    title={`${tLayout.name} - ${getStatusLabel(status)}`}
                  >
                    <span>{displayNum}</span>
                    {dbTable && dbTable.status === TableStatus.OCCUPIED && dbTable.consumption.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping mt-0.5" />
                    )}
                    {dbTable && dbTable.status === TableStatus.RESERVED && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
                    )}
                  </button>
                );
              })}

              {/* EMPTY CORNER MESSAGE IF NO TABLES SEEDED YET */}
              {tables.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs p-6 text-center text-zinc-400 font-mono text-xs gap-3">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                  <span>No se han inicializado las mesas en Firestore.</span>
                  <button
                    onClick={handleInitializeDefaultTables}
                    disabled={isSeeding}
                    className="bg-amber-600 hover:bg-amber-500 text-black font-semibold py-2 px-4 rounded-xl cursor-pointer disabled:opacity-40"
                  >
                    {isSeeding ? 'Inicializando...' : 'Inicializar 66 Mesas Oficiales'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ALL ACTIVE RESERVATIONS LIST VIEW */
            <div className="w-full h-full p-4 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs pb-2 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-bold uppercase">Reservaciones Activas ({allReservations.length})</span>
                  <span className="text-[10px] text-amber-500 uppercase">Ámbar Club</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono">Filtrar por Fecha:</span>
                  <input
                    type="date"
                    value={resDateFilter}
                    onChange={(e) => setResDateFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-amber-400 px-2 py-1 rounded-lg focus:outline-none"
                  />
                  {resDateFilter && (
                    <button
                      onClick={() => setResDateFilter('')}
                      className="text-[10px] text-zinc-500 hover:text-white underline cursor-pointer"
                    >
                      Ver todas
                    </button>
                  )}
                </div>
              </div>

              {allReservations.filter(r => !resDateFilter || (r.date || r.reservationDate) === resDateFilter).length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <Calendar className="w-8 h-8 text-zinc-800" />
                  <span>No existen reservaciones {resDateFilter ? `para la fecha ${formatDateDDMMAAAA(resDateFilter)}` : 'activas en este momento'}</span>
                  <span className="text-[10px] text-zinc-700">Seleccione cualquier mesa del mapa para programar una reserva</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allReservations
                    .filter(r => !resDateFilter || (r.date || r.reservationDate) === resDateFilter)
                    .map(resTab => {
                      const resDateVal = resTab.date || resTab.reservationDate || 'Hoy';
                      const resClientVal = resTab.clientName || resTab.reservationClient || 'Cliente Anónimo';
                      const resTimeVal = resTab.time || resTab.reservationTime || '22:00';
                      const resPhoneVal = resTab.phone || resTab.reservationPhone;
                      const resPeopleVal = resTab.people || resTab.reservationPeople || 4;
                      const resCoverVal = resTab.coverPaid || resTab.reservationCoverPaid || 0;
                      const resVerifiedVal = resTab.paymentVerified !== undefined ? resTab.paymentVerified : resTab.reservationPaymentVerified;
                      const tableNumVal = resTab.tableNumber || resTab.number;
                      const tableIdVal = resTab.tableId || resTab.id;

                      return (
                        <div 
                          key={resTab.id} 
                          className={`bg-zinc-900 border p-4 rounded-xl space-y-3 hover:border-amber-500/40 transition-all cursor-pointer ${resVerifiedVal ? 'border-emerald-900/40' : 'border-amber-900/40'}`}
                          onClick={() => {
                            setActiveTableId(tableIdVal);
                            setLeftTab('map');
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-amber-950 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded text-[10px] font-bold">
                                Mesa {tableNumVal}
                              </span>
                              <span className="text-[10px] text-zinc-500 ml-2">Piso {resTab.floor || 0}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-zinc-400 font-mono font-semibold flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-500" />
                                {formatDateDDMMAAAA(resDateVal)}
                              </span>
                              <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {resTimeVal}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-white font-sans font-medium text-sm">
                              <span className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-zinc-500" />
                                {resClientVal}
                              </span>
                              {resVerifiedVal ? (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> PAGO VERIFICADO
                                </span>
                              ) : (
                                <span className="bg-amber-950 text-amber-400 border border-amber-800/40 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 animate-pulse" /> PENDIENTE CAJA
                                </span>
                              )}
                            </div>

                            {resPhoneVal && (
                              <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{resPhoneVal}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-zinc-400 text-[11px] pt-1 font-mono">
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-zinc-500" /> {resPeopleVal} Pax</span>
                              <span className="flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-zinc-500" /> Pre-pago: <strong className="text-emerald-400">{resCoverVal} {config.currency}</strong></span>
                            </div>
                          </div>

                          {resTab.notes && (
                            <div className="bg-zinc-950 p-2 rounded-lg text-zinc-400 text-[11px] border border-zinc-900/50 truncate">
                              💡 {resTab.notes}
                            </div>
                          )}

                          {(() => {
                            const bottleNameVal = resTab.courtesyBottleName || resTab.reservationCourtesyBottleName;
                            const bottlePriceVal = resTab.courtesyBottlePrice || resTab.reservationCourtesyBottlePrice || 0;
                            const bottleUpgradeVal = resTab.courtesyBottleUpgradePaid || resTab.reservationCourtesyBottleUpgradePaid || 0;
                            const bottleDeliveredVal = resTab.courtesyBottleDelivered !== undefined ? resTab.courtesyBottleDelivered : resTab.reservationCourtesyBottleDelivered;

                            if (!bottleNameVal) return null;

                            return (
                              <div className="bg-zinc-950 p-2.5 rounded-xl border border-amber-900/40 space-y-1.5 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-center">
                                  <span className="text-amber-400 font-bold flex items-center gap-1 text-[10px]">
                                    <Wine className="w-3.5 h-3.5" /> Botella Cortesía Almacén:
                                  </span>
                                  {bottleDeliveredVal ? (
                                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> ENTREGADA
                                    </span>
                                  ) : (
                                    <span className="bg-amber-950 text-amber-400 border border-amber-800/40 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> PENDIENTE ENTREGA
                                    </span>
                                  )}
                                </div>
                                <div className="text-white font-sans text-xs flex justify-between items-center">
                                  <span className="font-semibold">{bottleNameVal}</span>
                                  <span className="text-zinc-400 text-[10px] font-mono">
                                    {bottlePriceVal > 0 ? `${bottlePriceVal} BOB` : ''}
                                    {bottleUpgradeVal > 0 ? ` (+${bottleUpgradeVal} BOB upgrade)` : ''}
                                  </span>
                                </div>

                                {!bottleDeliveredVal && (
                                  <button
                                    onClick={() => handleDeliverCourtesyBottle(tableIdVal, resDateVal, bottleNameVal)}
                                    className="w-full mt-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-1.5 px-2.5 rounded-lg text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-amber-950/20"
                                  >
                                    <Wine className="w-3.5 h-3.5" />
                                    <span>Entregar Botella (Descontar de Almacén)</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900/60 justify-end" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                verifyReservationPayment(tableIdVal, !resVerifiedVal, resDateVal);
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${resVerifiedVal ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-emerald-600 hover:bg-emerald-500 text-black'}`}
                              title="Cambiar estado de verificación de pago en caja"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>{resVerifiedVal ? 'Desmarcar Pago' : 'Verificar Pago'}</span>
                            </button>

                            <button
                              onClick={() => {
                                updateTableStatus(tableIdVal, TableStatus.OCCUPIED);
                              }}
                              className="bg-amber-600 hover:bg-amber-500 text-black font-semibold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Check-In</span>
                            </button>

                            <button
                              onClick={() => {
                                const tableObj = tables.find(t => t.id === tableIdVal);
                                if (tableObj) {
                                  setTableToMove(tableObj);
                                  setMoveTargetDate(resDateVal);
                                  setMoveTargetTableId('');
                                }
                              }}
                              className="bg-zinc-800 hover:bg-amber-600 hover:text-black text-amber-400 border border-zinc-700 font-semibold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                              title="Cambiar/Mover esta reservación a otra mesa"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Mover Reserva</span>
                            </button>

                            <button
                              onClick={() => {
                                cancelTableReservation(tableIdVal, resDateVal);
                              }}
                              className="bg-zinc-850 hover:bg-red-950 hover:text-red-400 text-zinc-400 hover:border-red-800 border border-zinc-800 font-medium text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors"
                            >
                              Cancelar Reserva
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Table Detail Sidebar (Col span 5) */}
      <div className="xl:col-span-5 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-full shadow-xl" id="tables-detail-column">
        {selectedTable ? (
          <>
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
                <div>
                  <h3 className="font-sans font-bold text-white text-base flex items-center gap-1.5">
                    Mesa: {selectedTable.number}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                    {selectedTable.name} • PISO {selectedTable.floor || 0}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono px-2 py-1 rounded cursor-pointer"
                    value={selectedTable.status}
                    onChange={(e) => updateTableStatus(selectedTable.id, e.target.value as TableStatus)}
                  >
                    {Object.values(TableStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section Header */}
              <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl mb-4 flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Gestor de Reservaciones
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Mesa #{selectedTable.number}</span>
              </div>

              {/* RESERVATIONS SECTION */}
              <div className="space-y-4">
                {/* 1. CURRENT TABLE STATUS & ACTIVE RESERVATION DETAILS CARD */}
                {selectedTable.status === TableStatus.OCCUPIED ? (
                  <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-red-900/30 text-red-400">
                      <span className="font-bold flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        Mesa Ocupada
                      </span>
                      <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded font-bold font-sans">EN SERVICIO</span>
                    </div>

                    {selectedTable.reservationClient ? (
                      <div className="space-y-2 text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cliente Reserva:</span>
                          <span className="font-sans font-semibold text-white text-sm">{selectedTable.reservationClient}</span>
                        </div>
                        {selectedTable.reservationPhone && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Teléfono:</span>
                            <span className="text-zinc-200">{selectedTable.reservationPhone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Hora Entrada:</span>
                          <span className="text-amber-400 font-bold">{selectedTable.reservationTime || '22:00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Pax / Personas:</span>
                          <span className="text-zinc-200">{selectedTable.reservationPeople || 4} personas</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Cover / Pre-pago:</span>
                          <span className="text-zinc-200 font-bold">{selectedTable.reservationCoverPaid || 0} {config.currency}</span>
                        </div>
                        {selectedTable.notes && (
                          <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 font-sans mt-2">
                            <strong>Detalles:</strong> {selectedTable.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 font-sans">Mesa ocupada por clientes de paso o consumo directo.</p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          updateTableStatus(selectedTable.id, TableStatus.FREE);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-emerald-950/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Finalizar Mesa (Liberar)</span>
                      </button>
                      <button
                        onClick={() => {
                          setTableToMove(selectedTable);
                          setMoveTargetDate(undefined);
                          setMoveTargetTableId('');
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        title="Mover esta mesa/reserva a otra mesa"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Mover</span>
                      </button>
                      {selectedTable.reservationClient && (
                        <button
                          onClick={handleCancelReservationClick}
                          className="bg-zinc-900 hover:bg-red-950/30 hover:border-red-900 border border-zinc-800 text-zinc-400 hover:text-red-400 py-2.5 px-3 rounded-xl cursor-pointer"
                          title="Eliminar datos de reserva"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : selectedTable.status === TableStatus.RESERVED ? (
                  <div className="bg-amber-950/30 border border-amber-600/30 rounded-xl p-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-amber-900/30 text-amber-400">
                      <span className="font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Reserva Confirmada
                      </span>
                      <span className="bg-amber-500 text-black text-[9px] px-1.5 py-0.5 rounded font-bold font-sans">RESERVADA</span>
                    </div>

                    <div className="space-y-2 text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Cliente:</span>
                        <span className="font-sans font-semibold text-white text-sm">{selectedTable.reservationClient || 'No indicado'}</span>
                      </div>
                      {selectedTable.reservationPhone && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Teléfono:</span>
                          <span className="text-zinc-200">{selectedTable.reservationPhone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Fecha/Hora:</span>
                        <span className="text-amber-400 font-bold">{formatDateDDMMAAAA(selectedTable.reservationDate) || 'Hoy'} - {selectedTable.reservationTime || '22:00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Pax / Personas:</span>
                        <span className="text-zinc-200">{selectedTable.reservationPeople || 4} personas</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Cover / Pago:</span>
                        <span className="text-zinc-200 font-bold">{selectedTable.reservationCoverPaid || 0} {config.currency}</span>
                      </div>
                      {selectedTable.notes && (
                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 font-sans mt-2">
                          <strong>Detalles:</strong> {selectedTable.notes}
                        </div>
                      )}

                      {/* Courtesy Bottle Section for Reserved Table */}
                      {selectedTable.reservationCourtesyBottleName && (
                        <div className="bg-zinc-950 border border-amber-900/50 p-3 rounded-xl space-y-2 mt-2 font-mono">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[11px]">
                              <Wine className="w-4 h-4" />
                              Botella Cortesía Almacén:
                            </span>
                            {selectedTable.reservationCourtesyBottleDelivered ? (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> ENTREGADA
                              </span>
                            ) : (
                              <span className="bg-amber-950 text-amber-400 border border-amber-800/40 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" /> PENDIENTE
                              </span>
                            )}
                          </div>
                          <div className="text-white font-sans font-semibold text-xs flex justify-between items-center">
                            <span>{selectedTable.reservationCourtesyBottleName}</span>
                            <span className="text-zinc-400 font-mono text-[11px]">
                              {selectedTable.reservationCourtesyBottlePrice ? `${selectedTable.reservationCourtesyBottlePrice} BOB` : ''}
                              {selectedTable.reservationCourtesyBottleUpgradePaid ? ` (+${selectedTable.reservationCourtesyBottleUpgradePaid} BOB upgrade)` : ''}
                            </span>
                          </div>

                          {!selectedTable.reservationCourtesyBottleDelivered && (
                            <button
                              onClick={() => handleDeliverCourtesyBottle(selectedTable.id, selectedTable.reservationDate, selectedTable.reservationCourtesyBottleName)}
                              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 px-3 rounded-lg text-xs font-mono flex items-center justify-center gap-2 cursor-pointer shadow mt-1"
                            >
                              <Wine className="w-4 h-4" />
                              <span>Entregar Botella (Descontar de Almacén)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={handleReservationCheckIn}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                        >
                          <Check className="w-4 h-4" />
                          <span>Check-In (Ocupar)</span>
                        </button>
                        <button
                          onClick={() => {
                            setTableToMove(selectedTable);
                            setMoveTargetDate(selectedTable.reservationDate);
                            setMoveTargetTableId('');
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow"
                          title="Mover reservación a otra mesa"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>Mover</span>
                        </button>
                        <button
                          onClick={handleCancelReservationClick}
                          className="bg-zinc-900 hover:bg-red-950/30 hover:border-red-900 border border-zinc-800 text-zinc-400 hover:text-red-400 py-2 px-3 rounded-xl cursor-pointer"
                          title="Eliminar reservación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          updateTableStatus(selectedTable.id, TableStatus.FREE);
                        }}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-900/50 py-1.5 rounded-xl text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Finalizar / Liberar Mesa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-800/30 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      Mesa Disponible ({selectedTable.status})
                    </span>
                    <span className="text-[10px] text-zinc-500">Lista para asignación</span>
                  </div>
                )}

                {/* 2. OTHER RESERVATIONS LIST FOR THIS TABLE */}
                {(() => {
                  const activeResList = (selectedTable.reservations || []).filter(r => r.status !== 'cancelado');
                  if (activeResList.length === 0) return null;
                  return (
                    <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                        Reservas Registradas para Mesa #{selectedTable.number} ({activeResList.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {activeResList.map((r, idx) => (
                          <div key={r.id || idx} className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                            <div>
                              <span className="text-white font-sans font-medium block">{r.clientName}</span>
                              <span className="text-[10px] text-amber-400">{formatDateDDMMAAAA(r.date)} • {r.time} ({r.people} pax)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => verifyReservationPayment(selectedTable.id, !r.paymentVerified, r.date)}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${r.paymentVerified ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950 text-amber-400 border border-amber-800/40'}`}
                              >
                                {r.paymentVerified ? 'Pagado' : 'Pendiente'}
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar la reserva de ${r.clientName} (${formatDateDDMMAAAA(r.date)})?`)) {
                                    cancelTableReservation(selectedTable.id, r.date);
                                  }
                                }}
                                className="text-zinc-500 hover:text-red-400 p-1.5 cursor-pointer transition-colors"
                                title="Eliminar esta reserva"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. CREATE RESERVATION FORM (Allowing different dates!) */}
                <div className="pt-2 border-t border-zinc-900">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Programar Reservación
                    </h4>
                    <button
                      type="button"
                      onClick={handleNewResForAnotherDate}
                      className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-amber-400 px-2 py-1 rounded-lg border border-zinc-800 cursor-pointer flex items-center gap-1"
                      title="Limpiar datos para agendar en otra fecha"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Otra Fecha</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveReservation} className="space-y-3 font-mono text-xs">
                    {!canManageReservations && (
                      <div className="bg-amber-950/40 border border-amber-600/40 p-2.5 rounded-xl text-amber-300 text-[11px] flex items-center gap-2 font-mono">
                        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>🔒 Acceso Restringido: Únicamente el personal de Gerencia y Caja puede realizar reservaciones.</span>
                      </div>
                    )}

                    {/* Search Client from Directory Autocomplete */}
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Buscar en Directorio (Opcional)</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar cliente por nombre..."
                          value={searchClientQuery}
                          onChange={(e) => setSearchClientQuery(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {searchClientQuery.trim() && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg mt-1 max-h-[140px] overflow-y-auto divide-y divide-zinc-950 z-10 relative">
                          {clients
                            .filter(c => (c.name || '').toLowerCase().includes(searchClientQuery.toLowerCase()))
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectClientFromDir(c)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-600 hover:text-black font-sans text-xs transition-colors flex justify-between items-center cursor-pointer"
                              >
                                <div>
                                  <span className="font-semibold">{c.name}</span>
                                  <span className="text-[10px] block opacity-80">{c.phone || 'Sin teléfono'}</span>
                                </div>
                                <span className="text-[10px] font-mono opacity-80">{c.points} pts</span>
                              </button>
                            ))}
                          {clients.filter(c => (c.name || '').toLowerCase().includes(searchClientQuery.toLowerCase())).length === 0 && (
                            <div className="p-3 text-center text-zinc-600">Ningún cliente registrado coincide</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Nombre Cliente</label>
                        <input
                          type="text"
                          required
                          placeholder="Nombre del cliente"
                          value={resClient}
                          onChange={(e) => setResClient(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Teléfono</label>
                        <input
                          type="text"
                          placeholder="Teléfono/WhatsApp"
                          value={resPhone}
                          onChange={(e) => setResPhone(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-amber-400 font-bold uppercase mb-1">Fecha de Reserva</label>
                        <input
                          type="date"
                          required
                          value={resDate}
                          onChange={(e) => setResDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-amber-600/50 text-xs text-amber-400 font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Hora Entrada</label>
                        <input
                          type="text"
                          required
                          value={resTime}
                          onChange={(e) => setResTime(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Personas (Pax)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={resPeople}
                          onChange={(e) => setResPeople(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Prepago (BOB)</label>
                        <input
                          type="number"
                          min="0"
                          value={resCoverPaid}
                          onChange={(e) => setResCoverPaid(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-center"
                        />
                      </div>
                    </div>

                    {/* Payment verification toggle */}
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-sans font-semibold text-white block text-xs">Verificación de Pago en Caja</span>
                          <span className="text-[10px] text-zinc-500 font-mono">El cajero ya recibió el prepago/cover</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={resPaymentVerified}
                        onChange={(e) => setResPaymentVerified(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Notas / Ocasión Especial</label>
                      <textarea
                        placeholder="Cumpleaños, zona vip, cortesia..."
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 h-14 resize-none"
                      />
                    </div>

                    {/* Botella Cortesía de Almacén Central */}
                    <div className="bg-zinc-900/90 border border-amber-900/40 p-3 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono text-amber-400 font-bold uppercase flex items-center gap-1.5">
                          <Wine className="w-3.5 h-3.5 text-amber-500" />
                          Botella Cortesía (Almacén Central)
                        </label>
                        <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded font-mono">
                          Descuento Directo
                        </span>
                      </div>

                      <div>
                        <select
                          value={resCourtesyBottleId}
                          onChange={(e) => {
                            setResCourtesyBottleId(e.target.value);
                            if (!e.target.value) setResCourtesyBottleUpgradePaid(0);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white px-2.5 py-2 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
                        >
                          <option value="">-- Sin Botella de Cortesía --</option>
                          {products
                            .filter(p => p.isActive)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(p => {
                              const stockVal = p.quantity ?? 0;
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.category ? `[${p.category}] ` : ''}{p.name} (Stock Almacén: {stockVal} bot.) - {p.price} BOB
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      {resCourtesyBottleId && (
                        <div className="space-y-2 pt-1 border-t border-zinc-800/80 font-mono">
                          {(() => {
                            const prod = products.find(p => p.id === resCourtesyBottleId);
                            if (!prod) return null;
                            return (
                              <div className="bg-zinc-950 p-2 rounded-lg border border-amber-950/60 flex justify-between items-center text-[11px]">
                                <div>
                                  <span className="text-white font-sans font-medium block">{prod.name}</span>
                                  <span className="text-[10px] text-zinc-400">
                                    Precio Almacén: <strong className="text-amber-400">{prod.price} BOB</strong> | Stock Central: <strong className={prod.quantity > 0 ? "text-emerald-400" : "text-red-400"}>{prod.quantity} botellas</strong>
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-mono text-zinc-400 uppercase">
                                Monto Adicional / Upgrade Pagado (BOB)
                              </label>
                              <span className="text-[9px] text-zinc-500 font-sans">
                                (Si aumentó dinero por botella superior)
                              </span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={resCourtesyBottleUpgradePaid}
                              onChange={(e) => setResCourtesyBottleUpgradePaid(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!canManageReservations}
                      className={`w-full font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                        canManageReservations 
                          ? 'bg-amber-600 hover:bg-amber-500 text-black cursor-pointer shadow shadow-amber-950/30' 
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {canManageReservations ? <Calendar className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span>Guardar Reserva ({formatDateDDMMAAAA(resDate)})</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-xs gap-3 p-6 text-center border border-zinc-900 border-dashed rounded-2xl bg-zinc-950/20">
            <Map className="w-10 h-10 text-zinc-800" />
            <div>
              <span className="block text-zinc-400 font-sans font-semibold mb-1">Mesa no seleccionada</span>
              <span className="text-[10px] text-zinc-500 block">Seleccione cualquier mesa de la distribución interactiva o de la lista de reservas para gestionar sus reservaciones.</span>
            </div>
            <span className="text-[9px] text-amber-600 uppercase tracking-widest font-bold bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded-md">Ámbar Casino-Club</span>
          </div>
        )}
      </div>

      {/* MODAL MOVER MESA / RESERVA */}
      {tableToMove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-600/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-900">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Mover Mesa / Reservación
              </h3>
              <button
                onClick={() => setTableToMove(null)}
                className="text-zinc-500 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Mesa de Origen:</span>
                <strong className="text-white">Mesa #{tableToMove.number} (Piso {tableToMove.floor || 0})</strong>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Elemento a Mover:</span>
                <span className="text-amber-400 font-bold uppercase">
                  {moveTargetDate ? `Reserva del ${formatDateDDMMAAAA(moveTargetDate)}` : 'Servicio / Consumo Actual de Hoy'}
                </span>
              </div>
              {tableToMove.reservationClient && (
                <div className="flex justify-between text-zinc-400">
                  <span>Cliente Reserva:</span>
                  <span className="text-white font-sans">{tableToMove.reservationClient}</span>
                </div>
              )}
              {(!moveTargetDate || moveTargetDate === new Date().toISOString().split('T')[0]) && tableToMove.consumption && tableToMove.consumption.length > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Consumo Activo:</span>
                  <span className="text-emerald-400 font-bold">
                    {tableToMove.consumption.reduce((acc, c) => acc + c.subtotal, 0)} {config.currency} ({tableToMove.consumption.length} ítems)
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-sans flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Las reservaciones de esta mesa para otras fechas se mantendrán protegidas en la mesa original.</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-zinc-300 uppercase">
                Seleccionar Mesa / VIP Box de Destino:
              </label>
              <select
                value={moveTargetTableId}
                onChange={(e) => setMoveTargetTableId(e.target.value)}
                className="w-full bg-zinc-900 border border-amber-600/60 text-white font-mono text-xs p-3 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="">-- Seleccionar Mesa de Destino --</option>
                {tables
                  .filter(t => t.id !== tableToMove.id)
                  .sort((a, b) => {
                    const numA = parseInt(a.number) || 0;
                    const numB = parseInt(b.number) || 0;
                    return numA - numB;
                  })
                  .map(t => {
                    const dateBeingMoved = moveTargetDate || new Date().toISOString().split('T')[0];
                    const tResList = t.reservations ? t.reservations : [];
                    const isReservedForDate = tResList.some(r => r.date === dateBeingMoved && r.status !== 'cancelado') ||
                      (t.reservationDate === dateBeingMoved && Boolean(t.reservationClient) && t.reservationStatus !== 'cancelado');
                    const isOccupiedNow = dateBeingMoved === new Date().toISOString().split('T')[0] && (t.status === TableStatus.OCCUPIED || (t.consumption && t.consumption.length > 0));
                    const isUnavailable = isReservedForDate || isOccupiedNow;

                    let statusBadge = `[${t.status === TableStatus.FREE ? 'LIBRE' : t.status}]`;
                    if (isReservedForDate) statusBadge = `🚫 [RESERVADA el ${formatDateDDMMAAAA(dateBeingMoved)}]`;
                    else if (isOccupiedNow) statusBadge = `🚫 [OCUPADA EN ATENCIÓN]`;

                    return (
                      <option key={t.id} value={t.id} disabled={isUnavailable}>
                        Mesa #{t.number} ({t.name}) - Piso {t.floor || 0} {statusBadge}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTableToMove(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 py-2.5 rounded-xl font-mono text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMoveTable}
                disabled={!moveTargetTableId}
                className={`flex-1 font-mono text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow ${
                  moveTargetTableId 
                    ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirmar Reubicación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
