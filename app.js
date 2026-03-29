// ─── GUIDE ZONES (Acts 1-10 in order) ───────────────────────────────────────
const GUIDE_ZONES_ORDERED = [
  // ACT 1
  "Lioneye's Watch","The Coast","The Mud Flats","The Submerged Passage",
  "The Ledge","The Climb","The Lower Prison","The Upper Prison",
  "Prisoner's Gate","The Ship Graveyard","The Cavern of Wrath","The Cavern of Anger",
  // ACT 2
  "The Southern Forest","The Forest Encampment","The Old Fields","The Crossroads",
  "The Broken Bridge","The Fellshrine Ruins","The Chamber of Sins Level 1",
  "The Chamber of Sins Level 2","The Riverways","The Western Forest","The Eastern Forest",
  "The Wetlands","The Vaal Ruins","The Northern Forest","The Caverns","The Ancient Pyramid",
  // ACT 3
  "The Sarn Encampment","The City of Sarn","The Marketplace","The Battlefront","The Docks",
  "The Sewers","The Ebony Barracks","The Imperial Gardens","The Library","The Archives",
  "The Lunaris Temple Level 1","The Lunaris Temple Level 2",
  "The Solaris Temple Level 1","The Solaris Temple Level 2",
  "The Threshold","The Belly of the Beast Level 1","The Belly of the Beast Level 2","The Harvest",
  // ACT 4
  "Highgate","The Dried Lake","The Mines Level 1","The Mines Level 2",
  "The Crystal Veins","Kaom's Dream","Daresso's Dream","The Black Core",
  // ACT 5
  "Overseer's Tower","The Slave Pens","The Control Blocks","Oriath Square",
  "The Cathedral Rooftop","The Chamber of Innocence",
  // ACT 6
  "Lioneye's Watch (Act 6)","The Coast (Act 6)","The Mud Flats (Act 6)",
  "The Karui Fortress","The Ridge","The Lower Prison (Act 6)","The Warden's Chambers",
  "The Prisoner's Gate (Act 6)","The Riverways (Act 6)","The Western Forest (Act 6)",
  "The Eastern Forest (Act 6)","The Wetlands (Act 6)","The Beacon",
  // ACT 7
  "The Bridge Encampment","The Broken Bridge (Act 7)","The Crossroads (Act 7)",
  "The Chamber of Sins Level 1 (Act 7)","The Chamber of Sins Level 2 (Act 7)",
  "The Ashen Fields","The Northern Forest (Act 7)","The Causeway","The Vaal City",
  "The Temple of Decay Level 1","The Temple of Decay Level 2",
  // ACT 8
  "Sarn Ramparts","The Quay","The Grain Gate","The Imperial Fields",
  "The Solaris Temple Level 1 (Act 8)","The Solaris Temple Level 2 (Act 8)",
  "The Lunaris Concourse","The Lunaris Temple Level 1 (Act 8)","The Lunaris Temple Level 2 (Act 8)",
  "The Harbour Bridge","The Doedre's Cesspool","The Sarn Slums",
  "The Ebony Barracks (Act 8)","The High Gardens","The Toxic Conduit",
  // ACT 9
  "Highgate (Act 9)","The Vastiri Desert","The Boiling Lake","The Tunnel",
  "The Quarry","The Refinery","The Belly of the Beast (Act 9)","The Rotting Core",
  // ACT 10
  "Oriath (Act 10)","The Cathedral Rooftop (Act 10)","The Ravaged Square",
  "The Torched Courts","The Desecrated Chambers","The Feeding Trough",
  "The Control Blocks (Act 10)","The Cannibal's Lair","The Ossuary","The Reliquary",
];

const LAB_COLORS = {
  normal:    { bg:'rgba(42,58,26,0.7)',  border:'#5a8a2a', text:'#a0d060', icon:'🟢' },
  cruel:     { bg:'rgba(58,26,26,0.7)',  border:'#8a3a2a', text:'#d07050', icon:'🟠' },
  merciless: { bg:'rgba(42,26,58,0.7)',  border:'#6a3a8a', text:'#a060d0', icon:'🟣' },
  eternal:   { bg:'rgba(26,42,58,0.7)',  border:'#2a6a8a', text:'#60a0d0', icon:'💎' },
};

let guideData = null;
let state = { currentZoneIndex:0, currentLevel:null, clickthrough:false };
let activeProfile = null; // name of the currently loaded profile

// ─── PROFILE MANAGEMENT (file-based via poe-profiles.json) ──────────────────
// In-memory cache of all profiles — loaded from file on startup
let _profilesCache = {};

async function getProfiles() {
  return _profilesCache;
}

async function _loadProfilesFromFile() {
  if (window.poeOverlay && window.poeOverlay.loadProfiles) {
    _profilesCache = await window.poeOverlay.loadProfiles();
  }
}

