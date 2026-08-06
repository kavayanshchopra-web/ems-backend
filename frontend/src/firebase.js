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

const firebaseConfig = {
  apiKey: "AIzaSyDqJ5mYFfBqMauki2omxMf7AO4JGJVh8ik",
  authDomain: "ems-ag.firebaseapp.com",
  projectId: "ems-ag",
  storageBucket: "ems-ag.firebasestorage.app",
  messagingSenderId: "246488148980",
  appId: "1:246488148980:web:8abc1da1675b734ba3a7a1",
  measurementId: "G-SN6SCQFCME"
};

let app = null;
let auth = null;
let db = null;
let storage = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log('☁️ Live Firebase Cloud Connection Active for app.employeemanagementsystems.com [EMS AG]');
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
