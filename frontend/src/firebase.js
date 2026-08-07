/**
 * Global EMS Firebase Configuration & Cloud Persistence Entry Point
 * Project: EMS AG (ems-ag)
 * Location: asia-south1
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

const liveFirebaseConfig = {
  apiKey: "AIzaSyDqJ5mYFfBqMauki2omxMf7AO4JGJVh8ik",
  authDomain: "ems-ag.firebaseapp.com",
  projectId: "ems-ag",
  storageBucket: "ems-ag.firebasestorage.app",
  messagingSenderId: "246488148980",
  appId: "1:246488148980:web:8abc1da1675b734ba3a7a1",
  measurementId: "G-SN6SCQFCME"
};

const sandboxFirebaseConfig = {
  apiKey: "AIzaSyB_FVCR1qwG0LXJkpC2I4qmRrcQwXaFf0o",
  authDomain: "ems-sandbox-60598.firebaseapp.com",
  projectId: "ems-sandbox-60598",
  storageBucket: "ems-sandbox-60598.firebasestorage.app",
  messagingSenderId: "992623661827",
  appId: "1:992623661827:web:40c6401241447ac0194f36",
  measurementId: "G-Y4MEMMYST4"
};

export function getActiveFirebaseConfig() {
  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase();
    const isProduction = host.includes('employeemanagementsystems.com') || host === 'ems-crm-sandy.vercel.app';
    if (!isProduction) {
      return sandboxFirebaseConfig;
    }
  }
  return liveFirebaseConfig;
}

const firebaseConfig = getActiveFirebaseConfig();

let app = null;
let auth = null;
let db = null;
let storage = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log(`☁️ Connected to Firebase Project: [${firebaseConfig.projectId}]`);
} catch (e) {
  console.error('Firebase Cloud setup error:', e);
}

export {
  app,
  auth,
  db,
  storage,
  // Auth exports
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  // Firestore exports
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  // Storage exports
  ref,
  uploadBytes,
  getDownloadURL
};

export default firebaseConfig;
