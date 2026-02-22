// ========================================
// KONFIGURATION – HIER ANPASSEN
// ========================================
export const COMPANY_NAME = 'VB Entrümpelungen';
export const BUNDESLAND = 'MV'; // Mecklenburg-Vorpommern
export const ADMIN_NAME = 'Volker';
export const ADMIN_PIN = '2026';

// Schnelleintrag-Vorlagen
export const QUICK_TEMPLATES = [
  { label: 'Normaltag 7–16', start: '07:00', end: '16:00', pause: '1:00' },
  { label: 'Halber Tag 7–12', start: '07:00', end: '12:00', pause: '0:00' },
];

export const DEFAULT_START = '07:00';

// ========================================
// ZEIT-HILFSFUNKTIONEN
// ========================================

// Generiert alle 15-Min-Zeitoptionen von 00:00 bis 23:45
export function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

export const TIME_OPTIONS = generateTimeOptions();

// Pause-Optionen
export const PAUSE_OPTIONS = ['0:00', '0:15', '0:30', '0:45', '1:00', '1:15', '1:30'];

// Zeit in Minuten umrechnen
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Minuten in "H:MM h" formatieren
export function formatDuration(totalMinutes) {
  const negative = totalMinutes < 0;
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${negative ? '-' : ''}${h}:${String(m).padStart(2, '0')} h`;
}

// Pause in Minuten umrechnen (Format "H:MM")
export function pauseToMinutes(p) {
  if (!p) return 0;
  const [h, m] = p.split(':').map(Number);
  return h * 60 + m;
}

// Minuten in Pause-String (Format "H:MM")
export function minutesToPause(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Arbeitszeit berechnen (in Minuten)
export function calcWorkMinutes(start, end, pause) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const p = pauseToMinutes(pause);
  const raw = e - s;
  if (raw <= 0) return 0;
  return Math.max(0, raw - p);
}

// Automatische Mindestpause nach ArbZG §4
export function autoMinPause(start, end) {
  const raw = timeToMinutes(end) - timeToMinutes(start);
  if (raw > 9 * 60) return 45;
  if (raw > 6 * 60) return 30;
  return 0;
}

// Pause validieren & ggf. auf Minimum anheben
export function validatePause(start, end, selectedPause) {
  const minPause = autoMinPause(start, end);
  const selected = pauseToMinutes(selectedPause);
  if (selected < minPause) {
    return minutesToPause(minPause);
  }
  return selectedPause;
}

// ========================================
// DATUM-HILFSFUNKTIONEN
// ========================================

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Datum formatieren: "Mo, 01.02.2025"
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = WOCHENTAGE[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}, ${dd}.${mm}.${d.getFullYear()}`;
}

