/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAGTkSsw0QZUMBRIhFOGIrYrUfO-bs_ISw",
  authDomain: "sacred-server-nnp9f.firebaseapp.com",
  projectId: "sacred-server-nnp9f",
  storageBucket: "sacred-server-nnp9f.firebasestorage.app",
  messagingSenderId: "780656814760",
  appId: "1:780656814760:web:cebef432d94cbcaeaff09d"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true, // Useful for preventing issues with undefined fields in Firestore
  experimentalForceLongPolling: true // Ensure stable connections inside iframe/proxy environments
}, "ai-studio-ambarclub-09187867-de02-43b0-be09-d91bd3a86749");

// Enable multi-tab local persistence for robust offline capabilities
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Firestore multi-tab persistence failed-precondition: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required to enable persistence
    console.warn('Firestore persistence unimplemented in this browser.');
  } else {
    console.warn('Firestore offline persistence could not be enabled:', err);
  }
});

export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
