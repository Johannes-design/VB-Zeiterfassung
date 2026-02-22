import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  COMPANY_NAME, ADMIN_NAME, ADMIN_PIN, DEFAULT_START,
  QUICK_TEMPLATES, TIME_OPTIONS, PAUSE_OPTIONS,
  formatDate, formatDateShort, formatDuration, formatMonthYear,
  currentMonthKey, todayStr, offsetMonth, daysInMonth,
  calcWorkMinutes, pauseToMinutes, validatePause, autoMinPause, minutesToPause,
  calcSollMinutes, isHoliday, isWeekend, getISOWeek, getCurrentWeekDays,
  getHolidays, userSlug, generateDATEV, allMonthKeys, countWorkdaysInMonth
} from './helpers.js';
import {
  loadEmployees, addEmployee, loadEntries, saveEntry, deleteEntry,
  loadSettings, saveSettings, loadYearEntries
} from './db.js';
import { generatePDF } from './pdf.js';

// ========================================
// DARK MODE HOOK
// ========================================
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ze-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('ze-dark-mode', dark);
  }, [dark]);

  return [dark, setDark];
}

// ========================================
// APP
// ========================================
export default function App() {
  const [dark, setDark] = useDarkMode();
  const [view, setView] = useState('login'); // login | main | admin | adminLogin
  const [currentUser, setCurrentUser] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loginInput, setLoginInput] = useState('');

  // Arbeitszeit State
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [entries, setEntries] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [tab, setTab] = useState('arbeitszeit'); // arbeitszeit | uebersicht

  // Admin State
  const [adminPin, setAdminPin] = useState('');
  const [settings, setSettings] = useState({});
  const [adminYear, setAdminYear] = useState(new Date().getFullYear());
  const [adminData, setAdminData] = useState({});
  const [adminTodayData, setAdminTodayData] = useState({});
  const [adminLoading, setAdminLoading] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Load employees on mount
  useEffect(() => {
    loadEmployees().then(setEmployees).catch(console.error);
    loadSettings().then(setSettings).catch(console.error);

    // Restore last user
    const last = localStorage.getItem('ze-last-user');
    if (last) setLoginInput(last);
  }, []);

  // Load entries when user or month changes
  useEffect(() => {
    if (!currentUser || view !== 'main') return;
    loadEntries(currentUser, monthKey).then(setEntries).catch(console.error);
  }, [currentUser, monthKey, view]);

  // ========================================
  // LOGIN
  // ========================================
  const handleLogin = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Admin check
    if (trimmed === ADMIN_NAME) {
      setView('adminLogin');
      return;
    }

    // Add to employee list if new
    const updated = await addEmployee(trimmed);
    setEmployees(updated);
    setCurrentUser(trimmed);
    localStorage.setItem('ze-last-user', trimmed);
    setView('main');
    setTab('arbeitszeit');
    setMonthKey(currentMonthKey());
    setSelectedDate(todayStr());
  };

  const handleLogout = () => {
    setCurrentUser('');
    setView('login');
    setTab('arbeitszeit');
    setAdminPin('');
  };

  // ========================================
  // ADMIN LOGIN
  // ========================================
  const handleAdminLogin = () => {
    if (adminPin === ADMIN_PIN) {
      setView('admin');
      loadAdminData();
    } else {
      alert('Falsche PIN!');
      setAdminPin('');
    }
  };

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      const emps = await loadEmployees();
      setEmployees(emps);
      const setts = await loadSettings();
      setSettings(setts);

      // Heute-Daten laden
      const today = todayStr();
      const mk = currentMonthKey();
      const todayData = {};
      for (const emp of emps) {
        const ents = await loadEntries(emp, mk);
        todayData[emp] = ents[today] || null;
      }
      setAdminTodayData(todayData);

      // Jahresdaten laden
      await loadAdminYearData(emps, adminYear);
    } catch (e) {
      console.error(e);
    }
    setAdminLoading(false);
  };

  const loadAdminYearData = async (emps, year) => {
    const data = {};
    for (const emp of emps) {
      const yearEntries = await loadYearEntries(emp, year);
      data[emp] = yearEntries;
    }
    setAdminData(data);
  };

  // ========================================
  // ENTRY MANAGEMENT
  // ========================================
  const currentEntry = entries[selectedDate] || {};

  const updateEntry = (field, value) => {
    const updated = { ...entries };
    if (!updated[selectedDate]) updated[selectedDate] = {};
    updated[selectedDate][field] = value;

    // Auto-Pause bei Kommen/Gehen-Änderung
    if (field === 'start' || field === 'end') {
      const e = updated[selectedDate];
      if (e.start && e.end && !e.sick && !e.urlaub) {
        e.pause = validatePause(e.start, e.end, e.pause || '0:00');
      }
    }

    setEntries(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entry = entries[selectedDate];
      if (entry) {
        await saveEntry(currentUser, monthKey, selectedDate, entry);
      }
      setSaveMsg('Gespeichert ✓');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      console.error(e);
      setSaveMsg('Fehler beim Speichern');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    setSaving(true);
    try {
      await deleteEntry(currentUser, monthKey, selectedDate);
      const updated = { ...entries };
      delete updated[selectedDate];
      setEntries(updated);
      setSaveMsg('Gelöscht ✓');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleSick = () => {
    const updated = { ...entries };
    updated[selectedDate] = { sick: true };
    setEntries(updated);
  };

  const handleVacation = () => {
    const updated = { ...entries };
    updated[selectedDate] = { urlaub: true };
    setEntries(updated);
  };

  const handleClearSpecial = () => {
    const updated = { ...entries };
    updated[selectedDate] = { start: DEFAULT_START, end: '', pause: '0:00' };
    setEntries(updated);
  };

  const applyTemplate = (tpl) => {
    const updated = { ...entries };
    updated[selectedDate] = {
      start: tpl.start,
      end: tpl.end,
      pause: validatePause(tpl.start, tpl.end, tpl.pause),
    };
    setEntries(updated);
  };

  // ========================================
  // COMPUTED VALUES
  // ========================================
  const sollStundenWoche = useMemo(() => {
    return settings[currentUser]?.sollStunden || 40;
  }, [settings, currentUser]);

  const monthStats = useMemo(() => {
    let totalMin = 0, sickDays = 0, vacDays = 0, workDays = 0;
    const days = daysInMonth(monthKey);
    for (const d of days) {
      const e = entries[d];
      if (!e) continue;
      if (e.sick) { sickDays++; continue; }
      if (e.urlaub) { vacDays++; continue; }
      if (e.start && e.end) {
        totalMin += calcWorkMinutes(e.start, e.end, e.pause || '0:00');
        workDays++;
      }
    }
    const sollMin = calcSollMinutes(monthKey, sollStundenWoche);
    return { totalMin, sickDays, vacDays, workDays, sollMin, diffMin: totalMin - sollMin };
  }, [entries, monthKey, sollStundenWoche]);

  const weekStats = useMemo(() => {
    const weekDays = getCurrentWeekDays();
    const kw = getISOWeek(todayStr());
    let totalMin = 0;

    for (const d of weekDays) {
      const mk = d.substring(0, 7);
      // Only check entries if it's the current month (we only have current month loaded)
      if (mk === monthKey) {
        const e = entries[d];
        if (e && e.start && e.end && !e.sick && !e.urlaub) {
          totalMin += calcWorkMinutes(e.start, e.end, e.pause || '0:00');
        }
      }
    }

    const sollMin = sollStundenWoche * 60;
    return { kw, totalMin, sollMin, diffMin: totalMin - sollMin };
  }, [entries, monthKey, sollStundenWoche]);

  // Sorted entries for the month list
  const sortedEntries = useMemo(() => {
    return Object.entries(entries)
      .filter(([_, e]) => e && (e.start || e.sick || e.urlaub))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  // ========================================
  // EXPORT
  // ========================================
  const handleExportPDF = () => {
    generatePDF(entries, monthKey, currentUser, sollStundenWoche);
  };

  const handleExportDATEV = () => {
    const csv = generateDATEV(entries, monthKey, currentUser);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zeiterfassung_${currentUser}_${monthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========================================
  // ADMIN: Save Soll-Stunden
  // ========================================
  const handleSollChange = async (emp, value) => {
    const updated = { ...settings };
    if (!updated[emp]) updated[emp] = {};
    updated[emp].sollStunden = parseFloat(value) || 40;
    setSettings(updated);
    await saveSettings(updated);
  };

  // ========================================
  // ADMIN: Year stats
  // ========================================
  const adminYearStats = useMemo(() => {
    const stats = {};
    for (const emp of employees) {
      if (emp === ADMIN_NAME) continue;
      const yearData = adminData[emp] || {};
      let totalMin = 0, sickDays = 0, vacDays = 0, workDays = 0;
      const weeklyH = settings[emp]?.sollStunden || 40;
      let totalSollMin = 0;

      for (let m = 1; m <= 12; m++) {
        const mk = `${adminYear}-${String(m).padStart(2, '0')}`;
        const ents = yearData[mk] || {};
        totalSollMin += calcSollMinutes(mk, weeklyH);
        for (const [d, e] of Object.entries(ents)) {
          if (e.sick) { sickDays++; continue; }
          if (e.urlaub) { vacDays++; continue; }
          if (e.start && e.end) {
            totalMin += calcWorkMinutes(e.start, e.end, e.pause || '0:00');
            workDays++;
          }
        }
      }
      stats[emp] = { totalMin, sickDays, vacDays, workDays, totalSollMin, diffMin: totalMin - totalSollMin };
    }
    return stats;
  }, [adminData, employees, adminYear, settings]);

  // ========================================
  // RENDER: LOGIN
  // ========================================
  if (view === 'login') {
    return (
      <div className="app">
        <Header dark={dark} setDark={setDark} />
        <div className="container">
          <div className="card login-card">
            <h2>Anmelden</h2>
            <p className="subtitle">Name eingeben oder auswählen</p>

            {employees.length > 0 && (
              <div className="chip-group">
                {employees.filter(e => e !== ADMIN_NAME).map(emp => (
                  <button
                    key={emp}
                    className={`chip ${loginInput === emp ? 'active' : ''}`}
                    onClick={() => { setLoginInput(emp); handleLogin(emp); }}
                  >
                    {emp}
                  </button>
                ))}
              </div>
            )}

            <div className="login-form">
              <input
                type="text"
                placeholder="Dein Name"
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin(loginInput)}
                autoFocus
              />
              <button className="btn primary" onClick={() => handleLogin(loginInput)}>
                Anmelden
              </button>
            </div>

            <button
              className="btn ghost admin-link"
              onClick={() => { setLoginInput(ADMIN_NAME); handleLogin(ADMIN_NAME); }}
            >
              Admin-Bereich →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: ADMIN PIN
  // ========================================
  if (view === 'adminLogin') {
    return (
      <div className="app">
        <Header dark={dark} setDark={setDark} onLogout={handleLogout} />
        <div className="container">
          <div className="card login-card">
            <h2>Admin-Zugang</h2>
            <p className="subtitle">PIN eingeben</p>
            <div className="login-form">
              <input
                type="password"
                placeholder="PIN"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                autoFocus
                inputMode="numeric"
                maxLength={8}
              />
              <button className="btn primary" onClick={handleAdminLogin}>
                Entsperren
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: ADMIN
  // ========================================
  if (view === 'admin') {
    return (
      <div className="app">
        <Header dark={dark} setDark={setDark} onLogout={handleLogout} title="Admin" />
        <div className="container">
          {adminLoading ? (
            <div className="card"><p className="center">Lade Daten…</p></div>
          ) : (
            <>
              {/* Heute-Übersicht */}
              <div className="card">
                <h3>Heute – {formatDate(todayStr())}</h3>
                <div className="today-grid">
                  {employees.filter(e => e !== ADMIN_NAME).map(emp => {
                    const td = adminTodayData[emp];
                    let icon = '⚪';
                    let label = 'Kein Eintrag';
                    if (td) {
                      if (td.sick) { icon = '🤒'; label = 'Krank'; }
                      else if (td.urlaub) { icon = '🏖️'; label = 'Urlaub'; }
                      else if (td.start && td.end) {
                        const now = new Date();
                        const [eh, em] = td.end.split(':').map(Number);
                        const endDate = new Date(); endDate.setHours(eh, em);
                        if (now >= endDate) { icon = '✅'; label = `${td.start}–${td.end}`; }
                        else { icon = '🟢'; label = `${td.start}–${td.end}`; }
                      }
                      else if (td.start) { icon = '🟢'; label = `Ab ${td.start}`; }
                    }
                    return (
                      <div key={emp} className="today-row">
                        <span className="today-icon">{icon}</span>
                        <span className="today-name">{emp}</span>
                        <span className="today-status">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Soll-Stunden */}
              <div className="card">
                <h3>Soll-Stunden / Woche</h3>
                <div className="soll-grid">
                  {employees.filter(e => e !== ADMIN_NAME).map(emp => (
                    <div key={emp} className="soll-row">
                      <span>{emp}</span>
                      <div className="soll-input-wrap">
                        <input
                          type="number"
                          value={settings[emp]?.sollStunden ?? 40}
                          onChange={e => handleSollChange(emp, e.target.value)}
                          min="0"
                          max="60"
                          step="0.5"
                        />
                        <span className="soll-unit">h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jahresübersicht */}
              <div className="card">
                <div className="month-nav">
                  <button className="btn icon" onClick={() => {
                    const y = adminYear - 1;
                    setAdminYear(y);
                    loadAdminYearData(employees, y);
                  }}>‹</button>
                  <h3>Jahresübersicht {adminYear}</h3>
                  <button className="btn icon" onClick={() => {
                    const y = adminYear + 1;
                    setAdminYear(y);
                    loadAdminYearData(employees, y);
                  }}>›</button>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mitarbeiter</th>
                        <th>Arbeitstage</th>
                        <th>Ist-Stunden</th>
                        <th>Soll-Stunden</th>
                        <th>+/−</th>
                        <th>Krank</th>
                        <th>Urlaub</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.filter(e => e !== ADMIN_NAME).map(emp => {
                        const s = adminYearStats[emp] || {};
                        return (
                          <tr key={emp}>
                            <td className="emp-name">{emp}</td>
                            <td>{s.workDays || 0}</td>
                            <td>{formatDuration(s.totalMin || 0)}</td>
                            <td>{formatDuration(s.totalSollMin || 0)}</td>
                            <td className={s.diffMin >= 0 ? 'positive' : 'negative'}>
                              {formatDuration(s.diffMin || 0)}
                            </td>
                            <td>{s.sickDays || 0}</td>
                            <td>{s.vacDays || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button className="btn ghost" onClick={loadAdminData} style={{ marginTop: 8 }}>
                Daten neu laden
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: MAIN (Arbeitszeit + Übersicht)
  // ========================================
  const holiday = isHoliday(selectedDate);
  const weekend = isWeekend(selectedDate);
  const isSick = currentEntry.sick;
  const isVacation = currentEntry.urlaub;

  return (
    <div className="app">
      <Header
        dark={dark}
        setDark={setDark}
        onLogout={handleLogout}
        title={currentUser}
      />

      {/* Tab Bar */}
      <div className="tab-bar">
        <button
          className={`tab ${tab === 'arbeitszeit' ? 'active' : ''}`}
          onClick={() => setTab('arbeitszeit')}
        >
          Arbeitszeit
        </button>
        <button
          className={`tab ${tab === 'uebersicht' ? 'active' : ''}`}
          onClick={() => setTab('uebersicht')}
        >
          Übersicht
        </button>
      </div>

      <div className="container">
        {/* ====== ARBEITSZEIT TAB ====== */}
        {tab === 'arbeitszeit' && (
          <>
            {/* Monat Navigation */}
            <div className="month-nav">
              <button className="btn icon" onClick={() => setMonthKey(offsetMonth(monthKey, -1))}>‹</button>
              <h3>{formatMonthYear(monthKey)}</h3>
              <button className="btn icon" onClick={() => setMonthKey(offsetMonth(monthKey, 1))}>›</button>
            </div>

            {/* KW-Karte */}
            <div className="card kw-card">
              <div className="kw-header">
                <span className="kw-label">KW {weekStats.kw}</span>
                <span className={`kw-diff ${weekStats.diffMin >= 0 ? 'positive' : 'negative'}`}>
                  {formatDuration(weekStats.diffMin)}
                </span>
              </div>
              <div className="kw-bar-wrap">
                <div
                  className="kw-bar"
                  style={{ width: `${Math.min(100, Math.max(0, (weekStats.totalMin / weekStats.sollMin) * 100))}%` }}
                />
              </div>
              <div className="kw-details">
                <span>{formatDuration(weekStats.totalMin)} von {formatDuration(weekStats.sollMin)}</span>
              </div>
            </div>

            {/* Datum wählen */}
            <div className="card">
              <label className="field-label">Datum</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="date-input"
              />
              {holiday && <div className="banner holiday-banner">🎉 {holiday}</div>}
              {weekend && !holiday && <div className="banner weekend-banner">Wochenende</div>}
            </div>

            {/* Krank / Urlaub Buttons */}
            <div className="card">
              <div className="special-btns">
                <button
                  className={`btn special ${isSick ? 'active-sick' : ''}`}
                  onClick={isSick ? handleClearSpecial : handleSick}
                >
                  🤒 Krank
                </button>
                <button
                  className={`btn special ${isVacation ? 'active-vacation' : ''}`}
                  onClick={isVacation ? handleClearSpecial : handleVacation}
                >
                  🏖️ Urlaub
                </button>
              </div>

              {isSick && <div className="banner sick-banner">Krankheitstag eingetragen</div>}
              {isVacation && <div className="banner vacation-banner">Urlaubstag eingetragen</div>}

              {/* Zeitfelder nur wenn nicht krank/urlaub */}
              {!isSick && !isVacation && (
                <>
                  {/* Schnelleintrag */}
                  <div className="quick-templates">
                    {QUICK_TEMPLATES.map((tpl, i) => (
                      <button key={i} className="btn template" onClick={() => applyTemplate(tpl)}>
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <div className="time-fields">
                    <div className="field">
                      <label className="field-label">Kommen</label>
                      <select
                        value={currentEntry.start || DEFAULT_START}
                        onChange={e => updateEntry('start', e.target.value)}
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Gehen</label>
                      <select
                        value={currentEntry.end || ''}
                        onChange={e => updateEntry('end', e.target.value)}
                      >
                        <option value="">—</option>
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Pause</label>
                      <select
                        value={currentEntry.pause || '0:00'}
                        onChange={e => updateEntry('pause', e.target.value)}
                      >
                        {PAUSE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Auto-Pause Hinweis */}
                  {currentEntry.start && currentEntry.end && (() => {
                    const minP = autoMinPause(currentEntry.start, currentEntry.end);
                    if (minP > 0) {
                      return <p className="auto-pause-hint">Mindestpause laut ArbZG: {minutesToPause(minP)}</p>;
                    }
                    return null;
                  })()}

                  {/* Arbeitszeit-Anzeige */}
                  {currentEntry.start && currentEntry.end && (
                    <div className="work-duration">
                      <span className="work-duration-label">Arbeitszeit</span>
                      <span className="work-duration-value">
                        {formatDuration(calcWorkMinutes(currentEntry.start, currentEntry.end, currentEntry.pause || '0:00'))}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Speichern / Löschen */}
              <div className="save-row">
                <button className="btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
                {entries[selectedDate] && (
                  <button className="btn danger" onClick={handleDelete} disabled={saving}>
                    Löschen
                  </button>
                )}
              </div>
              {saveMsg && <p className="save-msg">{saveMsg}</p>}
            </div>

            {/* Monatseinträge */}
            <div className="card">
              <h3>Einträge {formatMonthYear(monthKey)}</h3>
              {sortedEntries.length === 0 ? (
                <p className="empty">Noch keine Einträge</p>
              ) : (
                <div className="entries-list">
                  {sortedEntries.map(([date, entry]) => {
                    const hol = isHoliday(date);
                    return (
                      <div
                        key={date}
                        className={`entry-row ${date === selectedDate ? 'selected' : ''} ${entry.sick ? 'sick' : ''} ${entry.urlaub ? 'vacation' : ''}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <span className="entry-date">{formatDate(date)}</span>
                        <span className="entry-time">
                          {entry.sick ? '🤒 Krank' :
                           entry.urlaub ? '🏖️ Urlaub' :
                           `${entry.start}–${entry.end}`}
                        </span>
                        {!entry.sick && !entry.urlaub && entry.start && entry.end && (
                          <span className="entry-hours">
                            {formatDuration(calcWorkMinutes(entry.start, entry.end, entry.pause || '0:00'))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== ÜBERSICHT TAB ====== */}
        {tab === 'uebersicht' && (
          <>
            {/* Monat Navigation */}
            <div className="month-nav">
              <button className="btn icon" onClick={() => setMonthKey(offsetMonth(monthKey, -1))}>‹</button>
              <h3>{formatMonthYear(monthKey)}</h3>
              <button className="btn icon" onClick={() => setMonthKey(offsetMonth(monthKey, 1))}>›</button>
            </div>

            {/* Statistik-Karten */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Arbeitstage</span>
                <span className="stat-value">{monthStats.workDays}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ist-Stunden</span>
                <span className="stat-value">{formatDuration(monthStats.totalMin)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Soll-Stunden</span>
                <span className="stat-value">{formatDuration(monthStats.sollMin)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Differenz</span>
                <span className={`stat-value ${monthStats.diffMin >= 0 ? 'positive' : 'negative'}`}>
                  {formatDuration(monthStats.diffMin)}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Krankheit</span>
                <span className="stat-value">{monthStats.sickDays} Tage</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Urlaub</span>
                <span className="stat-value">{monthStats.vacDays} Tage</span>
              </div>
            </div>

            {/* Arbeitszeiten-Tabelle */}
            <div className="card">
              <h3>Arbeitszeiten</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Datum</th><th>Kommen</th><th>Gehen</th><th>Pause</th><th>Stunden</th></tr>
                  </thead>
                  <tbody>
                    {sortedEntries.map(([date, entry]) => (
                      <tr key={date} className={entry.sick ? 'sick-row' : entry.urlaub ? 'vacation-row' : ''}>
                        <td>{formatDate(date)}</td>
                        <td>{entry.sick ? '' : entry.urlaub ? '' : entry.start || ''}</td>
                        <td>{entry.sick ? '' : entry.urlaub ? '' : entry.end || ''}</td>
                        <td>{entry.sick ? '' : entry.urlaub ? '' : entry.pause || ''}</td>
                        <td>
                          {entry.sick ? '🤒 Krank' :
                           entry.urlaub ? '🏖️ Urlaub' :
                           entry.start && entry.end ? formatDuration(calcWorkMinutes(entry.start, entry.end, entry.pause || '0:00')) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="export-btns">
              <button className="btn primary" onClick={handleExportPDF}>
                📄 PDF-Export
              </button>
              <button className="btn secondary" onClick={handleExportDATEV}>
                📊 DATEV CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ========================================
// HEADER COMPONENT
// ========================================
function Header({ dark, setDark, onLogout, title }) {
  return (
    <header className="header-bar">
      <div className="header-inner">
        <div className="header-left">
          {onLogout && (
            <button className="btn ghost" onClick={onLogout}>← Zurück</button>
          )}
        </div>
        <div className="header-title">
          <span className="header-app-name">{COMPANY_NAME}</span>
          {title && <span className="header-subtitle">{title}</span>}
        </div>
        <div className="header-right">
          <button
            className="btn icon dark-toggle"
            onClick={() => setDark(!dark)}
            title={dark ? 'Hellmodus' : 'Dunkelmodus'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
