#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Template for firebase-config.js
const firebaseConfigTemplate = `// Firebase configuration - Generated from environment variables
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  databaseURL: "${process.env.VITE_FIREBASE_DATABASE_URL}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}",
  measurementId: "${process.env.VITE_FIREBASE_MEASUREMENT_ID}"
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';
import { getDatabase, ref, push, onValue, remove, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, signInAnonymously, onAuthStateChanged, ref, push, onValue, remove, serverTimestamp };
`;

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy files to public directory
const filesToCopy = ['index.html', 'style.css', 'script.js'];

filesToCopy.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(publicDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${file} to public directory`);
  }
});

// Generate firebase-config.js with environment variables
const configPath = path.join(publicDir, 'firebase-config.js');
fs.writeFileSync(configPath, firebaseConfigTemplate);
console.log('✓ Generated firebase-config.js with environment variables');

console.log('✅ Build completed successfully!');