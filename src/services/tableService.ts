/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { doc, runTransaction, updateDoc, setDoc } from 'firebase/firestore';
import { Table, TableReservation, CartItem, TableStatus, TableStatus as StatusEnum, Employee, MovementType, User } from '../types';
import { formatDateDDMMAAAA } from '../utils/dateUtils';

/**
 * Updates a table's status, waiter, and opened date atomically.
 */
export async function updateTableStatusInFirestore(
  tableId: string,
  status: TableStatus,
  waiterId?: string
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) {
      throw new Error('La mesa no existe.');
    }

    const t = tableDoc.data() as Table;
    let waiterName = t.currentWaiterName;
    
    if (waiterId) {
      const waiterRef = doc(db, 'employees', waiterId);
      const waiterDoc = await transaction.get(waiterRef);
      if (waiterDoc.exists()) {
        const emp = waiterDoc.data() as Employee;
        waiterName = emp.name;
      }
    }

    const updateData: any = {
      status,
      currentWaiterId: waiterId !== undefined ? waiterId : (t.currentWaiterId || ''),
      currentWaiterName: waiterName || t.currentWaiterName || '',
      openedAt: status === TableStatus.OCCUPIED ? new Date().toISOString() : (status === TableStatus.FREE ? '' : (t.openedAt || ''))
    };

    if (status === TableStatus.FREE) {
      updateData.consumption = [];
      updateData.reservationClient = '';
      updateData.reservationPhone = '';
      updateData.reservationTime = '';
      updateData.reservationDate = '';
      updateData.reservationPeople = 0;
      updateData.reservationCoverPaid = 0;
      updateData.reservationPaymentVerified = false;
      updateData.reservationStatus = 'atendido';
      updateData.notes = '';
      updateData.currentWaiterId = '';
      updateData.currentWaiterName = '';
      updateData.openedAt = '';
    }

    transaction.update(tableRef, updateData);
  });
}

/**
 * Adds an item to a Table's consumption tab atomically.
 */
export async function addConsumptionToTableInFirestore(
  tableId: string,
  item: CartItem
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) {
      throw new Error('La mesa no existe.');
    }

    const t = tableDoc.data() as Table;
    const copyConsumption = [...(t.consumption || [])];

    // Check if item already exists with matching shot size
    const existingIndex = copyConsumption.findIndex(c => 
      c.product.id === item.product.id && 
      c.selectedShotMl === item.selectedShotMl
    );

    if (existingIndex > -1) {
      copyConsumption[existingIndex] = {
        ...copyConsumption[existingIndex],
        quantity: copyConsumption[existingIndex].quantity + item.quantity,
        subtotal: copyConsumption[existingIndex].subtotal + item.subtotal
      };
    } else {
      copyConsumption.push(item);
    }

    transaction.update(tableRef, {
      status: TableStatus.OCCUPIED,
      consumption: copyConsumption,
      openedAt: t.openedAt || new Date().toISOString()
    });
  });
}

/**
 * Removes an item or shot from a physical table's active consumption tab.
 */
export async function removeConsumptionFromTableInFirestore(
  tableId: string,
  productId: string,
  shotMl?: number
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) {
      throw new Error('La mesa no existe.');
    }

    const t = tableDoc.data() as Table;
    const consumption = t.consumption || [];
    const index = consumption.findIndex(c => c.product.id === productId && c.selectedShotMl === shotMl);
    
    if (index > -1) {
      const updatedCon = [...consumption];
      const item = updatedCon[index];
      
      if (item.quantity > 1) {
        const singlePrice = item.subtotal / item.quantity;
        updatedCon[index] = {
          ...item,
          quantity: item.quantity - 1,
          subtotal: item.subtotal - singlePrice
        };
      } else {
        updatedCon.splice(index, 1);
      }

      // Check if table has an active reservation saved
      const hasReservation = Boolean(t.reservationClient && t.reservationClient.trim().length > 0) || Boolean(t.reservations && t.reservations.some(r => r.status !== 'cancelado'));

      let nextStatus = t.status;
      if (updatedCon.length === 0) {
        nextStatus = hasReservation ? TableStatus.RESERVED : TableStatus.FREE;
      }

      transaction.update(tableRef, {
        consumption: updatedCon,
        status: nextStatus
      });
    }
  });
}

/**
 * Transfers whole consumption tabs from one physical table to another VIP Box.
 */
