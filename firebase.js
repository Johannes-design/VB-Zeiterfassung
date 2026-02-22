import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ========================================
// FIREBASE CREDENTIALS HIER EINSETZEN
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyCvHS9TttBUqhh3tp9fquvQbTFvWI3SK7c",
  authDomain: "vb-zeiterfassung.firebaseapp.com",
  projectId: "vb-zeiterfassung",
  storageBucket: "vb-zeiterfassung.firebasestorage.app",
  messagingSenderId: "537040426331",
  appId: "1:537040426331:web:a0125671bc2f6e9993767e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