async function saveProfiles(profiles) {
  _profilesCache = profiles;
  if (window.poeOverlay && window.poeOverlay.saveProfiles) {
    await window.poeOverlay.saveProfiles(profiles);
  }
}

async function createProfile(name) {
  const profiles = await getProfiles();
  if (profiles[name]) return false; // already exists
  profiles[name] = { level: null, zoneIndex: 0, checkedActions: {} };
  await saveProfiles(profiles);
  return true;
}

async function deleteProfile(name) {
  const profiles = await getProfiles();
  delete profiles[name];
  await saveProfiles(profiles);
}

async function saveCurrentToProfile() {
  if (!activeProfile) return;
  const profiles = await getProfiles();
  // Gather all checked actions from in-memory zone action state
  const checkedActions = {};
  GUIDE_ZONES_ORDERED.forEach(zoneName => {
    if (_zoneActionsCache[zoneName] && _zoneActionsCache[zoneName].length > 0) {
      checkedActions[zoneName] = _zoneActionsCache[zoneName];
    }
  });
  profiles[activeProfile] = {
    level: state.currentLevel,
    zoneIndex: state.currentZoneIndex,
    checkedActions: checkedActions,
    customGuide: _customGuideData,
  };
  await saveProfiles(profiles);
}

async function loadProfile(name) {
  const profiles = await getProfiles();
  const data = profiles[name];
  if (!data) return false;

  // Clear all existing zone action states
  _zoneActionsCache = {};

  // Restore checked actions
  if (data.checkedActions) {
    Object.entries(data.checkedActions).forEach(([zoneName, indices]) => {
      _zoneActionsCache[zoneName] = indices;
    });
  }

  // Restore custom guide edits
  _customGuideData = data.customGuide || {};

  // Restore state
  state.currentZoneIndex = data.zoneIndex || 0;
  state.currentLevel = data.level || null;
  el.levelDisplay.textContent = state.currentLevel || '—';
  activeProfile = name;

  renderCurrentStep();
  return true;
}

async function populateProfileSelect() {
  const profiles = await getProfiles();
  const sel = el.profileSelect;
  sel.innerHTML = '<option value="">— No Profile —</option>';
  Object.keys(profiles).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  if (activeProfile) sel.value = activeProfile;
}

// ─── ZONE ACTION STATE (in-memory, persisted inside profiles) ───────────────
let _zoneActionsCache = {};

function loadZoneActionState(zoneName) {
  return _zoneActionsCache[zoneName] || [];
}

function saveZoneActionState(zoneName, checkedIndices) {
  _zoneActionsCache[zoneName] = checkedIndices;
  saveCurrentToProfile();
}

// ─── CUSTOM GUIDE DATA (user edits overlay on top of base guide) ────────────
let _customGuideData = {}; // { zoneName: { actions: [...] } }
let _editMode = false;

function getZoneActions(zoneName) {
  // Custom overrides take priority over base guide
  if (_customGuideData[zoneName] && _customGuideData[zoneName].actions) {
    return _customGuideData[zoneName].actions;
  }
  const base = guideData && guideData[zoneName];
  return base ? base.actions : [];
}

function setZoneActions(zoneName, actions) {
  if (!_customGuideData[zoneName]) _customGuideData[zoneName] = {};
  _customGuideData[zoneName].actions = actions;
  saveCustomGuide();
}

async function saveCustomGuide() {
  if (!activeProfile) return;
  const profiles = await getProfiles();
  if (!profiles[activeProfile]) return;
  profiles[activeProfile].customGuide = _customGuideData;
  await saveProfiles(profiles);
}