// Nur "DD.MM.YYYY"
export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Monatsname + Jahr: "Februar 2025"
export function formatMonthYear(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONATE[m - 1]} ${y}`;
}

// Aktueller Monats-Key: "2025-02"
export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Heute als "YYYY-MM-DD"
export function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Monats-Key navigieren (offset +1 oder -1)
export function offsetMonth(monthKey, offset) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Alle Tage eines Monats als YYYY-MM-DD Array
export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const result = [];
  for (let d = 1; d <= days; d++) {
    result.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return result;
}

// Kalenderwoche berechnen (ISO 8601)
export function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Alle Tage der aktuellen KW (Mo–So) als YYYY-MM-DD
export function getCurrentWeekDays() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Mo=1 ... So=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return days;
}

// Arbeitstage (Mo-Fr) in einem Monat zählen
export function countWorkdaysInMonth(monthKey) {
  const days = daysInMonth(monthKey);
  return days.filter(d => {
    const day = new Date(d + 'T00:00:00').getDay();
    return day >= 1 && day <= 5;
  }).length;
}

// User-Slug generieren
export function userSlug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

// ========================================
// FEIERTAGE – DEUTSCHE BUNDESLÄNDER
// ========================================

// Ostersonntag berechnen (Gaußsche Osterformel)
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Bundesland-Konfiguration: welche Feiertage gelten wo
const EXTRA_HOLIDAYS = {
  BW: ['heiligeDreiKoenige', 'fronleichnam', 'allerheiligen'],
  BY: ['heiligeDreiKoenige', 'fronleichnam', 'mariaHimmelfahrt', 'allerheiligen'],
  BE: ['frauentag'],
  BB: ['reformationstag'],
  HB: ['reformationstag'],
  HH: ['reformationstag'],
  HE: ['fronleichnam'],
  MV: ['reformationstag'],
  NI: ['reformationstag'],
  NW: ['fronleichnam', 'allerheiligen'],
  RP: ['fronleichnam', 'allerheiligen'],
  SL: ['fronleichnam', 'mariaHimmelfahrt', 'allerheiligen'],
  SN: ['reformationstag', 'bussUndBettag'],
  ST: ['heiligeDreiKoenige', 'reformationstag'],
  SH: ['reformationstag'],
  TH: ['weltkindertag', 'reformationstag'],
};

export function getHolidays(year, bundesland = BUNDESLAND) {
  const easter = easterSunday(year);
  const holidays = {};

  // Bundesweite Feiertage
  holidays[`${year}-01-01`] = 'Neujahr';
  holidays[dateToStr(addDays(easter, -2))] = 'Karfreitag';
  holidays[dateToStr(easter)] = 'Ostersonntag';
  holidays[dateToStr(addDays(easter, 1))] = 'Ostermontag';
  holidays[`${year}-05-01`] = 'Tag der Arbeit';
  holidays[dateToStr(addDays(easter, 39))] = 'Christi Himmelfahrt';
  holidays[dateToStr(addDays(easter, 49))] = 'Pfingstsonntag';
  holidays[dateToStr(addDays(easter, 50))] = 'Pfingstmontag';
  holidays[`${year}-10-03`] = 'Tag der Deutschen Einheit';
  holidays[`${year}-12-25`] = '1. Weihnachtstag';
  holidays[`${year}-12-26`] = '2. Weihnachtstag';

  // Bundesland-spezifische Feiertage
  const extra = EXTRA_HOLIDAYS[bundesland] || [];

  if (extra.includes('heiligeDreiKoenige')) {
    holidays[`${year}-01-06`] = 'Heilige Drei Könige';
  }
  if (extra.includes('frauentag')) {
    holidays[`${year}-03-08`] = 'Internationaler Frauentag';
  }
  if (extra.includes('fronleichnam')) {
    holidays[dateToStr(addDays(easter, 60))] = 'Fronleichnam';
  }
  if (extra.includes('mariaHimmelfahrt')) {
    holidays[`${year}-08-15`] = 'Mariä Himmelfahrt';
  }
  if (extra.includes('weltkindertag')) {
    holidays[`${year}-09-20`] = 'Weltkindertag';
  }
  if (extra.includes('reformationstag')) {
    holidays[`${year}-10-31`] = 'Reformationstag';
  }
  if (extra.includes('allerheiligen')) {
    holidays[`${year}-11-01`] = 'Allerheiligen';
  }
  if (extra.includes('bussUndBettag')) {
    // Buß- und Bettag: Mittwoch vor dem 23. November
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const diff = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
    const bub = new Date(year, 10, 23 - diff);
    holidays[dateToStr(bub)] = 'Buß- und Bettag';
  }

  return holidays;
}

// Prüfen ob ein Datum ein Feiertag ist
export function isHoliday(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getHolidays(year);
  return holidays[dateStr] || null;
}

// Ist es ein Wochenende?
export function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00').getDay();
  return d === 0 || d === 6;
}

// Soll-Stunden für einen Monat berechnen (Arbeitstage ohne Feiertage)
export function calcSollMinutes(monthKey, weeklyHours = 40) {
  const days = daysInMonth(monthKey);
  const year = parseInt(monthKey.substring(0, 4));
  const holidays = getHolidays(year);
  const dailyMinutes = (weeklyHours / 5) * 60;

  let workdays = 0;
  for (const d of days) {
    const dayOfWeek = new Date(d + 'T00:00:00').getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays[d]) {
      workdays++;
    }
  }
  return Math.round(workdays * dailyMinutes);
}

// ========================================
// DATEV CSV-EXPORT
// ========================================

export function generateDATEV(entries, monthKey, userName) {
  const BOM = '\uFEFF';
  const SEP = ';';
  const lines = [];

  // Header
  lines.push(['Datum', 'Mitarbeiter', 'Kommen', 'Gehen', 'Pause (Min)', 'Arbeitszeit (Min)', 'Krank', 'Urlaub'].join(SEP));

  const days = daysInMonth(monthKey);
  for (const day of days) {
    const entry = entries[day];
    if (!entry) continue;

    const dateFormatted = formatDateShort(day);

    if (entry.sick) {
      lines.push([dateFormatted, userName, '', '', '', '', 'Ja', ''].join(SEP));
    } else if (entry.urlaub) {
      lines.push([dateFormatted, userName, '', '', '', '', '', 'Ja'].join(SEP));
    } else if (entry.start && entry.end) {
      const pauseMin = pauseToMinutes(entry.pause || '0:00');
      const workMin = calcWorkMinutes(entry.start, entry.end, entry.pause || '0:00');
      lines.push([dateFormatted, userName, entry.start, entry.end, pauseMin, workMin, '', ''].join(SEP));
    }
  }

  return BOM + lines.join('\n');
}

// ========================================
// SONSTIGES
// ========================================

// Alle Monate eines Jahres als Keys
export function allMonthKeys(year) {
  const keys = [];
  for (let m = 1; m <= 12; m++) {
    keys.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  return keys;
}
