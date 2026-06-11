const BASE_DATA = window.UNICAL_GAMES_DATA;
const STORAGE_KEY = 'unical-games-2026-results-v2';
const state = { q: '', discipline: 'all', stage: 'all', edit: false, view: 'site', data: null, overrides: loadOverrides() };
const $ = s => document.querySelector(s);
const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cellKey = (sheetName, r, c) => `${sheetName}||${r}||${c}`;

function init() {
  applyOverrides();
  $('#countSheets').textContent = state.data.sheets.length;
  fillSelects();
  renderRules();
  render();
  renderAdmin();
  renderRosters();

  $('#search').addEventListener('input', e => { state.q = e.target.value; render(); renderRosters(); });
  $('#discipline').addEventListener('change', e => { state.discipline = e.target.value; render(); renderAdmin(); renderRosters(); });
  $('#stage').addEventListener('change', e => { state.stage = e.target.value; render(); renderAdmin(); renderRosters(); });
  $('#reset').addEventListener('click', resetFilters);
  $('#themeBtn').addEventListener('click', toggleTheme);
  $('#editBtn').addEventListener('click', toggleEditMode);
  $('#exportBtn').addEventListener('click', exportDataJs);
  $('#downloadJsonBtn').addEventListener('click', exportOverridesJson);
  $('#importFile').addEventListener('change', importOverrides);
  $('#clearLocalBtn').addEventListener('click', clearLocalResults);
  $('#adminJump').addEventListener('click', () => document.getElementById('admin').scrollIntoView({ behavior: 'smooth' }));
  $('#rostersJump').addEventListener('click', () => document.getElementById('rosters').scrollIntoView({ behavior: 'smooth' }));
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveOverrides() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overrides));
  applyOverrides();
  render();
  renderAdmin();
}
function applyOverrides() {
  state.data = structuredClone(BASE_DATA);
  for (const s of state.data.sheets) {
    const byPos = new Map(s.cells.map(c => [`${c.r}|${c.c}`, c]));
    Object.entries(state.overrides).forEach(([key, value]) => {
      const [sheetName, rStr, cStr] = key.split('||');
      if (sheetName !== s.name) return;
      const pos = `${rStr}|${cStr}`;
      if (!value || value.deleted) {
        if (byPos.has(pos)) byPos.get(pos).v = '';
        return;
      }
      const cell = { r: Number(rStr), c: Number(cStr), v: value.v || '', kind: value.kind || guessKind(value.v) };
      if (value.team) cell.team = value.team;
      if (value.score) cell.score = value.score;
      if (byPos.has(pos)) Object.assign(byPos.get(pos), cell);
      else s.cells.push(cell);
    });
    s.cells = s.cells.filter(c => c.v !== '').sort((a, b) => a.r - b.r || a.c - b.c);
  }
}
function guessKind(v) {
  const x = (v || '').trim();
  if (!x) return 'placeholder';
  if (/^gara\s*\d+/i.test(x)) return 'match';
  if (/\(.+\)/.test(x)) return 'result';
  if (/tabellone|girone|gold|silver/i.test(x)) return 'title';
  return 'team';
}
function resetFilters() {
  state.q = ''; state.discipline = 'all'; state.stage = 'all';
  $('#search').value = ''; $('#discipline').value = 'all'; $('#stage').value = 'all';
  render(); renderAdmin(); renderRosters();
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  $('#themeBtn').textContent = dark ? 'Tema scuro' : 'Tema chiaro';
}
function toggleEditMode() {
  state.edit = !state.edit;
  $('#editBtn').textContent = state.edit ? 'Disattiva modifica' : 'Modifica tabelloni';
  $('#editBtn').classList.toggle('primary', state.edit);
  render();
}
function fillSelects() {
  const disciplines = ['all', ...new Set(state.data.sheets.map(s => s.discipline))];
  $('#discipline').innerHTML = disciplines.map(x => `<option value="${esc(x)}">${x === 'all' ? 'Tutte le discipline' : esc(x)}</option>`).join('');
  const stages = ['all', ...new Set(state.data.sheets.map(s => s.stage))];
  $('#stage').innerHTML = stages.map(x => `<option value="${esc(x)}">${x === 'all' ? 'Tutte le fasi' : esc(x)}</option>`).join('');
}
function renderRules() {
  const r = state.data.regole;
  $('#rules').innerHTML = `<h2>Regolamento in breve</h2><p class="muted">Periodo: <strong>${esc(r.periodo)}</strong>. Iscrizioni: <strong>${esc(r.iscrizioni)}</strong>. Discipline: ${r.discipline.map(esc).join(', ')}.</p><div class="rule-grid">${r.vincoli.map(v => `<div class="rule"><strong>${esc(v.disciplina)}</strong><div>${esc(v.rosa || '')}</div><div class="muted">${esc(v.vincoli || v.formula || '')}</div></div>`).join('')}</div>`;
}
function keep(sheet) {
  if (state.discipline !== 'all' && sheet.discipline !== state.discipline) return false;
  if (state.stage !== 'all' && sheet.stage !== state.stage) return false;
  const hay = norm([sheet.name, ...sheet.cells.map(c => c.v), ...sheet.matches.flatMap(m => [m.label, ...(m.teams || [])])].join(' '));
  return !state.q || hay.includes(norm(state.q));
}
function render() {
  const sheets = state.data.sheets.filter(keep);
  $('#cards').innerHTML = sheets.map(renderSheet).join('') || '<p class="muted">Nessun tabellone trovato.</p>';
  if (state.edit) attachCellEditors();
  updateStats();
}
function updateStats() {
  const results = state.data.sheets.flatMap(s => s.cells).filter(c => c.kind === 'result').length;
  $('#countResults').textContent = results;
  $('#countLocal').textContent = Object.keys(state.overrides).length;
}
function renderSheet(s) {
  const stageClass = s.stage === 'Golden' ? 'gold' : s.stage === 'Silver' ? 'silver' : '';
  return `<article class="sport-card"><div class="sport-head"><h2>${esc(s.name)}</h2><div class="badges"><span class="badge">${esc(s.discipline)}</span><span class="badge ${stageClass}">${esc(s.stage)}</span><span class="badge">${s.matches.length} gare</span></div></div><div class="content">${s.groups && s.groups.length ? renderGroups(s) : renderGrid(s)}${renderMatches(s)}</div></article>`;
}
function renderGrid(s) {
  const style = `grid-template-columns:repeat(${s.cols},minmax(88px,1fr));grid-template-rows:repeat(${s.rows},auto)`;
  const byPos = new Map(s.cells.map(c => [`${c.r}|${c.c}`, c]));
  let html = '';
  if (state.edit) {
    for (let r = 1; r <= s.rows; r++) {
      for (let c = 1; c <= s.cols; c++) {
        const cell = byPos.get(`${r}|${c}`) || { r, c, v: '', kind: 'empty' };
        html += renderCell(s, cell, true);
      }
    }
  } else {
    html = s.cells.map(c => renderCell(s, c, false)).join('');
  }
  return `<div class="bracket-wrap"><div class="bracket-grid ${state.edit ? 'editing' : ''}" style="${style}">${html}</div></div>`;
}
function renderCell(s, c, editable) {
  const label = c.v ? esc(c.v) : '<span class="muted">+</span>';
  return `<div class="cell ${esc(c.kind || 'placeholder')} ${editable ? 'editable' : ''}" style="grid-row:${c.r};grid-column:${c.c}" data-sheet="${esc(s.name)}" data-r="${c.r}" data-c="${c.c}" title="${editable ? 'Clicca per modificare' : ''}">${label}</div>`;
}
function renderGroups(s) {
  return `<div class="groups">${s.groups.map(g => `<section class="group"><h3>${esc(g.name)}</h3><p class="teams">${g.teams.map(esc).join(' - ')}</p>${g.games.map(x => `<div class="game-row"><span class="muted">${esc(x.label)}</span><strong>${esc(x.team1)}</strong><span class="score">${esc(x.score || 'vs')}</span><strong>${esc(x.team2)}</strong></div>`).join('')}</section>`).join('')}</div>${renderGrid(s)}`;
}
function renderMatches(s) {
  if (!s.matches.length) return '';
  return `<div class="match-list">${s.matches.slice(0, 80).map(m => `<div class="match-card"><h3>${esc(m.label)}</h3><div class="teams">${(m.teams || []).map(esc).join(' · ') || 'Da definire'}</div>${m.placeholders && m.placeholders.length ? `<div class="muted">${m.placeholders.map(esc).join(' · ')}</div>` : ''}</div>`).join('')}</div>`;
}
function attachCellEditors() {
  document.querySelectorAll('.cell.editable').forEach(el => {
    el.addEventListener('click', () => editCell(el.dataset.sheet, Number(el.dataset.r), Number(el.dataset.c)));
  });
}
function editCell(sheetName, r, c) {
  const sheet = state.data.sheets.find(s => s.name === sheetName);
  const current = sheet?.cells.find(x => x.r === r && x.c === c)?.v || '';
  const value = prompt(`Risultato / testo per ${sheetName}, riga ${r}, colonna ${c}\nEsempio: DESF (2-1). Lascia vuoto per cancellare.`, current);
  if (value === null) return;
  const key = cellKey(sheetName, r, c);
  if (!value.trim()) state.overrides[key] = { deleted: true };
  else {
    const score = (value.match(/\(([^)]+)\)/) || [])[1] || '';
    const team = value.replace(/\s*\([^)]*\)\s*/g, '').trim();
    state.overrides[key] = { v: value.trim(), kind: guessKind(value), team, score };
  }
  saveOverrides();
}