const el = {
  app:             document.getElementById('app'),
  logIndicator:    document.getElementById('log-indicator'),
  indicatorLabel:  document.querySelector('.indicator-label'),
  zoneBanner:      document.getElementById('zone-banner'),
  zoneActLabel:    document.getElementById('zone-act-label'),
  zoneName:        document.getElementById('zone-name'),
  zoneTypeBadge:   document.getElementById('zone-type-badge'),
  currentZone:     document.getElementById('current-zone-name'),
  zoneNameInput:   document.getElementById('zone-name-input'),
  actPill:         document.getElementById('act-select-dropdown'),
  actSelectDropdown: document.getElementById('act-select-dropdown'),
  stepCounter:     document.getElementById('step-counter'),
  zoneJumpInput:   document.getElementById('zone-jump-input'),
  actionsList:     document.getElementById('actions-list'),
  rewardsSection:  document.getElementById('rewards-section'),
  rewardsList:     document.getElementById('rewards-list'),
  tipBox:          document.getElementById('tip-box'),
  tipText:         document.getElementById('tip-text'),
  nextZoneName:    document.getElementById('next-zone-name'),
  levelDisplay:    document.getElementById('level-display'),
  levelInput:      document.getElementById('level-input'),
  statusText:      document.getElementById('status-text'),
  btnNext:         document.getElementById('btn-next'),
  btnPrev:         document.getElementById('btn-prev'),
  btnMinimize:     document.getElementById('btn-minimize'),
  btnClickthrough: document.getElementById('btn-clickthrough'),
  header:          document.getElementById('header'),
  // Modal elements
  zoneSelectorModal: document.getElementById('zone-selector-modal'),
  btnZoneSelector:   document.getElementById('btn-zone-selector'),
  actSelect:         document.getElementById('act-select'),
  zoneSelect:        document.getElementById('zone-select'),
  btnModalClose:     document.getElementById('btn-modal-close'),
  btnModalConfirm:   document.getElementById('btn-modal-confirm'),
  btnModalCancel:    document.getElementById('btn-modal-cancel'),
  modalBackdrop:     document.querySelector('.modal-backdrop'),
  // Profile elements
  profileSelect:         document.getElementById('profile-select'),
  btnNewProfile:         document.getElementById('btn-new-profile'),
  btnSaveProfile:        document.getElementById('btn-save-profile'),
  btnDeleteProfile:      document.getElementById('btn-delete-profile'),
  newProfileRow:         document.getElementById('new-profile-row'),
  newProfileInput:       document.getElementById('new-profile-input'),
  btnConfirmNewProfile:  document.getElementById('btn-confirm-new-profile'),
  btnCancelNewProfile:   document.getElementById('btn-cancel-new-profile'),
  // Guide editor elements
  btnEditMode:           document.getElementById('btn-edit-mode'),
  btnAddAction:          document.getElementById('btn-add-action'),
  // Guide export/import elements
  btnExportGuide:        document.getElementById('btn-export-guide'),
  btnImportGuide:        document.getElementById('btn-import-guide'),
  guideModal:            document.getElementById('guide-modal'),
  guideModalTitle:       document.getElementById('guide-modal-title'),
  guideModalDesc:        document.getElementById('guide-modal-desc'),
  guideModalTextarea:    document.getElementById('guide-modal-textarea'),
  btnGuideModalAction:   document.getElementById('btn-guide-modal-action'),
  btnGuideModalCancel:   document.getElementById('btn-guide-modal-cancel'),
  btnGuideModalClose:    document.getElementById('btn-guide-modal-close'),
  guideModalBackdrop:    document.querySelector('.guide-modal-backdrop'),
};

async function loadGuide() {
  try {
    const res  = await fetch('act1-2.json');
    const json = await res.json();
    guideData  = json.zones;
    await _loadProfilesFromFile();
    await populateProfileSelect();
    renderCurrentStep();
    setStatus('Guide loaded — waiting for PoE...');
  } catch (err) {
    setStatus('Error loading guide data');
  }
}