export async function transferConsumptionInFirestore(
  fromTableId: string,
  toTableId: string
): Promise<void> {
  const fromTableRef = doc(db, 'tables', fromTableId);
  const toTableRef = doc(db, 'tables', toTableId);

  await runTransaction(db, async (transaction) => {
    const fromDoc = await transaction.get(fromTableRef);
    const toDoc = await transaction.get(toTableRef);

    if (!fromDoc.exists() || !toDoc.exists()) {
      throw new Error('Una o ambas mesas no existen.');
    }

    const fromTab = fromDoc.data() as Table;
    const toTab = toDoc.data() as Table;

    const fromHasReservation = Boolean(fromTab.reservationClient && fromTab.reservationClient.trim().length > 0);

    // Reset old table
    transaction.update(fromTableRef, {
      status: fromHasReservation ? TableStatus.RESERVED : TableStatus.FREE,
      consumption: [],
      currentWaiterId: '',
      currentWaiterName: '',
      openedAt: ''
    });

    // Merge onto target table
    const mergedConsumption = [...(toTab.consumption || []), ...(fromTab.consumption || [])];
    transaction.update(toTableRef, {
      status: TableStatus.OCCUPIED,
      consumption: mergedConsumption,
      currentWaiterId: toTab.currentWaiterId || fromTab.currentWaiterId || '',
      currentWaiterName: toTab.currentWaiterName || fromTab.currentWaiterName || '',
      openedAt: toTab.openedAt || fromTab.openedAt || new Date().toISOString()
    });
  });
}

/**
 * Clears physical table consumption once billed.
 */
export async function clearTableConsumptionInFirestore(tableId: string): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  
  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) return;

    const t = tableDoc.data() as Table;
    const hasReservation = Boolean(t.reservationClient && t.reservationClient.trim().length > 0) || Boolean(t.reservations && t.reservations.some(r => r.status !== 'cancelado'));
    const nextStatus = hasReservation ? TableStatus.RESERVED : TableStatus.FREE;

    transaction.update(tableRef, {
      status: nextStatus,
      consumption: [],
      currentWaiterId: '',
      currentWaiterName: '',
      openedAt: ''
    });
  });
}

/**
 * Saves a reservation for a table in Firestore supporting multi-date reservations.
 */
