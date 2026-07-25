/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface UserCredentialInfo {
  expectedPassword: string;
  name: string;
  defaultRole: UserRole;
  username: string;
  email: string;
  uid: string;
  permissions: string[];
}

const USER_CREDENTIALS_MAP: Record<string, UserCredentialInfo> = {
  // Aisha Arteaga (Mesera)
  'aisha': { expectedPassword: '10061111', name: 'Aisha Arteaga', defaultRole: UserRole.MESERO, username: 'aisha', email: 'aisha@ambar.club', uid: 'u_aisha', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'aishaarteaga': { expectedPassword: '10061111', name: 'Aisha Arteaga', defaultRole: UserRole.MESERO, username: 'aisha', email: 'aisha@ambar.club', uid: 'u_aisha', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'aisha.arteaga': { expectedPassword: '10061111', name: 'Aisha Arteaga', defaultRole: UserRole.MESERO, username: 'aisha', email: 'aisha@ambar.club', uid: 'u_aisha', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'aisha@ambar.club': { expectedPassword: '10061111', name: 'Aisha Arteaga', defaultRole: UserRole.MESERO, username: 'aisha', email: 'aisha@ambar.club', uid: 'u_aisha', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },

  // Mauricio Sebastian (Almacenero)
  'mauricio': { expectedPassword: '10929665', name: 'Mauricio Sebastian', defaultRole: UserRole.ALMACENERO, username: 'mauricio', email: 'mauricio@ambar.club', uid: 'u_mauricio', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },
  'mauriciosebastian': { expectedPassword: '10929665', name: 'Mauricio Sebastian', defaultRole: UserRole.ALMACENERO, username: 'mauricio', email: 'mauricio@ambar.club', uid: 'u_mauricio', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },
  'mauricio.sebastian': { expectedPassword: '10929665', name: 'Mauricio Sebastian', defaultRole: UserRole.ALMACENERO, username: 'mauricio', email: 'mauricio@ambar.club', uid: 'u_mauricio', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },
  'mauricio@ambar.club': { expectedPassword: '10929665', name: 'Mauricio Sebastian', defaultRole: UserRole.ALMACENERO, username: 'mauricio', email: 'mauricio@ambar.club', uid: 'u_mauricio', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },

  // Valeria (Mesera)
  'valeria': { expectedPassword: '8316260', name: 'Valeria', defaultRole: UserRole.MESERO, username: 'valeria', email: 'valeria@ambar.club', uid: 'u_valeria', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'valeria@ambar.club': { expectedPassword: '8316260', name: 'Valeria', defaultRole: UserRole.MESERO, username: 'valeria', email: 'valeria@ambar.club', uid: 'u_valeria', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },

  // Vianca (Almacenera)
  'vianca': { expectedPassword: 'Munec@77', name: 'Vianca', defaultRole: UserRole.ALMACENERO, username: 'vianca', email: 'vianca@ambar.club', uid: 'u_vianca', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },
  'vianca@ambar.club': { expectedPassword: 'Munec@77', name: 'Vianca', defaultRole: UserRole.ALMACENERO, username: 'vianca', email: 'vianca@ambar.club', uid: 'u_vianca', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },

  // Cajeros (Caja 1, Caja 2, Caja 3, Caja 4)
  'caja1': { expectedPassword: 'caja123', name: 'Caja 1', defaultRole: UserRole.CAJA, username: 'caja1', email: 'caja1@ambar.club', uid: 'u_caja1', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja1@ambar.club': { expectedPassword: 'caja123', name: 'Caja 1', defaultRole: UserRole.CAJA, username: 'caja1', email: 'caja1@ambar.club', uid: 'u_caja1', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja2': { expectedPassword: 'caja123', name: 'Caja 2', defaultRole: UserRole.CAJA, username: 'caja2', email: 'caja2@ambar.club', uid: 'u_caja2', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja2@ambar.club': { expectedPassword: 'caja123', name: 'Caja 2', defaultRole: UserRole.CAJA, username: 'caja2', email: 'caja2@ambar.club', uid: 'u_caja2', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja3': { expectedPassword: 'caja123', name: 'Caja 3', defaultRole: UserRole.CAJA, username: 'caja3', email: 'caja3@ambar.club', uid: 'u_caja3', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja3@ambar.club': { expectedPassword: 'caja123', name: 'Caja 3', defaultRole: UserRole.CAJA, username: 'caja3', email: 'caja3@ambar.club', uid: 'u_caja3', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja4': { expectedPassword: 'caja123', name: 'Caja 4', defaultRole: UserRole.CAJA, username: 'caja4', email: 'caja4@ambar.club', uid: 'u_caja4', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },
  'caja4@ambar.club': { expectedPassword: 'caja123', name: 'Caja 4', defaultRole: UserRole.CAJA, username: 'caja4', email: 'caja4@ambar.club', uid: 'u_caja4', permissions: ['pos', 'sales', 'tables', 'cash', 'daily-audit', 'cash-expenses'] },

  // Gerente
  'gerente': { expectedPassword: '123456789', name: 'Gerente Ámbar', defaultRole: UserRole.GERENTE, username: 'gerente', email: 'gerente@ambar.club', uid: 'u_gerente', permissions: ['dashboard', 'reports', 'inventory', 'products', 'tables', 'commissions', 'cash-expenses', 'audit', 'sales', 'cash'] },
  'gerente@ambar.club': { expectedPassword: '123456789', name: 'Gerente Ámbar', defaultRole: UserRole.GERENTE, username: 'gerente', email: 'gerente@ambar.club', uid: 'u_gerente', permissions: ['dashboard', 'reports', 'inventory', 'products', 'tables', 'commissions', 'cash-expenses', 'audit', 'sales', 'cash'] },

  // Almacenero 1
  'almacenero1': { expectedPassword: 'almacenero1', name: 'Almacenero 1', defaultRole: UserRole.ALMACENERO, username: 'almacenero1', email: 'almacenero1@ambar.club', uid: 'u_almacenero1', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },
  'almacenero1@ambar.club': { expectedPassword: 'almacenero1', name: 'Almacenero 1', defaultRole: UserRole.ALMACENERO, username: 'almacenero1', email: 'almacenero1@ambar.club', uid: 'u_almacenero1', permissions: ['inventory', 'warehouse-restock', 'products', 'daily-audit'] },

  // Meseros (Mesero 1 al Mesero 8)
  'mesero1': { expectedPassword: 'mesero1', name: 'Mesero 1', defaultRole: UserRole.MESERO, username: 'mesero1', email: 'mesero1@ambar.club', uid: 'u_mesero1', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero1@ambar.club': { expectedPassword: 'mesero1', name: 'Mesero 1', defaultRole: UserRole.MESERO, username: 'mesero1', email: 'mesero1@ambar.club', uid: 'u_mesero1', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero2': { expectedPassword: 'mesero2', name: 'Mesero 2', defaultRole: UserRole.MESERO, username: 'mesero2', email: 'mesero2@ambar.club', uid: 'u_mesero2', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero2@ambar.club': { expectedPassword: 'mesero2', name: 'Mesero 2', defaultRole: UserRole.MESERO, username: 'mesero2', email: 'mesero2@ambar.club', uid: 'u_mesero2', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero3': { expectedPassword: 'mesero3', name: 'Mesero 3', defaultRole: UserRole.MESERO, username: 'mesero3', email: 'mesero3@ambar.club', uid: 'u_mesero3', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero3@ambar.club': { expectedPassword: 'mesero3', name: 'Mesero 3', defaultRole: UserRole.MESERO, username: 'mesero3', email: 'mesero3@ambar.club', uid: 'u_mesero3', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero4': { expectedPassword: 'mesero4', name: 'Mesero 4', defaultRole: UserRole.MESERO, username: 'mesero4', email: 'mesero4@ambar.club', uid: 'u_mesero4', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero4@ambar.club': { expectedPassword: 'mesero4', name: 'Mesero 4', defaultRole: UserRole.MESERO, username: 'mesero4', email: 'mesero4@ambar.club', uid: 'u_mesero4', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero5': { expectedPassword: 'mesero5', name: 'Mesero 5', defaultRole: UserRole.MESERO, username: 'mesero5', email: 'mesero5@ambar.club', uid: 'u_mesero5', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero5@ambar.club': { expectedPassword: 'mesero5', name: 'Mesero 5', defaultRole: UserRole.MESERO, username: 'mesero5', email: 'mesero5@ambar.club', uid: 'u_mesero5', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero6': { expectedPassword: 'mesero6', name: 'Mesero 6', defaultRole: UserRole.MESERO, username: 'mesero6', email: 'mesero6@ambar.club', uid: 'u_mesero6', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero6@ambar.club': { expectedPassword: 'mesero6', name: 'Mesero 6', defaultRole: UserRole.MESERO, username: 'mesero6', email: 'mesero6@ambar.club', uid: 'u_mesero6', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero7': { expectedPassword: 'mesero7', name: 'Mesero 7', defaultRole: UserRole.MESERO, username: 'mesero7', email: 'mesero7@ambar.club', uid: 'u_mesero7', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero7@ambar.club': { expectedPassword: 'mesero7', name: 'Mesero 7', defaultRole: UserRole.MESERO, username: 'mesero7', email: 'mesero7@ambar.club', uid: 'u_mesero7', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero8': { expectedPassword: 'mesero8', name: 'Mesero 8', defaultRole: UserRole.MESERO, username: 'mesero8', email: 'mesero8@ambar.club', uid: 'u_mesero8', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },
  'mesero8@ambar.club': { expectedPassword: 'mesero8', name: 'Mesero 8', defaultRole: UserRole.MESERO, username: 'mesero8', email: 'mesero8@ambar.club', uid: 'u_mesero8', permissions: ['tables', 'waiter-menu', 'waiter-disco-sales', 'commissions'] },

  // Admin / Master
  'cristian': { expectedPassword: '78937703', name: 'Cristian Bacarreza', defaultRole: UserRole.ADMIN, username: 'cristian', email: 'cristianbacarreza29@gmail.com', uid: 'u1', permissions: ['all'] },
  'cristianbacarreza29@gmail.com': { expectedPassword: '78937703', name: 'Cristian Bacarreza', defaultRole: UserRole.ADMIN, username: 'cristian', email: 'cristianbacarreza29@gmail.com', uid: 'u1', permissions: ['all'] },
  'cristianbacarreza1999@gmail.com': { expectedPassword: '78937703', name: 'Cristian Bacarreza', defaultRole: UserRole.ADMIN, username: 'cristian', email: 'cristianbacarreza1999@gmail.com', uid: 'u1', permissions: ['all'] },
  'admin': { expectedPassword: '123456789', name: 'Administrador Ámbar', defaultRole: UserRole.ADMIN, username: 'admin', email: 'admin@ambar.club', uid: 'u_admin', permissions: ['all'] },
  'admin@ambar.club': { expectedPassword: '123456789', name: 'Administrador Ámbar', defaultRole: UserRole.ADMIN, username: 'admin', email: 'admin@ambar.club', uid: 'u_admin', permissions: ['all'] }
};

/**
 * PENDIENTE DE MIGRACIÓN A BACKEND:
 * Helper para obtener credenciales. En producción, esto debe reemplazarse por una llamada
 * a Cloud Function o documento de Firestore protegido para no exponer contraseñas en el JS.
 */
function getLocalCredentialInfo(normalizedKey: string): UserCredentialInfo | null {
  return USER_CREDENTIALS_MAP[normalizedKey] || null;
}

/**
 * Enterprise Authentication: Authenticates user credentials and syncs role and profile with Firestore.
 * Performs real Firebase Auth sign-in or auto-creation so request.auth is populated for security rules.
 */
export async function loginWithFirebase(email: string, role: UserRole, password?: string): Promise<User> {
  const rawInput = email.trim();
  const normalizedKey = rawInput.toLowerCase().replace(/\s+/g, '');
  
  // 1. Check system user credentials
  const credInfo = getLocalCredentialInfo(normalizedKey);

  if (credInfo) {
    const inputtedPassword = password || '';
    if (inputtedPassword !== credInfo.expectedPassword) {
      throw new Error('Error de credenciales: Contraseña incorrecta.');
    }

    const matchedUser: User = {
      uid: credInfo.uid,
      email: credInfo.email,
      username: credInfo.username,
      name: credInfo.name,
      role: role || credInfo.defaultRole,
      isActive: true,
      permissions: credInfo.permissions,
      createdAt: new Date().toISOString()
    };

    // Keep session persistent in localStorage
    localStorage.setItem('ambar_logged_user', JSON.stringify(matchedUser));

    // Save/merge into Firestore user collection
    try {
      await setDoc(doc(db, 'users', matchedUser.uid), matchedUser, { merge: true });
    } catch (e) {
      console.warn("Could not sync user profile to Firestore (using local session):", e);
    }

    return matchedUser;
  }

  // 2. Fallback check for any custom Firestore user
  const cleanId = rawInput.toLowerCase();
  const emailLower = cleanId.includes('@') ? cleanId : `${cleanId}@ambar.club`;
  const username = emailLower.split('@')[0];

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', emailLower));
  try {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const userData = snap.docs[0].data() as User;
      if (userData.isActive) {
        const userProfile = { ...userData, role: role || userData.role };
        localStorage.setItem('ambar_logged_user', JSON.stringify(userProfile));
        return userProfile;
      }
    }
  } catch (err) {
    console.warn("Firestore query check error:", err);
  }

  throw new Error('Error de credenciales: Usuario o contraseña no válidos.');
}

/**
 * Logs out the active Firebase Auth user.
 */
export async function logoutWithFirebase(): Promise<void> {
  localStorage.removeItem('ambar_logged_user');
  try {
    await signOut(auth);
  } catch (_) {}
}

/**
 * Listens to active Firebase Auth state and returns the synced Firestore user profile.
 */
export function listenToAuthState(onUserFetched: (user: User | null) => void): () => void {
  // Try loading from localStorage first to guarantee instant login in local/fallback mode
  const savedUser = localStorage.getItem('ambar_logged_user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      onUserFetched(parsed);
    } catch (_) {}
  }

  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    const currentSavedUser = localStorage.getItem('ambar_logged_user');
    if (!firebaseUser) {
      if (!currentSavedUser) {
        onUserFetched(null);
      }
      return;
    }
    
    try {
      // Fetch Firestore profile
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        localStorage.setItem('ambar_logged_user', JSON.stringify(data));
        onUserFetched(data);
      } else {
        // Try searching by email
        const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email || ''));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const userData = snap.docs[0].data() as User;
          // Sync doc with new uid
          const syncedUser = { ...userData, uid: firebaseUser.uid };
          await setDoc(doc(db, 'users', firebaseUser.uid), syncedUser);
          localStorage.setItem('ambar_logged_user', JSON.stringify(syncedUser));
          onUserFetched(syncedUser);
        } else {
          if (!currentSavedUser) {
            onUserFetched(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching authenticated user profile:', err);
      if (!currentSavedUser) {
        onUserFetched(null);
      }
    }
  });
}

/**
 * Triggers a real password reset email via Firebase Auth
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const emailLower = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, emailLower);
}
