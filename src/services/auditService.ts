/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { AuditLog, User, UserRole } from '../types';

/**
 * Appends an unalterable Audit Log entry to Firestore.
 */
export async function addAuditLogInFirestore(
  module: string,
  action: string,
  beforeState: any,
  afterState: any,
  currentUser: User | null
): Promise<void> {
  const logId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const logRef = doc(db, 'auditLogs', logId);

  const newLog: AuditLog = {
    id: logId,
    userId: currentUser?.uid || 'system',
    userName: currentUser?.name || 'Sistema',
    role: currentUser?.role || UserRole.MESERO,
    action,
    module,
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.51', // Simulating secure network gateway IP
    deviceInfo: navigator.userAgent.substring(0, 80),
    beforeState: beforeState ? JSON.stringify(beforeState) : 'N/A',
    afterState: afterState ? JSON.stringify(afterState) : 'N/A'
  };

  try {
    await setDoc(logRef, newLog);
  } catch (error) {
    console.error('Failed to log audit activity to Firestore:', error);
  }
}
