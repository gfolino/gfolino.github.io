const BASE_DATA = window.UNICAL_GAMES_DATA;
const STORAGE_KEY = 'unical-games-2026-results-v2';
const state = { q: '', discipline: 'all', stage: 'all', edit: false, mainTab: 'tabelloni', selectedTeam: null, selectedRosterDiscipline: null, data: null, overrides: loadOverrides() };
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
  renderSchedule();
  showMainTab('tabelloni');

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
  document.querySelectorAll('[data-main-tab]').forEach(btn => btn.addEventListener('click', () => showMainTab(btn.dataset.mainTab)));
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-team-roster]');
    const all = e.target.closest('[data-show-all-rosters]');
    const rosterTab = e.target.closest('[data-roster-tab]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openTeamRoster(btn.dataset.teamRoster);
      return;
    }
    if (all) {
      e.preventDefault();
      state.selectedTeam = null;
      state.selectedRosterDiscipline = null;
      renderRosters();
    }
    if (rosterTab) {
      e.preventDefault();
      state.selectedRosterDiscipline = rosterTab.dataset.rosterTab || null;
      renderRosters();
      showMainTab('formazioni');
    }
  });
}

function showMainTab(tab) {
  state.mainTab = tab;
  document.querySelectorAll('[data-main-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.mainTab === tab));
  document.querySelectorAll('.app-section').forEach(panel => panel.classList.toggle('active', panel.id === `${tab}-panel`));
  const toolbar = $('#filtersToolbar');
  if (toolbar) toolbar.classList.toggle('hidden', !['tabelloni', 'formazioni'].includes(tab));
  if (tab === 'formazioni') renderRosters();
  if (tab === 'orari') renderSchedule();
  if (tab === 'gestione') renderAdmin();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  state.q = ''; state.discipline = 'all'; state.stage = 'all'; state.selectedTeam = null;
  $('#search').value = ''; $('#discipline').value = 'all'; $('#stage').value = 'all';
  render(); renderAdmin(); renderRosters();
}
function openTeamRoster(team) {
  state.selectedTeam = team;
  state.selectedRosterDiscipline = null;
  renderRosters();
  showMainTab('formazioni');
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
  const label = c.v ? renderTeamText(c.v, c.team) : '<span class="muted">+</span>';
  return `<div class="cell ${esc(c.kind || 'placeholder')} ${editable ? 'editable' : ''}" style="grid-row:${c.r};grid-column:${c.c}" data-sheet="${esc(s.name)}" data-r="${c.r}" data-c="${c.c}" title="${editable ? 'Clicca per modificare' : ''}">${label}</div>`;
}
function knownTeams() {
  return new Set((state.data?.rosters || []).map(r => norm(r.squadra)));
}
function extractTeamFromText(text, explicitTeam) {
  const t = (explicitTeam || '').trim();
  if (t) return t;
  const clean = (text || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
  if (/^[A-Z]{2,12}$/.test(clean)) return clean;
  return '';
}
function renderTeamText(text, explicitTeam) {
  const team = extractTeamFromText(text, explicitTeam);
  if (!team) return esc(text);
  const escapedText = esc(text);
  const escapedTeam = esc(team);
  const teamButton = `<button type="button" class="team-link" data-team-roster="${escapedTeam}" title="Apri formazione ${escapedTeam}">${escapedTeam}</button>`;
  return escapedText.replace(escapedTeam, teamButton);
}
function renderGroups(s) {
  return `<div class="groups">${s.groups.map(g => `<section class="group"><h3>${esc(g.name)}</h3><p class="teams">${g.teams.map(t => renderTeamText(t)).join(' - ')}</p>${g.games.map(x => `<div class="game-row"><span class="muted">${esc(x.label)}</span><strong>${renderTeamText(x.team1)}</strong><span class="score">${esc(x.score || 'vs')}</span><strong>${renderTeamText(x.team2)}</strong></div>`).join('')}</section>`).join('')}</div>${renderGrid(s)}`;
}
function renderMatches(s) {
  if (!s.matches.length) return '';
  return `<div class="match-list">${s.matches.slice(0, 80).map(m => `<div class="match-card"><h3>${esc(m.label)}</h3><div class="teams">${(m.teams || []).map(t => renderTeamText(t)).join(' · ') || 'Da definire'}</div>${m.placeholders && m.placeholders.length ? `<div class="muted">${m.placeholders.map(esc).join(' · ')}</div>` : ''}</div>`).join('')}</div>`;
}
function attachCellEditors() {
  document.querySelectorAll('.cell.editable').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-team-roster]')) return;
      editCell(el.dataset.sheet, Number(el.dataset.r), Number(el.dataset.c));
    });
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
  const allTeams = [...new Set(list.map(r => r.squadra))].sort((a, b) => a.localeCompare(b, 'it'));
  const total = list.reduce((sum, r) => sum + r.atleti.length, 0);

  if (state.selectedTeam) {
    const teamRosters = list.filter(r => norm(r.squadra) === norm(state.selectedTeam));
    const disciplines = teamRosters.map(r => r.disciplina);
    const activeDiscipline = state.selectedRosterDiscipline && disciplines.includes(state.selectedRosterDiscipline)
      ? state.selectedRosterDiscipline
      : disciplines[0];
    if (!state.selectedRosterDiscipline && activeDiscipline) state.selectedRosterDiscipline = activeDiscipline;
    const activeRoster = teamRosters.find(r => r.disciplina === activeDiscipline);
    const totalTeam = teamRosters.reduce((sum, r) => sum + r.atleti.length, 0);
    const summary = teamRosters.map(r => `<button type="button" class="roster-pill ${r.disciplina === activeDiscipline ? 'active' : ''}" data-roster-tab="${esc(r.disciplina)}"><span>${esc(r.disciplina)}</span><strong>${r.atleti.length}</strong></button>`).join('');
    const body = activeRoster
      ? renderRosterDetail(activeRoster)
      : `<div class="empty-state"><h3>Formazione non ancora caricata</h3><p>Per ${esc(state.selectedTeam)} non risultano file rosa collegati.</p></div>`;
    $('#rosters').innerHTML = `
      <section class="roster-shell focused-roster">
        <div class="roster-hero">
          <div>
            <p class="eyebrow">Formazione squadra</p>
            <h2>${esc(state.selectedTeam)}</h2>
            <p class="muted">${teamRosters.length ? `${totalTeam} nominativi caricati, organizzati per disciplina. Dati pubblicati: solo nome, cognome e categoria.` : 'Nessuna formazione caricata per questa squadra.'}</p>
          </div>
          <button type="button" class="small ghost" data-show-all-rosters="1">Tutte le squadre</button>
        </div>
        ${teamRosters.length ? `<div class="roster-tabs" role="tablist" aria-label="Discipline formazione">${summary}</div>` : ''}
        ${body}
      </section>`;
    return;
  }

  const filteredTeams = allTeams.filter(team => {
    if (!state.q) return true;
    const teamRows = list.filter(r => norm(r.squadra) === norm(team));
    const hay = norm([team, ...teamRows.flatMap(r => [r.disciplina, ...r.atleti.flatMap(a => [a.nome, a.cognome, a.categoria])])].join(' '));
    return hay.includes(norm(state.q));
  });
  const cards = filteredTeams.length
    ? filteredTeams.map(team => renderTeamOverview(team, list.filter(r => norm(r.squadra) === norm(team)))).join('')
    : `<div class="empty-state"><h3>Nessuna formazione trovata</h3><p>Clicca una squadra nei tabelloni o carica un nuovo file squadra in data.js.</p></div>`;
  $('#rosters').innerHTML = `
    <section class="roster-shell">
      <div class="section-head roster-titlebar">
        <div>
          <p class="eyebrow">Formazioni</p>
          <h2>Rose squadre</h2>
          <p class="muted">Clicca una squadra nei tabelloni o aprila da qui. Dati pubblicati: solo nome, cognome e categoria. Totale nominativi caricati: <strong>${total}</strong>.</p>
        </div>
        <span class="badge">${allTeams.length} squadre con rosa</span>
      </div>
      <div class="team-overview-grid">${cards}</div>
    </section>`;
}
function renderTeamOverview(team, rosters) {
  const total = rosters.reduce((sum, r) => sum + r.atleti.length, 0);
  const discs = rosters.map(r => `<span>${esc(r.disciplina)} <strong>${r.atleti.length}</strong></span>`).join('');
  return `<article class="team-overview-card"><div class="team-avatar">${esc(team.slice(0, 3))}</div><div class="team-overview-body"><h3>${esc(team)}</h3><p class="muted">${total} nominativi · ${rosters.length} discipline</p><div class="discipline-chips">${discs}</div><button type="button" class="primary open-roster" data-team-roster="${esc(team)}">Apri formazione</button></div></article>`;
}
function renderRosterDetail(r) {
  const categories = r.atleti.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || 0) + 1; return acc; }, {});
  const stats = Object.entries(categories).map(([k, v]) => `<div class="stat-card"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('');
  const rows = r.atleti.map((a, i) => `<tr><td>${i + 1}</td><td><strong>${esc(a.cognome)}</strong></td><td>${esc(a.nome)}</td><td><span class="category-badge ${norm(a.categoria).includes('dip') ? 'employee' : 'student'}">${esc(a.categoria)}</span></td></tr>`).join('');
  return `<article class="roster-detail"><div class="roster-detail-head"><div><h3>${esc(r.disciplina)}</h3><p class="muted">${r.atleti.length} persone nella rosa caricata.</p></div><div class="roster-stats"><div class="stat-card total"><span>Totale</span><strong>${r.atleti.length}</strong></div>${stats}</div></div><div class="roster-table-wrap"><table class="roster-table"><thead><tr><th>#</th><th>Cognome</th><th>Nome</th><th>Categoria</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;
}
function renderRosterCard(r) {
  return renderRosterDetail(r);
}