function renderCurrentStep() {
  if (!guideData) return;
  const zoneName = GUIDE_ZONES_ORDERED[state.currentZoneIndex];
  const zoneInfo = guideData[zoneName];
  el.stepCounter.textContent = `${state.currentZoneIndex + 1} / ${GUIDE_ZONES_ORDERED.length}`;
  el.currentZone.textContent = zoneName;

  // Show/hide edit mode buttons
  el.btnAddAction.classList.toggle('hidden', !_editMode);
  el.btnEditMode.classList.toggle('btn-edit-active', _editMode);

  if (!zoneInfo) {
    el.actPill.value = '';
    el.actionsList.innerHTML = '<li><span class="step-num">—</span>No guide data for this zone.</li>';
    el.rewardsSection.classList.add('hidden');
    el.tipBox.classList.add('hidden');
    el.nextZoneName.textContent = '—';
    removeAscendancyAlert();
    el.btnPrev.disabled = state.currentZoneIndex === 0;
    el.btnNext.disabled = state.currentZoneIndex === GUIDE_ZONES_ORDERED.length - 1;
    return;
  }

  el.actPill.value = String(zoneInfo.act);

  el.actionsList.innerHTML = '';
  const actions = getZoneActions(zoneName);
  const savedCheckedIndices = loadZoneActionState(zoneName);
  
  actions.forEach((action, i) => {
    const li = document.createElement('li');

    if (_editMode) {
      // Edit mode: show input + delete button
      li.innerHTML = `<span class="step-num">${i+1}</span>`;
      const editRow = document.createElement('div');
      editRow.className = 'action-edit-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'action-edit-input';
      input.value = action;
      input.addEventListener('blur', () => {
        const newActions = getCurrentEditedActions();
        setZoneActions(zoneName, newActions);
        renderCurrentStep();
      });
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { input.blur(); }
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'action-edit-btn delete-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove this action';
      delBtn.addEventListener('click', () => {
        const newActions = getCurrentEditedActions();
        newActions.splice(i, 1);
        setZoneActions(zoneName, newActions);
        renderCurrentStep();
      });
      editRow.appendChild(input);
      editRow.appendChild(delBtn);
      li.appendChild(editRow);
    } else {
      // Normal mode: show text + checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'action-checkbox';
      li.innerHTML = `<span class="step-num">${i+1}</span><span class="action-text">${escapeHtml(action)}</span>`;
      li.appendChild(checkbox);
      
      if (savedCheckedIndices.includes(i)) {
        checkbox.checked = true;
        li.classList.add('done');
      }
      
      const toggle = () => {
        li.classList.toggle('done');
        checkbox.checked = li.classList.contains('done');
        saveCheckedState();
      };
      
      li.addEventListener('click', (e) => { if (e.target !== checkbox) toggle(); });
      checkbox.addEventListener('change', () => {
        li.classList.toggle('done', checkbox.checked);
        saveCheckedState();
      });
      
      function saveCheckedState() {
        const checkedIndices = [];
        el.actionsList.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
          if (cb.checked) checkedIndices.push(idx);
        });
        saveZoneActionState(zoneName, checkedIndices);
      }
    }
    
    el.actionsList.appendChild(li);
  });

  if (zoneInfo.rewards && zoneInfo.rewards.length > 0) {
    el.rewardsSection.classList.remove('hidden');
    el.rewardsList.innerHTML = zoneInfo.rewards.map(r =>
      `<div class="reward-item"><span class="reward-npc">${escapeHtml(r.npc)}</span><span>${escapeHtml(r.reward)}</span></div>`
    ).join('');
  } else {
    el.rewardsSection.classList.add('hidden');
  }

  if (zoneInfo.tips) {
    el.tipBox.classList.remove('hidden');
    el.tipText.textContent = zoneInfo.tips;
  } else {
    el.tipBox.classList.add('hidden');
  }

  if (zoneInfo.ascendancy) {
    showAscendancyAlert(zoneInfo.ascendancy);
  } else {
    removeAscendancyAlert();
  }

  const nextName = zoneInfo.next || GUIDE_ZONES_ORDERED[state.currentZoneIndex + 1];
  el.nextZoneName.textContent = nextName ? `${nextName} →` : '🏆 Acts Complete — Maps await!';

  el.btnPrev.disabled = state.currentZoneIndex === 0;
  el.btnNext.disabled = state.currentZoneIndex === GUIDE_ZONES_ORDERED.length - 1;
}

function showAscendancyAlert(ascendancy) {
  removeAscendancyAlert();
  const c = LAB_COLORS[ascendancy.lab] || LAB_COLORS.normal;
  const card = document.getElementById('step-card');
  const div = document.createElement('div');
  div.id = 'ascendancy-alert';
  div.style.cssText = `margin-top:10px;padding:9px 11px;border-radius:4px;border:1px solid ${c.border};background:${c.bg};display:flex;gap:8px;align-items:flex-start`;
  div.innerHTML = `
    <span style="font-size:14px;flex-shrink:0;margin-top:1px">${c.icon}</span>
    <div>
      <div style="font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:0.15em;color:${c.text};margin-bottom:4px">
        ASCENDANCY — ${ascendancy.lab.toUpperCase()} LABYRINTH
      </div>
      <div style="font-size:13px;color:rgba(230,210,170,0.85);line-height:1.4;font-family:'Crimson Pro',serif">
        ${escapeHtml(ascendancy.note)}
      </div>
    </div>`;
  card.appendChild(div);
}

function removeAscendancyAlert() {
  const el = document.getElementById('ascendancy-alert');
  if (el) el.remove();
}

function handleZoneEntered(data) {
  const { zone } = data;
  const idx = findZoneIndex(zone);
  showZoneBanner(zone, idx);
  if (idx !== -1 && idx !== state.currentZoneIndex) {
    state.currentZoneIndex = idx;
    renderCurrentStep();
    flashCard();
    saveCurrentToProfile();
  }
  setStatus(`Zone: ${zone}`);
}