function renderRosters() {
  const list = state.data.rosters || [];
  const filtered = list.filter(r => {
    if (state.discipline !== 'all') {
      const d = norm(state.discipline);
      const rd = norm(r.disciplina);
      if (!rd.includes(d) && !d.includes(rd.replace(' a 7', '')) && !(d === 'calcio' && rd.includes('calcio a 7'))) return false;
    }
    const hay = norm([r.squadra, r.disciplina, ...r.atleti.flatMap(a => [a.nome, a.cognome, a.categoria])].join(' '));
    return !state.q || hay.includes(norm(state.q));
  });
  const total = list.reduce((sum, r) => sum + r.atleti.length, 0);
  const html = `<div class="section-head"><div><p class="eyebrow">Formazioni</p><h2>Rose squadre</h2><p class="muted">Dati pubblicati: solo nome, cognome e categoria. Totale nominativi caricati: <strong>${total}</strong>.</p></div></div>` +
    (filtered.length ? `<div class="roster-grid">${filtered.map(renderRosterCard).join('')}</div>` : '<p class="muted">Nessuna formazione trovata con i filtri attivi.</p>');
  $('#rosters').innerHTML = html;
}
function renderRosterCard(r) {
  const counts = r.atleti.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || 0) + 1; return acc; }, {});
  const countText = Object.entries(counts).map(([k, v]) => `${esc(k)}: ${v}`).join(' · ');
  return `<article class="roster-card"><div class="roster-head"><div><h3>${esc(r.squadra)} · ${esc(r.disciplina)}</h3><p class="muted">${r.atleti.length} persone · ${countText}</p></div></div><div class="roster-list">${r.atleti.map(a => `<div class="athlete"><span>${esc(a.nome)} ${esc(a.cognome)}</span><strong>${esc(a.categoria)}</strong></div>`).join('')}</div></article>`;
}

