/*
  Sydney to Wollongong HSR Construction Simulator
  Vanilla JS educational prototype with simplified project-management logic.
*/

const DATA_FILES = {
  tasks: 'data/tasks.json',
  events: 'data/events.json',
  characters: 'data/characters.json',
  streams: 'data/streams.json',
  ui: 'data/ui_text.json'
};

const MAX_QUARTERS = 16; // 4 years for prototype
const TOTAL_BUDGET = 3200; // in millions AUD (abstracted)

const state = {
  data: { tasks: [], events: [], characters: [], streams: [], ui: {} },
  currentScreen: 'screen-main-menu',
  selectedStream: null,
  selectedCandidates: new Set(),
  recruitedTeam: [],
  quarter: 1,
  year: 1,
  schedule: {}, // taskId => startQuarter
  taskStatus: {}, // taskId => {progress, completed}
  spentBudget: 0,
  morale: 50,
  publicApproval: 50,
  riskIndex: 35,
  quarterLog: [],
  lastEvent: null,
  pathSnapshot: null
};

async function loadData() {
  try {
    const keys = Object.keys(DATA_FILES);
    const loaded = await Promise.all(keys.map(k => fetch(DATA_FILES[k]).then(r => r.json())));
    keys.forEach((k, i) => state.data[k] = loaded[i]);
  } catch (err) {
    console.warn('Fetch failed, using fallback embedded data.', err);
    // graceful fallback if opened directly as file://
    state.data.tasks = window.FALLBACK_TASKS || [];
    state.data.events = window.FALLBACK_EVENTS || [];
    state.data.characters = window.FALLBACK_CHARACTERS || [];
    state.data.streams = window.FALLBACK_STREAMS || [];
    state.data.ui = window.FALLBACK_UI || {};
  }
}

function byId(arr, id) { return arr.find(x => x.id === id); }
function qToYearQuarter(q) { return { year: Math.ceil(q / 4), quarter: ((q - 1) % 4) + 1 }; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  state.currentScreen = id;
}

function initUI() {
  document.getElementById('btn-start').addEventListener('click', () => {
    renderStreams();
    showScreen('screen-stream');
  });

  document.getElementById('btn-confirm-stream').addEventListener('click', () => {
    if (!state.selectedStream) return;
    applyStreamBonuses();
    openRecruitmentWindow();
  });

  document.getElementById('btn-finish-recruitment').addEventListener('click', () => {
    showScreen('screen-planning');
    renderPlanning();
  });

  document.getElementById('btn-next-quarter').addEventListener('click', nextQuarter);
  document.getElementById('btn-event-ok').addEventListener('click', () => {
    document.getElementById('event-modal').classList.add('hidden');
    showReview();
  });
  document.getElementById('btn-review-ok').addEventListener('click', () => {
    document.getElementById('review-modal').classList.add('hidden');
    if (checkEndGame()) {
      renderFinalResults();
      showScreen('screen-final');
    } else {
      renderPlanning();
    }
  });
  document.getElementById('btn-restart').addEventListener('click', () => location.reload());
}

function renderStreams() {
  const wrap = document.getElementById('stream-options');
  wrap.innerHTML = '';
  state.data.streams.forEach(stream => {
    const card = document.createElement('div');
    card.className = 'stream-card';
    card.innerHTML = `<h4>${stream.name}</h4><p>${stream.description}</p>
      <small><b>Bonus:</b> ${stream.starting_bonus}</small><br>
      <small><b>Penalty:</b> ${stream.starting_penalty}</small>`;
    card.onclick = () => {
      state.selectedStream = stream;
      [...wrap.children].forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      document.getElementById('btn-confirm-stream').disabled = false;
    };
    wrap.appendChild(card);
  });
}

function applyStreamBonuses() {
  const s = state.selectedStream;
  if (!s) return;
  state.morale += s.recruitment_bias.morale_bias || 0;
  state.publicApproval += s.recruitment_bias.public_bias || 0;
  state.riskIndex += s.recruitment_bias.risk_bias || 0;
}