function findZoneIndex(zoneName) {
  const exact = GUIDE_ZONES_ORDERED.indexOf(zoneName);
  if (exact !== -1) return exact;
  
  const lower = zoneName.toLowerCase();
  const ci = GUIDE_ZONES_ORDERED.findIndex(z => z.toLowerCase() === lower);
  if (ci !== -1) return ci;
  
  // Partial match — try to use act context from current level
  const partials = [];
  const actRanges = {
    1: [1, 10], 2: [11, 25], 3: [26, 35], 4: [36, 40], 5: [41, 50],
    6: [51, 57], 7: [58, 64], 8: [65, 71], 9: [72, 78], 10: [79, 120]
  };
  
  GUIDE_ZONES_ORDERED.forEach((z, i) => {
    const zBase = z.toLowerCase().replace(/\s*\(act \d+\)/i,'').trim();
    const inBase = lower.replace(/\s*\(act \d+\)/i,'').trim();
    if (zBase === inBase) partials.push(i);
  });
  
  if (partials.length === 0) return -1;
  if (partials.length === 1) return partials[0];
  
  // If we have multiple matches, use character level to determine act
  if (state.currentLevel !== null && state.currentLevel > 0) {
    for (const [act, [minLvl, maxLvl]] of Object.entries(actRanges)) {
      if (state.currentLevel >= minLvl && state.currentLevel <= maxLvl) {
        const actNum = parseInt(act);
        const match = partials.find(i => {
          const zInfo = guideData[GUIDE_ZONES_ORDERED[i]];
          return zInfo && zInfo.act === actNum;
        });
        if (match !== undefined) return match;
      }
    }
  }
  
  // Fallback: prefer closest to current position going forward
  const forward = partials.filter(i => i >= state.currentZoneIndex);
  return forward.length > 0 ? forward[0] : partials[partials.length - 1];
}

let bannerTimeout = null;
function showZoneBanner(zoneName, zoneIdx) {
  const info = guideData && guideData[zoneName];
  el.zoneName.textContent      = zoneName;
  el.zoneActLabel.textContent  = info ? `ACT ${info.act}` : 'ACT ?';
  el.zoneTypeBadge.textContent = info ? capitalize(info.type || '') : '';
  el.zoneBanner.classList.remove('hidden');
  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => el.zoneBanner.classList.add('hidden'), 5000);
}

function handleLevelUp(data) {
  const { level } = data;
  if (state.currentLevel !== null && level <= state.currentLevel) return;
  state.currentLevel = level;
  el.levelDisplay.textContent = level;
  setStatus(`Level ${level}`);
  pulseLevel();
  saveCurrentToProfile();
}

function pulseLevel() {
  el.levelDisplay.style.color = 'var(--gold-bright)';
  el.levelDisplay.style.textShadow = '0 0 12px rgba(232,184,74,0.8)';
  setTimeout(() => { el.levelDisplay.style.color=''; el.levelDisplay.style.textShadow=''; }, 2000);
}

function goNext() { if (state.currentZoneIndex < GUIDE_ZONES_ORDERED.length-1) { state.currentZoneIndex++; renderCurrentStep(); saveCurrentToProfile(); } }
function goPrev() { if (state.currentZoneIndex > 0) { state.currentZoneIndex--; renderCurrentStep(); saveCurrentToProfile(); } }

let clickthroughActive = false;
function setClickthrough(enable) { window.poeOverlay?.setClickthrough(enable); }

el.btnClickthrough.addEventListener('click', () => {
  clickthroughActive = !clickthroughActive;
  el.btnClickthrough.style.color = clickthroughActive ? 'var(--gold-bright)' : '';
  setStatus(clickthroughActive ? 'Click-through ON — hover header to interact' : 'Click-through OFF');
  if (clickthroughActive) { setClickthrough(true); document.addEventListener('mousemove', onMouseMoveClickthrough); }
  else { document.removeEventListener('mousemove', onMouseMoveClickthrough); setClickthrough(false); }
});

function onMouseMoveClickthrough(e) {
  if (!clickthroughActive) return;
  const rect = el.header.getBoundingClientRect();
  const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  setClickthrough(!over);
}

function setConnected(connected) {
  el.logIndicator.classList.toggle('disconnected', !connected);
  el.logIndicator.classList.toggle('connected', connected);
  el.indicatorLabel.textContent = connected ? 'Connected' : 'Disconnected';
}