function renderAdmin() {
  const sheets = state.data.sheets.filter(keep);
  const rows = [];
  for (const s of sheets) {
    const cells = s.cells.filter(c => ['result', 'match', 'team'].includes(c.kind));
    cells.forEach(c => rows.push({ sheet: s.name, discipline: s.discipline, stage: s.stage, r: c.r, c: c.c, text: c.v, kind: c.kind }));
  }
  $('#adminRows').innerHTML = rows.slice(0, 200).map(x => `<tr><td>${esc(x.sheet)}</td><td>${esc(x.kind)}</td><td>${x.r},${x.c}</td><td>${esc(x.text)}</td><td><button type="button" data-admin-edit="${esc(x.sheet)}||${x.r}||${x.c}">Modifica</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nessuna voce con i filtri attivi.</td></tr>';
  document.querySelectorAll('[data-admin-edit]').forEach(btn => btn.addEventListener('click', () => {
    const [sheet, r, c] = btn.dataset.adminEdit.split('||'); editCell(sheet, Number(r), Number(c));
  }));
  updateStats();
}
function exportDataJs() {
  applyOverrides();
  const text = 'window.UNICAL_GAMES_DATA = ' + JSON.stringify(state.data, null, 2) + ';\n';
  downloadText('data.js', text, 'application/javascript');
}
function exportOverridesJson() {
  downloadText('risultati-unical-games.json', JSON.stringify(state.overrides, null, 2), 'application/json');
}
function importOverrides(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.overrides = JSON.parse(reader.result);
      saveOverrides();
      alert('Risultati importati. Ora puoi esportare data.js oppure continuare a modificarli.');
    } catch { alert('File non valido. Importa un JSON esportato da questo sito.'); }
    e.target.value = '';
  };
  reader.readAsText(file);
}
function clearLocalResults() {
  if (!confirm('Cancellare tutte le modifiche salvate in questo browser?')) return;
  state.overrides = {};
  localStorage.removeItem(STORAGE_KEY);
  applyOverrides(); render(); renderAdmin();
}
function downloadText(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function esc(s) { return (s ?? '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
init();
