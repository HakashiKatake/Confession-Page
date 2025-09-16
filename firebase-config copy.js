
// Firebase configuration - replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAs1olOCEgOu9Z2ZhMl6AXBZ5E3pBNeNxw",
  authDomain: "confessions-1049a.firebaseapp.com",
  databaseURL: "https://confessions-1049a-default-rtdb.firebaseio.com",
  projectId: "confessions-1049a",
  storageBucket: "confessions-1049a.firebasestorage.app",
  messagingSenderId: "194167332846",
  appId: "1:194167332846:web:65fdf7feac1cb4572bb8ff",
  measurementId: "G-ZSQJD5B4P2"
};


import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';
import { getDatabase, ref, push, onValue, remove, update, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, signInAnonymously, onAuthStateChanged, ref, push, onValue, remove, update, serverTimestamp };