function openRecruitmentWindow() {
  showScreen('screen-recruitment');
  state.selectedCandidates.clear();
  const subtitle = document.getElementById('recruitment-subtitle');
  subtitle.textContent = `Year ${state.year}, recruitment window. Pick up to 3 candidates.`;

  const pool = generateCandidatePool();
  const wrap = document.getElementById('candidate-pool');
  wrap.innerHTML = '';

  pool.forEach(c => {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    card.style.backgroundImage = `url('${c.card_background_asset}')`;
    card.style.backgroundSize = 'cover';
    card.innerHTML = `
      <img src="${c.portrait_asset}" alt="Portrait placeholder for ${c.name}">
      <h4>${c.name} (${c.star_rating}★)</h4>
      <p>${c.profession} • ${c.discipline}</p>
      <p>Salary: $${c.annual_salary}m / year</p>
      <p><b>Passive:</b> ${c.passive_skill}</p>
      <p><b>Emergency:</b> ${c.active_skill}</p>
      <small>${c.biography}</small>
    `;
    card.onclick = () => {
      if (state.selectedCandidates.has(c.id)) {
        state.selectedCandidates.delete(c.id);
        card.classList.remove('selected');
      } else if (state.selectedCandidates.size < 3) {
        state.selectedCandidates.add(c.id);
        card.classList.add('selected');
      }
      renderTeamSummary();
    };
    wrap.appendChild(card);
  });
  renderTeamSummary();
}

function generateCandidatePool() {
  const biasDiscipline = state.selectedStream.id;
  const weighted = [];
  state.data.characters.forEach(c => {
    weighted.push(c);
    if (c.discipline.toLowerCase().includes(biasDiscipline.split('-')[0])) weighted.push(c, c);
    if (c.star_rating >= 4 && c.discipline.toLowerCase().includes(biasDiscipline.split('-')[0])) weighted.push(c);
  });
  // unique sample by shuffle
  const picked = [];
  while (picked.length < 8 && weighted.length) {
    const cand = weighted[Math.floor(Math.random() * weighted.length)];
    if (!picked.some(x => x.id === cand.id)) picked.push(cand);
  }
  return picked;
}

function renderTeamSummary() {
  const ids = [...state.selectedCandidates];
  state.recruitedTeam = ids.map(id => byId(state.data.characters, id));
  const salary = state.recruitedTeam.reduce((sum, c) => sum + c.annual_salary, 0);
  document.getElementById('team-summary').textContent =
    `Selected: ${state.recruitedTeam.length} staff • Annual salary total: $${salary}m`;
}

function renderPlanning() {
  const now = qToYearQuarter(state.quarter);
  state.year = now.year;
  document.getElementById('quarter-display').textContent = `Year ${now.year} • Q${now.quarter}`;
  renderTaskBank();
  renderTimeline();
  renderDashboard();
  updateFloatExplainer();
  maybeOpenRecruitmentWindow();
}

function maybeOpenRecruitmentWindow() {
  const quarterInYear = ((state.quarter - 1) % 4) + 1;
  if ((quarterInYear === 1 || quarterInYear === 3) && state.quarter > 1) {
    openRecruitmentWindow();
  }
}

function prerequisitesMet(task, proposedStartQ) {
  return task.prerequisites.every(pid => {
    const start = state.schedule[pid];
    if (!start) return false;
    const parent = byId(state.data.tasks, pid);
    return proposedStartQ >= start + parent.duration_quarters;
  });
}

function teamConflict(task, startQ) {
  if (!task.occupies_team) return false;
  for (const [tid, sQ] of Object.entries(state.schedule)) {
    const other = byId(state.data.tasks, tid);
    if (!other || !other.occupies_team) continue;
    if (other.required_team !== task.required_team) continue;
    const overlap = !(startQ + task.duration_quarters <= sQ || sQ + other.duration_quarters <= startQ);
    if (overlap) return true;
  }
  return false;
}