function setStatus(msg) { el.statusText.textContent = msg; }
function capitalize(s)  { return s.charAt(0).toUpperCase() + s.slice(1); }
function escapeHtml(s)  { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function flashCard() {
  const card = document.getElementById('step-card');
  card.classList.remove('zone-flash'); void card.offsetWidth; card.classList.add('zone-flash');
}

el.btnNext.addEventListener('click', goNext);
el.btnPrev.addEventListener('click', goPrev);
el.btnMinimize.addEventListener('click', () => document.getElementById('content').classList.toggle('hidden'));

// ─── ZONE SELECTOR MODAL ────────────────────────────────────────────────────
function openZoneSelectorModal() {
  el.zoneSelectorModal.classList.remove('hidden');
  el.actSelect.value = '';
  el.zoneSelect.innerHTML = '<option value="">Choose a zone...</option>';
}

function closeZoneSelectorModal() {
  el.zoneSelectorModal.classList.add('hidden');
}

function populateZonesByAct(act) {
  const zonesByAct = {};
  GUIDE_ZONES_ORDERED.forEach(zoneName => {
    const info = guideData[zoneName];
    if (info) {
      if (!zonesByAct[info.act]) zonesByAct[info.act] = [];
      zonesByAct[info.act].push(zoneName);
    }
  });

  el.zoneSelect.innerHTML = '<option value="">Choose a zone...</option>';
  if (act && zonesByAct[act]) {
    zonesByAct[act].forEach(zoneName => {
      const opt = document.createElement('option');
      opt.value = zoneName;
      opt.textContent = zoneName;
      el.zoneSelect.appendChild(opt);
    });
  }
}

function goToSelectedZone() {
  const zoneName = el.zoneSelect.value;
  if (!zoneName) {
    setStatus('Please select a zone');
    return;
  }
  const idx = GUIDE_ZONES_ORDERED.indexOf(zoneName);
  if (idx !== -1) {
    state.currentZoneIndex = idx;
    renderCurrentStep();
    flashCard();
    setStatus(`Jumped to: ${zoneName}`);
    saveCurrentToProfile();
    closeZoneSelectorModal();
  } else {
    setStatus('Zone not found');
  }
}

el.btnZoneSelector.addEventListener('click', openZoneSelectorModal);
el.btnModalClose.addEventListener('click', closeZoneSelectorModal);
el.btnModalCancel.addEventListener('click', closeZoneSelectorModal);
el.modalBackdrop.addEventListener('click', closeZoneSelectorModal);

el.actSelect.addEventListener('change', (e) => {
  const act = parseInt(e.target.value) || null;
  populateZonesByAct(act);
});

el.btnModalConfirm.addEventListener('click', goToSelectedZone);

el.zoneSelect.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    goToSelectedZone();
  }
});

// ─── ZONE JUMP INPUT (Click counter to edit) ───────────────────────────────
el.stepCounter.addEventListener('click', () => {
  el.stepCounter.classList.add('hidden');
  el.zoneJumpInput.classList.remove('hidden');
  el.zoneJumpInput.value = state.currentZoneIndex + 1;
  el.zoneJumpInput.focus();
  el.zoneJumpInput.select();
});

function submitZoneJump() {
  const zoneNum = parseInt(el.zoneJumpInput.value);
  if (!isNaN(zoneNum) && zoneNum >= 1 && zoneNum <= GUIDE_ZONES_ORDERED.length) {
    state.currentZoneIndex = zoneNum - 1;
    renderCurrentStep();
    flashCard();
    setStatus(`Jumped to zone ${zoneNum}`);
    saveCurrentToProfile();
  } else {
    setStatus(`Invalid zone number. Valid range: 1-${GUIDE_ZONES_ORDERED.length}`);
  }
  cancelZoneJump();
}

function cancelZoneJump() {
  el.zoneJumpInput.classList.add('hidden');
  el.stepCounter.classList.remove('hidden');
}

el.zoneJumpInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitZoneJump();
  } else if (e.key === 'Escape') {
    cancelZoneJump();
  }
});

el.zoneJumpInput.addEventListener('blur', submitZoneJump);

// ─── ZONE NAME INPUT (Click zone name to edit) ─────────────────────────────
el.currentZone.addEventListener('click', () => {
  el.currentZone.classList.add('hidden');
  el.zoneNameInput.classList.remove('hidden');
  el.zoneNameInput.value = el.currentZone.textContent;
  el.zoneNameInput.focus();
  el.zoneNameInput.select();
});

function submitZoneName() {
  const newName = el.zoneNameInput.value.trim();
  if (newName) {
    el.currentZone.textContent = newName;
    setStatus(`Zone renamed to: ${newName}`);
  }
  cancelZoneNameEdit();
}

function cancelZoneNameEdit() {
  el.zoneNameInput.classList.add('hidden');
  el.currentZone.classList.remove('hidden');
}

el.zoneNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitZoneName();
  } else if (e.key === 'Escape') {
    cancelZoneNameEdit();
  }
});

el.zoneNameInput.addEventListener('blur', submitZoneName);

// ─── LEVEL INPUT (Click level to edit manually) ──────────────────────────────
el.levelDisplay.addEventListener('click', () => {
  el.levelDisplay.classList.add('hidden');
  el.levelInput.classList.remove('hidden');
  el.levelInput.value = el.levelDisplay.textContent;
  el.levelInput.focus();
  el.levelInput.select();
});

function submitLevelChange() {
  const newLevel = parseInt(el.levelInput.value);
  if (!isNaN(newLevel) && newLevel >= 1 && newLevel <= 100) {
    state.currentLevel = newLevel;
    el.levelDisplay.textContent = newLevel;
    setStatus(`Character level set to: ${newLevel}`);
    saveCurrentToProfile();
  } else {
    setStatus('Invalid level. Valid range: 1-100');
  }
  cancelLevelEdit();
}

function cancelLevelEdit() {
  el.levelInput.classList.add('hidden');
  el.levelDisplay.classList.remove('hidden');
}

