import {
  COMPANY_NAME, formatDateShort, formatDuration, formatMonthYear,
  daysInMonth, calcWorkMinutes, pauseToMinutes, calcSollMinutes,
  isHoliday, isWeekend, getHolidays
} from './helpers.js';

export function generatePDF(entries, monthKey, userName, sollStundenWoche = 40) {
  const days = daysInMonth(monthKey);
  const year = parseInt(monthKey.substring(0, 4));
  const holidays = getHolidays(year);

  // Statistiken berechnen
  let totalWorkMin = 0;
  let sickDays = 0;
  let vacationDays = 0;
  let workDays = 0;

  const rows = days.map(day => {
    const entry = entries[day] || {};
    const d = new Date(day + 'T00:00:00');
    const dayName = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()];
    const dateStr = formatDateShort(day);
    const holiday = holidays[day];
    const weekend = isWeekend(day);

    if (entry.sick) {
      sickDays++;
      return { dateStr, dayName, start: '', end: '', pause: '', hours: '', note: 'Krank', weekend, holiday };
    }
    if (entry.urlaub) {
      vacationDays++;
      return { dateStr, dayName, start: '', end: '', pause: '', hours: '', note: 'Urlaub', weekend, holiday };
    }
    if (entry.start && entry.end) {
      const workMin = calcWorkMinutes(entry.start, entry.end, entry.pause || '0:00');
      totalWorkMin += workMin;
      workDays++;
      return {
        dateStr, dayName,
        start: entry.start,
        end: entry.end,
        pause: entry.pause || '0:00',
        hours: formatDuration(workMin),
        note: '',
        weekend,
        holiday
      };
    }
    return { dateStr, dayName, start: '', end: '', pause: '', hours: '', note: holiday || '', weekend, holiday };
  });

  const sollMin = calcSollMinutes(monthKey, sollStundenWoche);
  const diffMin = totalWorkMin - sollMin;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Arbeitszeitnachweis ${formatMonthYear(monthKey)} – ${userName}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #222; line-height: 1.4; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #007aff; padding-bottom: 10px; }
  .header h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  .header h2 { font-size: 13px; font-weight: 400; color: #555; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; }
  .meta span { background: #f0f0f5; padding: 4px 10px; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #007aff; color: white; font-weight: 600; padding: 5px 6px; text-align: left; font-size: 10px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e5ea; font-size: 10px; }
  tr.weekend td { background: #f9f9f9; color: #999; }
  tr.holiday td { background: #fff3e0; }
  tr.sick td { background: #fce4ec; }
  tr.vacation td { background: #e3f2fd; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .summary-box { flex: 1; min-width: 120px; background: #f0f0f5; border-radius: 8px; padding: 10px; text-align: center; }
  .summary-box .label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-box .value { font-size: 18px; font-weight: 700; color: #007aff; margin-top: 2px; }
  .summary-box .value.negative { color: #ff3b30; }
  .summary-box .value.positive { color: #34c759; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 12px; }
  .sig-line { width: 45%; text-align: center; }
  .sig-line .line { border-top: 1px solid #333; margin-bottom: 4px; margin-top: 50px; }
  .sig-line .label { font-size: 10px; color: #666; }
  .footer { text-align: center; margin-top: 24px; font-size: 9px; color: #999; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${COMPANY_NAME}</h1>
    <h2>Arbeitszeitnachweis – ${formatMonthYear(monthKey)}</h2>
  </div>
  <div class="meta">
    <span><strong>Mitarbeiter:</strong> ${userName}</span>
    <span><strong>Soll-Stunden/Woche:</strong> ${sollStundenWoche}h</span>
  </div>
  <div class="summary">
    <div class="summary-box">
      <div class="label">Arbeitstage</div>
      <div class="value">${workDays}</div>
    </div>
    <div class="summary-box">
      <div class="label">Ist-Stunden</div>
      <div class="value">${formatDuration(totalWorkMin)}</div>
    </div>
    <div class="summary-box">
      <div class="label">Soll-Stunden</div>
      <div class="value">${formatDuration(sollMin)}</div>
    </div>
    <div class="summary-box">
      <div class="label">Differenz</div>
      <div class="value ${diffMin >= 0 ? 'positive' : 'negative'}">${formatDuration(diffMin)}</div>
    </div>
    <div class="summary-box">
      <div class="label">Krankheit</div>
      <div class="value">${sickDays} Tage</div>
    </div>
    <div class="summary-box">
      <div class="label">Urlaub</div>
      <div class="value">${vacationDays} Tage</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Tag</th><th>Datum</th><th>Kommen</th><th>Gehen</th><th>Pause</th><th>Arbeitszeit</th><th>Bemerkung</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => {
        let cls = '';
        if (r.note === 'Krank') cls = 'sick';
        else if (r.note === 'Urlaub') cls = 'vacation';
        else if (r.holiday) cls = 'holiday';
        else if (r.weekend) cls = 'weekend';
        return `<tr class="${cls}">
          <td>${r.dayName}</td>
          <td>${r.dateStr}</td>
          <td>${r.start}</td>
          <td>${r.end}</td>
          <td>${r.pause}</td>
          <td>${r.hours}</td>
          <td>${r.note || (r.holiday && !r.start ? r.holiday : '')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <div class="signatures">
    <div class="sig-line">
      <div class="line"></div>
      <div class="label">Datum, Unterschrift Mitarbeiter</div>
    </div>
    <div class="sig-line">
      <div class="line"></div>
      <div class="label">Datum, Unterschrift Arbeitgeber</div>
    </div>
  </div>
  <div class="footer">Erstellt mit ${COMPANY_NAME} Zeiterfassung</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}