function renderSchedule() {
  const schedule = state.data.schedule || [];
  const filtered = schedule.filter(item => {
    const hay = norm([item.disciplina, item.fase, item.gara, item.squadre, item.luogo, item.data, item.ora].join(' '));
    if (state.discipline !== 'all' && item.disciplina !== state.discipline) return false;
    if (state.stage !== 'all' && item.fase !== state.stage) return false;
    return !state.q || hay.includes(norm(state.q));
  });
  const grouped = filtered.reduce((acc, item) => {
    (acc[item.data] ||= []).push(item);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();
  const body = dates.length ? dates.map(date => {
    const label = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00'));
    const rows = grouped[date].sort((a, b) => a.ora.localeCompare(b.ora)).map(item => `
      <tr>
        <td><strong>${esc(item.ora)}</strong></td>
        <td><span class="badge">${esc(item.disciplina)}</span></td>
        <td><strong>${esc(item.gara)}</strong><div class="muted">${esc(item.fase)} · ${esc(item.squadre)}</div></td>
        <td>${esc(item.luogo)}</td>
        <td><span class="status-pill ${item.placeholder ? 'placeholder' : ''}">${item.placeholder ? 'Da definire' : 'Confermato'}</span></td>
      </tr>`).join('');
    return `<article class="schedule-day"><h3>${esc(label)}</h3><div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>Ora</th><th>Disciplina</th><th>Gara</th><th>Luogo</th><th>Stato</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;
  }).join('') : '<div class="empty-state"><h3>Nessun orario trovato</h3><p>Prova a cambiare ricerca o filtri.</p></div>';
  $('#schedule').innerHTML = `
    <div class="schedule-head">
      <div>
        <p class="eyebrow">Orari di gioco</p>
        <h2>Calendario gare</h2>
        <p class="muted">Calendario importato dagli Excel caricati. Le voci con squadre non ancora definite sono evidenziate come <strong>Da definire</strong>.</p>
      </div>
      <span class="badge">${filtered.length} eventi</span>
    </div>
    <div class="schedule-grid">${body}</div>`;
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
