/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { doc, runTransaction, setDoc } from 'firebase/firestore';
import { CashRegisterSession, User } from '../types';

/**
 * Opens a new shift cash register session in Firestore.
 */
export async function openCashSessionInFirestore(
  openingBalance: number,
  observations: string,
  currentUser: User | null,
  cajaAsociada: string
): Promise<CashRegisterSession> {
  const sessionId = `session-${Date.now()}`;
  const sessionRef = doc(db, 'cashSessions', sessionId);

  const newSession: CashRegisterSession = {
    id: sessionId,
    userId: currentUser?.uid || 'system',
    userName: currentUser?.name || 'Sistema',
    openedAt: new Date().toISOString(),
    openingBalance,
    status: 'Abierta',
    cashInflows: 0,
    cashOutflows: 0,
    salesTotal: 0,
    expectedBalance: openingBalance,
    observations,
    cajaAsociada
  };

  await setDoc(sessionRef, newSession);
  return newSession;
}

/**
 * Closes an active shift cash register session in Firestore.
 */
export async function closeCashSessionInFirestore(
  sessionId: string,
  realBalance: number,
  observations?: string
): Promise<void> {
  const sessionRef = doc(db, 'cashSessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('La sesión de caja no existe.');
    }

    const s = sessionDoc.data() as CashRegisterSession;
    const finalSession: Partial<CashRegisterSession> = {
      closedAt: new Date().toISOString(),
      status: 'Cerrada',
      realBalance,
      difference: Number((realBalance - (s.expectedBalance || 0)).toFixed(2)),
      observations: observations || s.observations || ''
    };

    transaction.update(sessionRef, finalSession);
  });
}

/**
 * Registers a manual cash inflow (reforzamiento de caja / ingreso de cambio).
 */
export async function registerCashInflowInFirestore(
  sessionId: string,
  amount: number
): Promise<void> {
  const sessionRef = doc(db, 'cashSessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('La sesión de caja no existe.');
    }

    const s = sessionDoc.data() as CashRegisterSession;
    const cashInflows = (s.cashInflows || 0) + amount;
    const expectedBalance = (s.openingBalance || 0) + cashInflows - (s.cashOutflows || 0) + (s.salesTotal || 0);

    transaction.update(sessionRef, {
      cashInflows,
      expectedBalance
    });
  });
}

/**
 * Registers a manual cash outflow (egreso de caja / gasto / retiro).
 */
export async function registerCashOutflowInFirestore(
  sessionId: string,
  amount: number
): Promise<void> {
  const sessionRef = doc(db, 'cashSessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('La sesión de caja no existe.');
    }

    const s = sessionDoc.data() as CashRegisterSession;
    const cashOutflows = (s.cashOutflows || 0) + amount;
    const expectedBalance = (s.openingBalance || 0) + (s.cashInflows || 0) - cashOutflows + (s.salesTotal || 0);

    transaction.update(sessionRef, {
      cashOutflows,
      expectedBalance
    });
  });
}