export async function saveTableReservationInFirestore(
  tableId: string,
  clientName: string,
  phone: string,
  time: string,
  people: number,
  coverPaid: number,
  notes: string,
  date?: string,
  paymentVerified?: boolean,
  status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado' = 'pendiente',
  courtesyBottleId?: string,
  courtesyBottleName?: string,
  courtesyBottlePrice?: number,
  courtesyBottleUpgradePaid?: number,
  courtesyBottleDelivered?: boolean
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  const targetDate = date || new Date().toISOString().split('T')[0];
  const todayDateStr = new Date().toISOString().split('T')[0];

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) return;
    const t = tableDoc.data() as Table;

    let currentResList: TableReservation[] = t.reservations ? [...t.reservations] : [];

    // Convert legacy reservation if present
    if (currentResList.length === 0 && t.reservationClient && t.reservationClient.trim().length > 0) {
      currentResList.push({
        id: `${t.id}_legacy`,
        tableId: t.id,
        tableNumber: t.number,
        clientName: t.reservationClient,
        phone: t.reservationPhone || '',
        time: t.reservationTime || '22:00',
        date: t.reservationDate || todayDateStr,
        people: t.reservationPeople || 4,
        coverPaid: t.reservationCoverPaid || 0,
        paymentVerified: Boolean(t.reservationPaymentVerified),
        status: t.reservationStatus || 'pendiente',
        notes: t.notes || '',
        courtesyBottleId: t.reservationCourtesyBottleId,
        courtesyBottleName: t.reservationCourtesyBottleName,
        courtesyBottlePrice: t.reservationCourtesyBottlePrice,
        courtesyBottleUpgradePaid: t.reservationCourtesyBottleUpgradePaid,
        courtesyBottleDelivered: t.reservationCourtesyBottleDelivered
      });
    }

    const existingIndex = currentResList.findIndex(r => r.date === targetDate && r.status !== 'cancelado');
    const existingRes = existingIndex >= 0 ? currentResList[existingIndex] : null;

    const newRes: TableReservation = {
      id: existingRes ? existingRes.id : `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tableId: t.id,
      tableNumber: t.number,
      clientName,
      phone,
      time,
      date: targetDate,
      people,
      coverPaid,
      paymentVerified: paymentVerified !== undefined ? paymentVerified : coverPaid > 0,
      status,
      notes: notes || `Reservada para ${clientName} a las ${time} (${targetDate})`,
      createdAt: existingRes?.createdAt || new Date().toISOString(),
      courtesyBottleId,
      courtesyBottleName,
      courtesyBottlePrice,
      courtesyBottleUpgradePaid,
      courtesyBottleDelivered: courtesyBottleDelivered !== undefined ? courtesyBottleDelivered : (existingRes?.courtesyBottleDelivered || false)
    };

    if (existingIndex >= 0) {
      currentResList[existingIndex] = newRes;
    } else {
      currentResList.push(newRes);
    }

    // Active reservation for today or the newly saved reservation
    const todayRes = currentResList.find(r => r.date === todayDateStr && r.status !== 'cancelado') || newRes;

    const updates: any = {
      reservations: currentResList,
      reservationClient: todayRes.clientName,
      reservationPhone: todayRes.phone || '',
      reservationTime: todayRes.time,
      reservationDate: todayRes.date,
      reservationPeople: todayRes.people,
      reservationCoverPaid: todayRes.coverPaid,
      reservationPaymentVerified: todayRes.paymentVerified,
      reservationStatus: todayRes.status,
      notes: todayRes.notes || '',
      reservationCourtesyBottleId: todayRes.courtesyBottleId || '',
      reservationCourtesyBottleName: todayRes.courtesyBottleName || '',
      reservationCourtesyBottlePrice: todayRes.courtesyBottlePrice || 0,
      reservationCourtesyBottleUpgradePaid: todayRes.courtesyBottleUpgradePaid || 0,
      reservationCourtesyBottleDelivered: Boolean(todayRes.courtesyBottleDelivered)
    };

    if (targetDate === todayDateStr && (!t.consumption || t.consumption.length === 0)) {
      updates.status = TableStatus.RESERVED;
    }

    transaction.update(tableRef, updates);
  });
}

/**
 * Delivers the reservation's courtesy bottle from Central Warehouse.
 * Decrements 1 unit of product stock and logs inventory Kardex movement (EXIT).
 */
export async function deliverReservationCourtesyBottleInFirestore(
  tableId: string,
  targetDate?: string,
  currentUser?: User | null
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  const todayDateStr = new Date().toISOString().split('T')[0];

  let bottleToDeduct: { id: string; name: string; tableNumber: string; clientName: string } | null = null;

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) throw new Error('Mesa no encontrada.');
    const t = tableDoc.data() as Table;

    let currentResList: TableReservation[] = t.reservations ? [...t.reservations] : [];
    const searchDate = targetDate || todayDateStr;

    let targetResIndex = currentResList.findIndex(r => r.date === searchDate && r.status !== 'cancelado');
    if (targetResIndex === -1 && t.reservationClient && (t.reservationDate === searchDate || !targetDate)) {
      currentResList.push({
        id: `${t.id}_legacy`,
        tableId: t.id,
        tableNumber: t.number,
        clientName: t.reservationClient,
        phone: t.reservationPhone || '',
        time: t.reservationTime || '22:00',
        date: t.reservationDate || todayDateStr,
        people: t.reservationPeople || 4,
        coverPaid: t.reservationCoverPaid || 0,
        paymentVerified: Boolean(t.reservationPaymentVerified),
        status: t.reservationStatus || 'pendiente',
        notes: t.notes || '',
        courtesyBottleId: t.reservationCourtesyBottleId,
        courtesyBottleName: t.reservationCourtesyBottleName,
        courtesyBottlePrice: t.reservationCourtesyBottlePrice,
        courtesyBottleUpgradePaid: t.reservationCourtesyBottleUpgradePaid,
        courtesyBottleDelivered: t.reservationCourtesyBottleDelivered
      });
      targetResIndex = currentResList.length - 1;
    }

    if (targetResIndex === -1) {
      throw new Error(`No se encontró una reservación activa para la fecha ${formatDateDDMMAAAA(searchDate)} en la Mesa #${t.number}.`);
    }

    const res = currentResList[targetResIndex];
    if (!res.courtesyBottleId) {
      throw new Error(`La reservación no tiene seleccionada ninguna botella de cortesía del Almacén Central.`);
    }
    if (res.courtesyBottleDelivered) {
      throw new Error(`La botella de cortesía "${res.courtesyBottleName || 'de Almacén'}" ya fue entregada anteriormente.`);
    }

    // Mark as delivered
    currentResList[targetResIndex] = {
      ...res,
      courtesyBottleDelivered: true
    };

    bottleToDeduct = {
      id: res.courtesyBottleId,
      name: res.courtesyBottleName || 'Botella de Cortesía',
      tableNumber: t.number,
      clientName: res.clientName
    };

    const isToday = searchDate === todayDateStr || searchDate === t.reservationDate;
    const updates: any = {
      reservations: currentResList
    };
    if (isToday) {
      updates.reservationCourtesyBottleDelivered = true;
    }

    transaction.update(tableRef, updates);
  });

  if (bottleToDeduct) {
    const { adjustStockInFirestore } = await import('./productService');
    await adjustStockInFirestore(
      bottleToDeduct.id,
      1,
      MovementType.EXIT,
      `Entrega Botella Cortesía Reserva Mesa #${bottleToDeduct.tableNumber} (${bottleToDeduct.clientName})`,
      currentUser
    );
  }
}

