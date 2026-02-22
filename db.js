import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot
} from 'firebase/firestore';
import { userSlug } from './helpers.js';

// ========================================
// MITARBEITER-LISTE
// ========================================

export async function loadEmployees() {
  const snap = await getDoc(doc(db, 'meta', 'employees'));
  if (snap.exists()) {
    return snap.data().list || [];
  }
  return [];
}

export async function saveEmployees(list) {
  await setDoc(doc(db, 'meta', 'employees'), { list });
}

export async function addEmployee(name) {
  const list = await loadEmployees();
  if (!list.includes(name)) {
    list.push(name);
    await saveEmployees(list);
  }
  return list;
}

// ========================================
// EINSTELLUNGEN (Soll-Stunden etc.)
// ========================================

export async function loadSettings() {
  const snap = await getDoc(doc(db, 'meta', 'settings'));
  if (snap.exists()) {
    return snap.data();
  }
  return {};
}

export async function saveSettings(settings) {
  await setDoc(doc(db, 'meta', 'settings'), settings);
}

// ========================================
// ARBEITSZEIT-EINTRÄGE
// ========================================

function workDocRef(name, monthKey) {
  const slug = userSlug(name);
  return doc(db, 'users', slug, 'work', monthKey);
}

export async function loadEntries(name, monthKey) {
  const snap = await getDoc(workDocRef(name, monthKey));
  if (snap.exists()) {
    return snap.data().entries || {};
  }
  return {};
}

export async function saveEntry(name, monthKey, dateStr, entry) {
  const ref = workDocRef(name, monthKey);
  const snap = await getDoc(ref);
  const entries = snap.exists() ? (snap.data().entries || {}) : {};
  entries[dateStr] = entry;
  await setDoc(ref, { entries });
}

export async function deleteEntry(name, monthKey, dateStr) {
  const ref = workDocRef(name, monthKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entries = snap.data().entries || {};
  delete entries[dateStr];
  await setDoc(ref, { entries });
}

export async function saveAllEntries(name, monthKey, entries) {
  const ref = workDocRef(name, monthKey);
  await setDoc(ref, { entries });
}

// Listener für Echtzeit-Updates
export function subscribeEntries(name, monthKey, callback) {
  return onSnapshot(workDocRef(name, monthKey), (snap) => {
    if (snap.exists()) {
      callback(snap.data().entries || {});
    } else {
      callback({});
    }
  });
}

// Alle Monatsdaten eines Users für ein Jahr laden
export async function loadYearEntries(name, year) {
  const months = {};
  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`;
    months[mk] = await loadEntries(name, mk);
  }
  return months;
}