function renderTaskBank() {
  const bank = document.getElementById('task-bank');
  bank.innerHTML = '';
  state.data.tasks.forEach(task => {
    const card = document.createElement('div');
    const alreadyScheduled = !!state.schedule[task.id];
    card.className = 'task-card' + (alreadyScheduled ? ' locked' : '');
    card.draggable = !alreadyScheduled;
    card.dataset.taskId = task.id;
    card.innerHTML = `
      <strong>${task.id}: ${task.name}</strong>
      <div>${task.description}</div>
      <small>Duration: ${task.duration_quarters}Q | Cost: $${task.cost}m | Team: ${task.required_team}</small><br>
      <small>Prereqs: ${task.prerequisites.length ? task.prerequisites.join(', ') : 'None'} | Risk: ${task.risk_level}</small><br>
      <small>Likely critical: ${task.educational_note.includes('critical') ? 'Yes' : 'Possible'}</small>
    `;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/taskId', task.id);
    });
    bank.appendChild(card);
  });
}

function renderTimeline() {
  const grid = document.getElementById('timeline-grid');
  grid.innerHTML = '';

  for (let q = 1; q <= MAX_QUARTERS; q++) {
    const { year, quarter } = qToYearQuarter(q);
    const cell = document.createElement('div');
    cell.className = 'quarter-cell';
    cell.dataset.q = q;
    cell.innerHTML = `<h5>Y${year} Q${quarter}</h5>`;

    cell.addEventListener('dragover', e => e.preventDefault());
    cell.addEventListener('drop', e => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/taskId');
      tryScheduleTask(taskId, q);
    });

    for (const [tid, startQ] of Object.entries(state.schedule)) {
      if (startQ !== q) continue;
      const task = byId(state.data.tasks, tid);
      const div = document.createElement('div');
      const critical = estimateCriticalTasks().includes(tid);
      div.className = 'scheduled-task' + (critical ? ' critical' : '');
      div.innerHTML = `${tid} (${task.duration_quarters}Q)`;
      cell.appendChild(div);
    }
    grid.appendChild(cell);
  }
}

function tryScheduleTask(taskId, startQ) {
  const task = byId(state.data.tasks, taskId);
  const warning = document.getElementById('warning-box');
  if (!task) return;
  if (state.schedule[taskId]) {
    warning.textContent = `${taskId} is already scheduled.`;
    return;
  }
  if (!prerequisitesMet(task, startQ)) {
    warning.textContent = `Dependency warning: prerequisites for ${taskId} are not complete before Y${qToYearQuarter(startQ).year}Q${qToYearQuarter(startQ).quarter}.`;
    return;
  }
  if (teamConflict(task, startQ)) {
    warning.textContent = `Resource conflict: ${task.required_team} team already occupied in this period.`;
    return;
  }
  state.schedule[taskId] = startQ;
  state.taskStatus[taskId] = { progress: 0, completed: false };
  warning.textContent = `${taskId} placed on timeline successfully.`;
  renderPlanning();
}

function renderDashboard() {
  const salaryQuarter = state.recruitedTeam.reduce((sum, c) => sum + c.annual_salary, 0) / 4;
  const remaining = TOTAL_BUDGET - state.spentBudget;
  document.getElementById('budget-panel').innerHTML = `
    <b>Budget</b><br>Total: $${TOTAL_BUDGET}m<br>
    Spent: $${state.spentBudget.toFixed(1)}m<br>
    Remaining: $${remaining.toFixed(1)}m<br>
    Quarterly staff burn: $${salaryQuarter.toFixed(1)}m`;

  const teamUse = countTeamOccupancy(state.quarter);
  document.getElementById('team-panel').innerHTML = `<b>Team/Resource Occupancy</b><br>${teamUse}`;

  const cTasks = estimateCriticalTasks();
  document.getElementById('critical-panel').innerHTML = `<b>Critical Path Snapshot</b><br>
    Likely critical tasks: ${cTasks.join(', ') || 'Not enough scheduled tasks yet'}<br>
    Risk index: ${state.riskIndex.toFixed(1)} | Public: ${state.publicApproval.toFixed(1)} | Morale: ${state.morale.toFixed(1)}`;

  const progress = calculateRouteProgress();
  document.getElementById('route-progress').style.width = `${progress}%`;
  document.getElementById('route-progress-text').textContent = `${progress.toFixed(0)}% corridor completion`;
}