/**
 * Toggles or sets payment verification status for a table reservation.
 */
export async function verifyReservationPaymentInFirestore(tableId: string, verified: boolean, targetDate?: string): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  const todayDateStr = new Date().toISOString().split('T')[0];

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) return;
    const t = tableDoc.data() as Table;

    let currentResList: TableReservation[] = t.reservations ? [...t.reservations] : [];

    currentResList = currentResList.map(r => {
      if (!targetDate || r.date === targetDate) {
        return { ...r, paymentVerified: verified, status: verified ? 'pagado' : 'pendiente' };
      }
      return r;
    });

    const activeToday = currentResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');

    const updates: any = {
      reservations: currentResList,
      reservationPaymentVerified: verified,
      reservationStatus: verified ? 'pagado' : 'pendiente'
    };

    if (activeToday) {
      updates.reservationPaymentVerified = activeToday.paymentVerified;
      updates.reservationStatus = activeToday.status;
    }

    transaction.update(tableRef, updates);
  });
}

/**
 * Updates reservation service status (e.g., 'atendido', 'confirmado', 'cancelado').
 */
export async function updateReservationStatusInFirestore(
  tableId: string, 
  status: 'pendiente' | 'confirmado' | 'pagado' | 'atendido' | 'cancelado',
  targetDate?: string
): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  const todayDateStr = new Date().toISOString().split('T')[0];

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) return;
    const t = tableDoc.data() as Table;

    let currentResList: TableReservation[] = t.reservations ? [...t.reservations] : [];

    currentResList = currentResList.map(r => {
      if (!targetDate || r.date === targetDate) {
        return { ...r, status };
      }
      return r;
    });

    const updates: any = {
      reservations: currentResList,
      reservationStatus: status
    };

    transaction.update(tableRef, updates);
  });
}

/**
 * Cancels or clears a reservation for a table in Firestore.
 */
export async function cancelTableReservationInFirestore(tableId: string, targetDate?: string): Promise<void> {
  const tableRef = doc(db, 'tables', tableId);
  const todayDateStr = new Date().toISOString().split('T')[0];

  await runTransaction(db, async (transaction) => {
    const tableDoc = await transaction.get(tableRef);
    if (!tableDoc.exists()) return;
    const t = tableDoc.data() as Table;

    let currentResList: TableReservation[] = t.reservations ? [...t.reservations] : [];

    if (currentResList.length === 0 && t.reservationClient && t.reservationClient.trim().length > 0) {
      currentResList.push({
        id: `${t.id}_legacy`,
        tableId: t.id,
        tableNumber: t.number,
        clientName: t.reservationClient,
        phone: t.reservationPhone || '',
        time: t.reservationTime || '22:00',
        date: t.reservationDate || todayDateStr,
        people: t.reservationPeople || 4,
        coverPaid: t.reservationCoverPaid || 0,
        paymentVerified: Boolean(t.reservationPaymentVerified),
        status: t.reservationStatus || 'pendiente'
      });
    }

    if (targetDate) {
      currentResList = currentResList.filter(r => r.date !== targetDate);
    } else {
      currentResList = [];
    }

    const updates: any = {
      reservations: currentResList
    };

    const isCancelingTodayOrAll = !targetDate || targetDate === todayDateStr || targetDate === t.reservationDate;

    if (isCancelingTodayOrAll) {
      const activeToday = currentResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');
      if (activeToday) {
        updates.reservationClient = activeToday.clientName;
        updates.reservationPhone = activeToday.phone || '';
        updates.reservationTime = activeToday.time;
        updates.reservationDate = activeToday.date;
        updates.reservationPeople = activeToday.people;
        updates.reservationCoverPaid = activeToday.coverPaid;
        updates.reservationPaymentVerified = activeToday.paymentVerified;
        updates.reservationStatus = activeToday.status;
        updates.notes = activeToday.notes || '';
      } else {
        updates.reservationClient = '';
        updates.reservationPhone = '';
        updates.reservationTime = '';
        updates.reservationDate = '';
        updates.reservationPeople = 0;
        updates.reservationCoverPaid = 0;
        updates.reservationPaymentVerified = false;
        updates.reservationStatus = 'cancelado';
        updates.notes = '';

        if (t.status === TableStatus.RESERVED && (!t.consumption || t.consumption.length === 0)) {
          updates.status = TableStatus.FREE;
        }
      }
    }

    transaction.update(tableRef, updates);
  });
}