el.levelInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitLevelChange();
  } else if (e.key === 'Escape') {
    cancelLevelEdit();
  }
});

el.levelInput.addEventListener('blur', submitLevelChange);

// ─── ACT DROPDOWN (single-click select) ─────────────────────────────────────
el.actSelectDropdown.addEventListener('change', () => {
  const actNum = parseInt(el.actSelectDropdown.value);
  
  // Find the first zone of the selected act
  const firstZoneOfAct = GUIDE_ZONES_ORDERED.find(zoneName => {
    const zoneInfo = guideData[zoneName];
    return zoneInfo && zoneInfo.act === actNum;
  });
  
  if (firstZoneOfAct) {
    const zoneIndex = GUIDE_ZONES_ORDERED.indexOf(firstZoneOfAct);
    if (zoneIndex !== -1) {
      state.currentZoneIndex = zoneIndex;
      renderCurrentStep();
      flashCard();
      setStatus(`Jumped to Act ${actNum}: ${firstZoneOfAct}`);
      saveCurrentToProfile();
    }
  } else {
    setStatus(`No zones found for Act ${actNum}`);
  }
});

// ─── PROFILE EVENT LISTENERS ────────────────────────────────────────────────
el.profileSelect.addEventListener('change', async () => {
  const name = el.profileSelect.value;
  if (!name) {
    activeProfile = null;
    _zoneActionsCache = {};
    _customGuideData = {};
    _editMode = false;
    state.currentZoneIndex = 0;
    state.currentLevel = null;
    el.levelDisplay.textContent = '—';
    renderCurrentStep();
    setStatus('No profile selected');
    return;
  }
  if (await loadProfile(name)) {
    setStatus(`Profile loaded: ${name}`);
    flashCard();
  }
});

el.btnNewProfile.addEventListener('click', () => {
  el.newProfileRow.classList.remove('hidden');
  el.newProfileInput.value = '';
  el.newProfileInput.focus();
});

el.btnCancelNewProfile.addEventListener('click', () => {
  el.newProfileRow.classList.add('hidden');
});

async function confirmNewProfile() {
  const name = el.newProfileInput.value.trim();
  if (!name) { setStatus('Enter a profile name'); return; }
  if (await createProfile(name)) {
    activeProfile = name;
    await populateProfileSelect();
    el.profileSelect.value = name;
    await saveCurrentToProfile();
    el.newProfileRow.classList.add('hidden');
    setStatus(`Profile created: ${name}`);
  } else {
    setStatus(`Profile "${name}" already exists`);
  }
}

el.btnConfirmNewProfile.addEventListener('click', confirmNewProfile);
el.newProfileInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') confirmNewProfile();
  else if (e.key === 'Escape') el.newProfileRow.classList.add('hidden');
});

el.btnSaveProfile.addEventListener('click', async () => {
  if (!activeProfile) { setStatus('Select or create a profile first'); return; }
  await saveCurrentToProfile();
  setStatus(`Profile saved: ${activeProfile}`);
});

el.btnDeleteProfile.addEventListener('click', async () => {
  if (!activeProfile) { setStatus('No profile selected'); return; }
  const name = activeProfile;
  await deleteProfile(name);
  activeProfile = null;
  await populateProfileSelect();
  setStatus(`Profile deleted: ${name}`);
});

// ─── GUIDE EDITOR ───────────────────────────────────────────────────────────
function getCurrentEditedActions() {
  const inputs = el.actionsList.querySelectorAll('.action-edit-input');
  return Array.from(inputs).map(input => input.value.trim()).filter(v => v);
}

el.btnEditMode.addEventListener('click', () => {
  if (!activeProfile) { setStatus('Select or create a profile first to edit guides'); return; }
  _editMode = !_editMode;
  renderCurrentStep();
  setStatus(_editMode ? 'Edit mode ON — click actions to edit, + to add' : 'Edit mode OFF');
});

el.btnAddAction.addEventListener('click', () => {
  const zoneName = GUIDE_ZONES_ORDERED[state.currentZoneIndex];
  const actions = getZoneActions(zoneName).slice(); // copy
  actions.push('New action');
  setZoneActions(zoneName, actions);
  renderCurrentStep();
  // Focus the last input
  const inputs = el.actionsList.querySelectorAll('.action-edit-input');
  if (inputs.length > 0) {
    const last = inputs[inputs.length - 1];
    last.focus();
    last.select();
  }
});

// ─── GUIDE EXPORT / IMPORT ──────────────────────────────────────────────────
let _guideModalMode = 'export'; // 'export' or 'import'

