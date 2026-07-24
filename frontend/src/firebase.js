import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
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
  where 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// User's Firebase Project Configuration (EMS AG)
const firebaseConfig = {
  apiKey: "AIzaSyDqJ5mYFfBqMauki2omxMf7AO4JGJVh8ik",
  authDomain: "ems-ag.firebaseapp.com",
  projectId: "ems-ag",
  storageBucket: "ems-ag.firebasestorage.app",
  messagingSenderId: "246488148980",
  appId: "1:246488148980:web:8abc1da1675b734ba3a7a1",
  measurementId: "G-SN6SCQFCME"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  app,
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
};
