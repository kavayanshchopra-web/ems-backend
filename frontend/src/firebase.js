/**
 * Global EMS Firebase Cloud Adapter
 * Pure bundle-safe dynamic importer to prevent Vite external ESM TDZ bundling crash.
 */

export let app = null;
export let auth = null;
export let db = null;
export let storage = null;

let _signInWithEmailAndPassword = null;
let _createUserWithEmailAndPassword = null;
let _signOut = null;
let _sendPasswordResetEmail = null;
let _onAuthStateChanged = null;

let _doc = null;
let _getDoc = null;
let _setDoc = null;
let _addDoc = null;
let _deleteDoc = null;
let _updateDoc = null;
let _collection = null;
let _getDocs = null;
let _query = null;
let _where = null;

let _ref = null;
let _uploadBytes = null;
let _getDownloadURL = null;

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

if (typeof window !== 'undefined') {
  Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js')
  ]).then(([fbApp, fbAuth, fbFS, fbStorage]) => {
    try {
      app = fbApp.initializeApp(firebaseConfig);
      auth = fbAuth.getAuth(app);
      db = fbFS.getFirestore(app);
      storage = fbStorage.getStorage(app);

      _signInWithEmailAndPassword = fbAuth.signInWithEmailAndPassword;
      _createUserWithEmailAndPassword = fbAuth.createUserWithEmailAndPassword;
      _signOut = fbAuth.signOut;
      _sendPasswordResetEmail = fbAuth.sendPasswordResetEmail;
      _onAuthStateChanged = fbAuth.onAuthStateChanged;

      _doc = fbFS.doc;
      _getDoc = fbFS.getDoc;
      _setDoc = fbFS.setDoc;
      _addDoc = fbFS.addDoc;
      _deleteDoc = fbFS.deleteDoc;
      _updateDoc = fbFS.updateDoc;
      _collection = fbFS.collection;
      _getDocs = fbFS.getDocs;
      _query = fbFS.query;
      _where = fbFS.where;

      _ref = fbStorage.ref;
      _uploadBytes = fbStorage.uploadBytes;
      _getDownloadURL = fbStorage.getDownloadURL;
    } catch (e) {
      console.warn("Firebase initialized with fallback:", e);
    }
  }).catch(err => {
    console.warn("Firebase CDN async fallback active (Backend API mode active):", err);
  });
}

export const signInWithEmailAndPassword = (...args) => _signInWithEmailAndPassword ? _signInWithEmailAndPassword(...args) : Promise.reject(new Error("Firebase Auth loading..."));
export const createUserWithEmailAndPassword = (...args) => _createUserWithEmailAndPassword ? _createUserWithEmailAndPassword(...args) : Promise.reject(new Error("Firebase Auth loading..."));
export const signOut = (...args) => _signOut ? _signOut(...args) : Promise.resolve();
export const sendPasswordResetEmail = (...args) => _sendPasswordResetEmail ? _sendPasswordResetEmail(...args) : Promise.reject(new Error("Firebase Auth loading..."));
export const onAuthStateChanged = (...args) => _onAuthStateChanged ? _onAuthStateChanged(...args) : (() => {});

export const doc = (...args) => _doc ? _doc(...args) : null;
export const getDoc = (...args) => _getDoc ? _getDoc(...args) : Promise.resolve({ exists: () => false });
export const setDoc = (...args) => _setDoc ? _setDoc(...args) : Promise.resolve();
export const addDoc = (...args) => _addDoc ? _addDoc(...args) : Promise.resolve({ id: 'mock_id' });
export const deleteDoc = (...args) => _deleteDoc ? _deleteDoc(...args) : Promise.resolve();
export const updateDoc = (...args) => _updateDoc ? _updateDoc(...args) : Promise.resolve();
export const collection = (...args) => _collection ? _collection(...args) : null;
export const getDocs = (...args) => _getDocs ? _getDocs(...args) : Promise.resolve({ docs: [] });
export const query = (...args) => _query ? _query(...args) : null;
export const where = (...args) => _where ? _where(...args) : null;

export const ref = (...args) => _ref ? _ref(...args) : null;
export const uploadBytes = (...args) => _uploadBytes ? _uploadBytes(...args) : Promise.resolve();
export const getDownloadURL = (...args) => _getDownloadURL ? _getDownloadURL(...args) : Promise.resolve('');