function countTeamOccupancy(q) {
  const teamCounts = {};
  Object.entries(state.schedule).forEach(([tid, sQ]) => {
    const task = byId(state.data.tasks, tid);
    if (!task || !task.occupies_team) return;
    const active = q >= sQ && q < sQ + task.duration_quarters && !state.taskStatus[tid]?.completed;
    if (active) teamCounts[task.required_team] = (teamCounts[task.required_team] || 0) + 1;
  });
  if (!Object.keys(teamCounts).length) return 'No active team occupation this quarter.';
  return Object.entries(teamCounts).map(([k, v]) => `${k}: ${v}`).join(' | ');
}

function estimateCriticalTasks() {
  // Simplified: tasks with longest dependency depth among scheduled tasks.
  const memo = {};
  function depth(taskId) {
    if (memo[taskId]) return memo[taskId];
    const t = byId(state.data.tasks, taskId);
    if (!t || !state.schedule[taskId]) return 0;
    const parentDepth = t.prerequisites.length ? Math.max(...t.prerequisites.map(depth)) : 0;
    memo[taskId] = parentDepth + t.duration_quarters;
    return memo[taskId];
  }
  const scheduledIds = Object.keys(state.schedule);
  if (!scheduledIds.length) return [];
  const depths = scheduledIds.map(id => ({ id, d: depth(id) }));
  const maxD = Math.max(...depths.map(x => x.d));
  return depths.filter(x => x.d >= maxD - 1).map(x => x.id);
}

function updateFloatExplainer() {
  const critical = new Set(estimateCriticalTasks());
  const delayedNonCritical = [];
  Object.entries(state.schedule).forEach(([tid, sQ]) => {
    if (!critical.has(tid) && sQ > state.quarter) delayedNonCritical.push(tid);
  });
  document.getElementById('float-explainer').textContent = delayedNonCritical.length
    ? `Float/slack note: ${delayedNonCritical.join(', ')} are currently delayed but may not move final completion because they are outside the longest dependency chain.`
    : 'Float/slack note: tasks on the longest dependency chain have little or no float. Delays there usually delay completion.';
}

function nextQuarter() {
  const prevCritical = estimateCriticalTasks();
  processQuarterCostsAndProgress();
  applyPassiveSkills();
  const event = triggerEvent();
  state.lastEvent = event;
  applyEvent(event);
  state.quarter += 1;
  const now = qToYearQuarter(state.quarter);
  state.year = now.year;

  state.pathSnapshot = { prevCritical, nextCritical: estimateCriticalTasks() };
  showEvent(event);
}

function processQuarterCostsAndProgress() {
  // Salary burn
  const salaryQuarter = state.recruitedTeam.reduce((sum, c) => sum + c.annual_salary, 0) / 4;
  state.spentBudget += salaryQuarter;

  Object.entries(state.schedule).forEach(([tid, sQ]) => {
    const task = byId(state.data.tasks, tid);
    const status = state.taskStatus[tid];
    if (!task || !status || status.completed) return;
    if (state.quarter >= sQ) {
      status.progress += 1;
      state.spentBudget += task.cost / task.duration_quarters;
      if (status.progress >= task.duration_quarters) status.completed = true;
    }
  });
}

function applyPassiveSkills() {
  // Simple passive effects every quarter
  state.recruitedTeam.forEach(c => {
    const p = c.passive_skill.toLowerCase();
    if (p.includes('risk')) state.riskIndex -= 0.8;
    if (p.includes('community') || p.includes('consult')) state.publicApproval += 0.8;
    if (p.includes('cost')) state.spentBudget -= 2;
    if (p.includes('safety')) state.riskIndex -= 0.5;
  });
  state.riskIndex = clamp(state.riskIndex, 0, 100);
  state.publicApproval = clamp(state.publicApproval, 0, 100);
  state.spentBudget = Math.max(0, state.spentBudget);
}

