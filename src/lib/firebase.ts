import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

export const app = initializeApp({
  apiKey: 'AIzaSyBdOqNXVd3wG3SDz0RWlMr7_udFgMKn6KQ',
  authDomain: 'recommenderz-app.firebaseapp.com',
  projectId: 'recommenderz-app',
  storageBucket: 'recommenderz-app.firebasestorage.app',
  messagingSenderId: '931987951306',
  appId: '1:931987951306:web:b1c1b853eee851e4c52e33',
  databaseURL: 'https://recommenderz-app-default-rtdb.asia-southeast1.firebasedatabase.app',
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

// Messaging isn't available in every environment (e.g. unsupported browsers).
export let messaging: Messaging | null = null;
isSupported()
  .then((ok) => { if (ok) messaging = getMessaging(app); })
  .catch(() => {});