function openGuideModal(mode) {
  _guideModalMode = mode;
  el.guideModal.classList.remove('hidden');
  if (mode === 'export') {
    el.guideModalTitle.textContent = 'EXPORT GUIDE';
    el.guideModalDesc.textContent = 'Copy this code and share it. It contains zone actions and checked progress — no personal data.';
    el.btnGuideModalAction.textContent = 'Copy';
    el.guideModalTextarea.readOnly = true;
    // Build export data: acts/zones/actions + checked states
    const exportData = {};
    GUIDE_ZONES_ORDERED.forEach(zoneName => {
      const zoneInfo = guideData[zoneName];
      if (!zoneInfo) return;
      const actions = getZoneActions(zoneName);
      if (actions.length === 0) return;
      const entry = { act: zoneInfo.act, actions: actions };
      const checked = _zoneActionsCache[zoneName];
      if (checked && checked.length > 0) entry.checked = checked;
      exportData[zoneName] = entry;
    });
    // Encode as POEguide:<base64 of compressed JSON>
    const jsonStr = JSON.stringify(exportData);
    const encoded = encodeToBase64(jsonStr);
    el.guideModalTextarea.value = 'POEGUIDE:' + encoded;
  } else {
    el.guideModalTitle.textContent = 'IMPORT GUIDE';
    el.guideModalDesc.textContent = 'Paste a guide code below. This will load the guide actions and checked progress.';
    el.btnGuideModalAction.textContent = 'Import';
    el.guideModalTextarea.readOnly = false;
    el.guideModalTextarea.value = '';
  }
  el.guideModalTextarea.focus();
}

// Safe base64 encode/decode that handles unicode
function encodeToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeFromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function closeGuideModal() {
  el.guideModal.classList.add('hidden');
}

el.btnExportGuide.addEventListener('click', () => openGuideModal('export'));
el.btnImportGuide.addEventListener('click', () => openGuideModal('import'));

el.btnGuideModalClose.addEventListener('click', closeGuideModal);
el.btnGuideModalCancel.addEventListener('click', closeGuideModal);
el.guideModalBackdrop.addEventListener('click', closeGuideModal);

el.btnGuideModalAction.addEventListener('click', async () => {
  if (_guideModalMode === 'export') {
    // Copy to clipboard
    el.guideModalTextarea.select();
    try {
      await navigator.clipboard.writeText(el.guideModalTextarea.value);
      setStatus('Guide code copied to clipboard!');
    } catch (e) {
      document.execCommand('copy');
      setStatus('Guide code copied!');
    }
  } else {
    // Import
    if (!activeProfile) { setStatus('Select or create a profile first to import'); return; }
    let code = el.guideModalTextarea.value.trim();
    if (!code) { setStatus('Paste a guide code first'); return; }
    try {
      // Strip prefix if present
      if (code.startsWith('POEGUIDE:')) code = code.slice(9);
      let jsonStr;
      try {
        jsonStr = decodeFromBase64(code);
      } catch (e) {
        // Fallback: try the old encoding method
        jsonStr = decodeURIComponent(escape(atob(code)));
      }
      const importedData = JSON.parse(jsonStr);
      // Validate structure and apply
      let count = 0;
      for (const [zoneName, zoneData] of Object.entries(importedData)) {
        if (zoneData && Array.isArray(zoneData.actions) && typeof zoneData.act === 'number') {
          if (!_customGuideData[zoneName]) _customGuideData[zoneName] = {};
          _customGuideData[zoneName].actions = zoneData.actions;
          // Restore checked states if present
          if (Array.isArray(zoneData.checked)) {
            _zoneActionsCache[zoneName] = zoneData.checked;
          }
          count++;
        }
      }
      if (count === 0) { setStatus('No valid guide data found in code'); return; }
      await saveCustomGuide();
      await saveCurrentToProfile();
      renderCurrentStep();
      closeGuideModal();
      setStatus(`Imported guide: ${count} zones with actions & progress`);
    } catch (e) {
      setStatus('Invalid guide code — check the data and try again');
    }
  }
});

if (window.poeOverlay) {
  window.poeOverlay.onZoneEntered(handleZoneEntered);
  window.poeOverlay.onLevelUp(handleLevelUp);
  window.poeOverlay.onDeath(() => {
    el.app.classList.add('death-flash');
    setTimeout(() => el.app.classList.remove('death-flash'), 600);
    setStatus('You died. Keep going!');
  });
  window.poeOverlay.onHotkeyNext(goNext);
  window.poeOverlay.onHotkeyPrev(goPrev);
  window.poeOverlay.onLogStatus((data) => {
    setConnected(data.connected);
    setStatus(data.connected ? 'Watching log file' : 'Client.txt not found — check main.js path');
  });
  window.poeOverlay.getLogStatus().then(status => {
    setConnected(status.watching);
    if (status.savedState?.level)    handleLevelUp({ level: status.savedState.level });
    if (status.savedState?.zoneName) handleZoneEntered({ zone: status.savedState.zoneName });
  });
} else {
  setStatus('Dev mode — run via npm start');
}

loadGuide();