function triggerEvent() {
  const available = state.data.events.filter(ev => {
    const minQ = ev.timing_rules?.min_quarter || 1;
    const maxQ = ev.timing_rules?.max_quarter || MAX_QUARTERS;
    return state.quarter >= minQ && state.quarter <= maxQ;
  });
  const pool = [];
  available.forEach(ev => {
    for (let i = 0; i < ev.trigger_weight; i++) pool.push(ev);
  });
  return pool[Math.floor(Math.random() * pool.length)] || available[0];
}

function applyEvent(event) {
  if (!event) return;
  const effects = { ...event.effects };

  // Emergency active skills can only reduce damage in emergencies.
  if (event.type === 'negative' && effects.risk_delta > 0) {
    const emergencyHelpers = state.recruitedTeam.filter(c => c.active_skill_scope === 'emergency');
    const mitigation = emergencyHelpers.reduce((sum, c) => sum + (c.star_rating >= 4 ? 1.5 : 0.8), 0);
    effects.risk_delta = Math.max(0.5, effects.risk_delta - mitigation);
    effects.cost_delta = effects.cost_delta < 0 ? effects.cost_delta : Math.max(1, effects.cost_delta - mitigation * 0.8);
    effects.delay_quarters = effects.delay_quarters ? Math.max(0, effects.delay_quarters - Math.floor(mitigation / 3)) : 0;
  }

  state.spentBudget += effects.cost_delta || 0;
  state.riskIndex += effects.risk_delta || 0;
  state.publicApproval += effects.public_delta || 0;
  state.morale += effects.morale_delta || 0;

  if (effects.delay_quarters > 0) {
    // Delay a random scheduled unfinished non-started-late task
    const candidates = Object.entries(state.schedule).filter(([tid, sQ]) => {
      const st = state.taskStatus[tid];
      return st && !st.completed && sQ >= state.quarter;
    });
    if (candidates.length) {
      const [tid] = candidates[Math.floor(Math.random() * candidates.length)];
      state.schedule[tid] += effects.delay_quarters;
    }
  }

  state.riskIndex = clamp(state.riskIndex, 0, 100);
  state.publicApproval = clamp(state.publicApproval, 0, 100);
  state.morale = clamp(state.morale, 0, 100);
}

function showEvent(event) {
  document.getElementById('event-title').textContent = event ? event.name : 'No major event';
  document.getElementById('event-description').textContent = event ? event.description : '';
  document.getElementById('event-impact').textContent = event
    ? `Impact: cost ${event.effects.cost_delta >= 0 ? '+' : ''}${event.effects.cost_delta || 0}m, risk ${event.effects.risk_delta >= 0 ? '+' : ''}${event.effects.risk_delta || 0}, public ${event.effects.public_delta >= 0 ? '+' : ''}${event.effects.public_delta || 0}, morale ${event.effects.morale_delta >= 0 ? '+' : ''}${event.effects.morale_delta || 0}`
    : '';
  document.getElementById('event-modal').classList.remove('hidden');
}