/**
 * Moves a table's active session/reservation or a specific date reservation from one table to another.
 * Keeps reservations for other dates intact on their respective tables.
 */
export async function moveTableInFirestore(
  fromTableId: string, 
  toTableId: string, 
  targetDate?: string
): Promise<void> {
  const fromTableRef = doc(db, 'tables', fromTableId);
  const toTableRef = doc(db, 'tables', toTableId);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const moveDate = targetDate || todayDateStr;

  await runTransaction(db, async (transaction) => {
    const fromDoc = await transaction.get(fromTableRef);
    const toDoc = await transaction.get(toTableRef);

    if (!fromDoc.exists() || !toDoc.exists()) {
      throw new Error('Una o ambas mesas no existen.');
    }

    const fromTab = fromDoc.data() as Table;
    const toTab = toDoc.data() as Table;

    // RULE 4: Cannot move if source table is currently OCCUPIED or has active consumption
    if (fromTab.status === TableStatus.OCCUPIED || (fromTab.consumption && fromTab.consumption.length > 0)) {
      throw new Error(`No se puede mover la Mesa #${fromTab.number} porque se encuentra actualmente Ocupada o en atención.`);
    }

    // Helper to normalize reservation lists
    const getNormalizedReservations = (t: Table): TableReservation[] => {
      let list = t.reservations ? [...t.reservations] : [];
      if (list.length === 0 && t.reservationClient && t.reservationClient.trim().length > 0) {
        list.push({
          id: `${t.id}_legacy`,
          tableId: t.id,
          tableNumber: t.number,
          clientName: t.reservationClient,
          phone: t.reservationPhone || '',
          time: t.reservationTime || '22:00',
          date: t.reservationDate || todayDateStr,
          people: t.reservationPeople || 4,
          coverPaid: t.reservationCoverPaid || 0,
          paymentVerified: Boolean(t.reservationPaymentVerified),
          status: t.reservationStatus || 'pendiente',
          notes: t.notes || ''
        });
      }
      return list;
    };

    const fromResList = getNormalizedReservations(fromTab);
    const toResList = getNormalizedReservations(toTab);

    // RULE 3: Cannot move to target table if it already has an active reservation for moveDate
    const isToReservedOnDate = toResList.some(r => r.date === moveDate && r.status !== 'cancelado') ||
      (toTab.reservationDate === moveDate && Boolean(toTab.reservationClient) && toTab.reservationStatus !== 'cancelado');

    if (isToReservedOnDate) {
      throw new Error(`La Mesa #${toTab.number} de destino ya cuenta con una reserva activa para la fecha ${formatDateDDMMAAAA(moveDate)}.`);
    }

    if (moveDate === todayDateStr && (toTab.status === TableStatus.OCCUPIED || (toTab.consumption && toTab.consumption.length > 0))) {
      throw new Error(`La Mesa #${toTab.number} de destino está actualmente Ocupada.`);
    }

    // Identify single reservation to move
    const resToMove = fromResList.find(r => r.date === moveDate && r.status !== 'cancelado') || 
      (fromTab.reservationDate === moveDate && fromTab.reservationClient ? {
        id: `${fromTab.id}_legacy`,
        tableId: fromTab.id,
        tableNumber: fromTab.number,
        clientName: fromTab.reservationClient,
        phone: fromTab.reservationPhone || '',
        time: fromTab.reservationTime || '22:00',
        date: moveDate,
        people: fromTab.reservationPeople || 4,
        coverPaid: fromTab.reservationCoverPaid || 0,
        paymentVerified: Boolean(fromTab.reservationPaymentVerified),
        status: fromTab.reservationStatus || 'pendiente',
        notes: fromTab.notes || ''
      } : null);

    // RULE 1: KEEP all reservations for OTHER dates intact on fromTab
    const newFromResList = fromResList.filter(r => !(r.date === moveDate && r.status !== 'cancelado'));
    
    // KEEP all reservations for OTHER dates intact on toTab
    const newToResList = [...toResList.filter(r => !(r.date === moveDate && r.status !== 'cancelado'))];
    if (resToMove) {
      newToResList.push({
        ...resToMove,
        tableId: toTab.id,
        tableNumber: toTab.number
      });
    }

    // Recalculate fromTab updates
    const activeTodayFrom = newFromResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');
    const fromUpdates: any = {
      reservations: newFromResList
    };

    if (activeTodayFrom) {
      fromUpdates.status = TableStatus.RESERVED;
      fromUpdates.reservationClient = activeTodayFrom.clientName;
      fromUpdates.reservationPhone = activeTodayFrom.phone || '';
      fromUpdates.reservationTime = activeTodayFrom.time;
      fromUpdates.reservationDate = activeTodayFrom.date;
      fromUpdates.reservationPeople = activeTodayFrom.people;
      fromUpdates.reservationCoverPaid = activeTodayFrom.coverPaid;
      fromUpdates.reservationPaymentVerified = activeTodayFrom.paymentVerified;
      fromUpdates.reservationStatus = activeTodayFrom.status;
      fromUpdates.notes = activeTodayFrom.notes || '';
    } else {
      fromUpdates.status = TableStatus.FREE;
      fromUpdates.consumption = [];
      fromUpdates.reservationClient = '';
      fromUpdates.reservationPhone = '';
      fromUpdates.reservationTime = '';
      fromUpdates.reservationDate = '';
      fromUpdates.reservationPeople = 0;
      fromUpdates.reservationCoverPaid = 0;
      fromUpdates.reservationPaymentVerified = false;
      fromUpdates.reservationStatus = 'cancelado';
      fromUpdates.notes = '';
      fromUpdates.currentWaiterId = '';
      fromUpdates.currentWaiterName = '';
      fromUpdates.openedAt = '';
    }

    // Recalculate toTab updates
    const activeTodayTo = newToResList.find(r => r.date === todayDateStr && r.status !== 'cancelado');
    const newToConsumption = moveDate === todayDateStr ? [...(toTab.consumption || []), ...(fromTab.consumption || [])] : (toTab.consumption || []);
    const nextToStatus = newToConsumption.length > 0 ? TableStatus.OCCUPIED : (activeTodayTo ? TableStatus.RESERVED : TableStatus.FREE);

    const toUpdates: any = {
      status: nextToStatus,
      consumption: newToConsumption,
      reservations: newToResList,
      currentWaiterId: toTab.currentWaiterId || fromTab.currentWaiterId || '',
      currentWaiterName: toTab.currentWaiterName || fromTab.currentWaiterName || '',
      openedAt: toTab.openedAt || fromTab.openedAt || (nextToStatus === TableStatus.OCCUPIED ? new Date().toISOString() : '')
    };

    if (activeTodayTo) {
      toUpdates.reservationClient = activeTodayTo.clientName;
      toUpdates.reservationPhone = activeTodayTo.phone || '';
      toUpdates.reservationTime = activeTodayTo.time;
      toUpdates.reservationDate = activeTodayTo.date;
      toUpdates.reservationPeople = activeTodayTo.people;
      toUpdates.reservationCoverPaid = activeTodayTo.coverPaid;
      toUpdates.reservationPaymentVerified = activeTodayTo.paymentVerified;
      toUpdates.reservationStatus = activeTodayTo.status;
      toUpdates.notes = activeTodayTo.notes || '';
    } else {
      toUpdates.reservationClient = '';
      toUpdates.reservationPhone = '';
      toUpdates.reservationTime = '';
      toUpdates.reservationDate = '';
      toUpdates.reservationPeople = 0;
      toUpdates.reservationCoverPaid = 0;
      toUpdates.reservationPaymentVerified = false;
      toUpdates.reservationStatus = 'cancelado';
      toUpdates.notes = '';
    }

    transaction.update(fromTableRef, fromUpdates);
    transaction.update(toTableRef, toUpdates);
  });
}

