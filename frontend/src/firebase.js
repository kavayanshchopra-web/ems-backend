/**
 * Global EMS Firebase Stub
 *
 * Firebase SDK is NOT bundled in this application.
 * All authentication and data operations go through the Backend REST API.
 *
 * These exports are null/no-op stubs so that any legacy call sites
 * that still import from firebase.js do NOT crash at module evaluation time.
 *
 * DO NOT import CDN URLs here — that causes Vite/Rolldown production TDZ crashes.
 */

export const app = null;
export const auth = null;
export const db = null;
export const storage = null;

export const signInWithEmailAndPassword = () => Promise.reject(new Error('Use backend API for auth.'));
export const createUserWithEmailAndPassword = () => Promise.reject(new Error('Use backend API for auth.'));
export const signOut = () => Promise.resolve();
export const sendPasswordResetEmail = () => Promise.reject(new Error('Use backend API for password reset.'));
export const onAuthStateChanged = () => (() => {});

export const doc = () => null;
export const getDoc = () => Promise.resolve({ exists: () => false, data: () => ({}) });
export const setDoc = () => Promise.resolve();
export const addDoc = () => Promise.resolve({ id: 'stub_id' });
export const deleteDoc = () => Promise.resolve();
export const updateDoc = () => Promise.resolve();
export const collection = () => null;
export const getDocs = () => Promise.resolve({ docs: [] });
export const query = () => null;
export const where = () => null;

export const ref = () => null;
export const uploadBytes = () => Promise.resolve();
export const getDownloadURL = () => Promise.resolve('');