function showReview() {
  const review = document.getElementById('review-content');
  const prev = state.pathSnapshot?.prevCritical || [];
  const next = state.pathSnapshot?.nextCritical || [];
  const becameCritical = next.filter(x => !prev.includes(x));
  const droppedCritical = prev.filter(x => !next.includes(x));

  const delayedNoImpact = Object.entries(state.schedule)
    .filter(([tid, sQ]) => sQ > state.quarter && !next.includes(tid))
    .map(([tid]) => tid);
  const delayedImpact = Object.entries(state.schedule)
    .filter(([tid, sQ]) => sQ > state.quarter && next.includes(tid))
    .map(([tid]) => tid);

  review.innerHTML = `
    <p><b>Critical path change:</b> New likely critical tasks: ${becameCritical.join(', ') || 'None'}. Tasks that moved off critical focus: ${droppedCritical.join(', ') || 'None'}.</p>
    <p><b>Delays with float:</b> ${delayedNoImpact.join(', ') || 'None'} are delayed but currently have float, so final completion may stay unchanged.</p>
    <p><b>Delays affecting completion:</b> ${delayedImpact.join(', ') || 'None'} are delayed on the longest chain and likely push project finish.</p>
    <p><b>Budget movement:</b> Spend changed due to active tasks, staffing salaries, and quarter event adjustments.</p>
    <p><b>Risk trend:</b> Current risk index ${state.riskIndex.toFixed(1)}. Rising risk means greater chance of future disruption and compliance pressure.</p>
  `;
  document.getElementById('review-modal').classList.remove('hidden');
}

function calculateRouteProgress() {
  const total = state.data.tasks.length || 1;
  const complete = Object.values(state.taskStatus).filter(s => s.completed).length;
  return (complete / total) * 100;
}

function checkEndGame() {
  const allDone = state.data.tasks.every(t => state.taskStatus[t.id]?.completed);
  return allDone || state.quarter > MAX_QUARTERS;
}

function renderFinalResults() {
  const totalDone = Object.values(state.taskStatus).filter(s => s.completed).length;
  const timeScore = Math.max(0, 100 - (state.quarter - 12) * 8);
  const budgetScore = Math.max(0, 100 - Math.max(0, state.spentBudget - TOTAL_BUDGET) / 10);
  const riskScore = 100 - state.riskIndex;
  const publicScore = state.publicApproval;
  const overall = ((timeScore + budgetScore + riskScore + publicScore) / 4).toFixed(1);

  let ending = 'Delayed but technically successful';
  if (overall >= 85 && budgetScore > 75 && timeScore > 75) ending = 'Best overall outcome';
  else if (timeScore >= 80 && budgetScore >= 80) ending = 'On time and under budget';
  else if (timeScore >= 80 && budgetScore < 80) ending = 'On time but over budget';
  else if (budgetScore >= 80 && publicScore < 45) ending = 'Financially controlled but socially unpopular';
  else if (overall < 45 || totalDone < state.data.tasks.length * 0.6) ending = 'Project failure';

  document.getElementById('final-results').innerHTML = `
    <p><b>Tasks completed:</b> ${totalDone}/${state.data.tasks.length}</p>
    <p><b>Time performance:</b> ${timeScore.toFixed(1)}</p>
    <p><b>Budget performance:</b> ${budgetScore.toFixed(1)}</p>
    <p><b>Risk control:</b> ${riskScore.toFixed(1)}</p>
    <p><b>Community/public acceptance:</b> ${publicScore.toFixed(1)}</p>
    <p><b>Overall outcome:</b> ${overall}</p>
    <h3>${ending}</h3>
  `;
}

function loadEmbeddedFallbackData() {
  // very small fallback if direct file open blocks JSON fetch
  window.FALLBACK_UI = { labels: { start: 'Start' } };
  window.FALLBACK_STREAMS = [
    { id: 'geotechnical', name: 'Geotechnical', description: 'Ground and subsurface focus.', recruitment_bias: { morale_bias: 2, risk_bias: -2, public_bias: 0 }, starting_bonus: '+Ground risk insight', starting_penalty: '-Community optics' }
  ];
  window.FALLBACK_TASKS = [];
  window.FALLBACK_EVENTS = [];
  window.FALLBACK_CHARACTERS = [];
}

async function boot() {
  loadEmbeddedFallbackData();
  await loadData();
  document.querySelectorAll('[data-bg]').forEach(el => {
    const bg = el.getAttribute('data-bg');
    if (bg) {
      el.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url('${bg}')`;
      el.style.backgroundSize = 'cover';
    }
  });
  initUI();
  showScreen('screen-main-menu');
}

boot();
