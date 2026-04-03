// ─── POE ITEM DATA — Fetches gem/item info from poe.ninja + local cache ─────
// Provides rich tooltip data: icons, mods, tags, etc.
// All data is cached locally so subsequent loads are instant.

const POE_NINJA_BASE = 'https://poe.ninja/api/data/itemoverview';
const POE_NINJA_LEAGUE = 'Standard'; // fallback league for data

// ─── GEM TAG COLORS (matching in-game) ──────────────────────────────────────
const GEM_TAG_COLORS = {
  fire:       '#960000',
  cold:       '#366492',
  lightning:  '#b99c00',
  chaos:      '#9020b0',
  physical:   '#804020',
  attack:     '#b97123',
  spell:      '#7070ff',
  minion:     '#40b040',
  aoe:        '#708090',
  duration:   '#708090',
  projectile: '#708090',
  melee:      '#708090',
  bow:        '#708090',
  totem:      '#708090',
  trap:       '#708090',
  mine:       '#708090',
  support:    '#3992b5',
  aura:       '#708090',
  curse:      '#708090',
  movement:   '#708090',
  warcry:     '#708090',
  herald:     '#708090',
  guard:      '#708090',
  link:       '#708090',
  trigger:    '#708090',
  vaal:       '#c03030',
  brand:      '#708090',
  channelling:'#708090',
  intelligence:'#708090',
  dexterity:  '#708090',
  strength:   '#708090',
  mark:       '#708090',
};

// ─── KNOWN LEVELING GEMS (comprehensive list for text detection) ────────────
// These are the names we'll scan for in action text
const KNOWN_GEM_NAMES = [
  // Popular Skill Gems
  'Firestorm','Fireball','Fire Trap','Flame Totem','Flame Surge','Flame Dash',
  'Flameblast','Incinerate','Cremation','Armageddon Brand','Wave of Conviction',
  'Purifying Flame','Rolling Magma','Blazing Salvo','Explosive Trap',
  'Arc','Spark','Storm Brand','Ball Lightning','Lightning Tendrils',
  'Orb of Storms','Shock Nova','Crackling Lance','Galvanic Field',
  'Freezing Pulse','Frostbolt','Ice Nova','Creeping Frost','Cold Snap',
  'Vortex','Winter Orb','Ice Spear','Frost Bomb','Arctic Breath',
  'Glacial Cascade','Frost Blades',
  'Raise Zombie','Summon Raging Spirit','Summon Skeletons','Absolution',
  'Summon Holy Relic','Herald of Purity','Dominating Blow',
  'Essence Drain','Contagion','Blight','Soulrend','Bane','Decay',
  'Dark Pact','Forbidden Rite','Caustic Arrow',
  'Split Arrow','Rain of Arrows','Tornado Shot','Lightning Arrow',
  'Barrage','Ice Shot','Shrapnel Ballista','Artillery Ballista',
  'Galvanic Arrow','Elemental Hit','Burning Arrow','Caustic Arrow',
  'Toxic Rain','Ensnaring Arrow','Scourge Arrow',
  'Cleave','Ground Slam','Sunder','Lacerate','Bladestorm','Earthquake',
  'Tectonic Slam','Consecrated Path','Double Strike','Molten Strike',
  'Blade Flurry','Reave','Cyclone','Flicker Strike','Shield Charge',
  'Spectral Throw','Ethereal Knives','Blade Vortex','Bladefall',
  'Kinetic Blast','Power Siphon','Exsanguinate','Corrupting Fever',
  'Righteous Fire','Scorching Ray','Holy Flame Totem','Ancestral Totem',
  'Ancestral Warchief','Ancestral Protector','Detonate Dead',
  'Volatile Dead','Bodyswap','Desecrate','Unearth',
  'Lightning Strike','Smite','Static Strike','Wild Strike',
  'Infernal Blow','Heavy Strike','Glacial Hammer','Boneshatter',
  'Hexblast','Eye of Winter','Forbidden Rite',
  'Tornado','Absolution','Reap','Shield Crush',
  // Support Gems
  'Added Fire Damage Support','Added Cold Damage Support',
  'Added Lightning Damage Support','Elemental Damage with Attacks Support',
  'Concentrated Effect Support','Increased Area of Effect Support',
  'Controlled Destruction Support','Spell Echo Support','Unleash Support',
  'Greater Multiple Projectiles Support','Lesser Multiple Projectiles Support',
  'Greater Volley Support','Fork Support','Chain Support','Pierce Support',
  'Faster Attacks Support','Multistrike Support','Ancestral Call Support',
  'Melee Physical Damage Support','Brutality Support','Impale Support',
  'Combustion Support','Burning Damage Support','Immolate Support',
  'Hypothermia Support','Elemental Focus Support','Trinity Support',
  'Inspiration Support','Arcane Surge Support','Lifetap Support',
  'Faster Casting Support','Spell Cascade Support','Intensify Support',
  'Energy Leech Support','Minion Damage Support','Minion Speed Support',
  'Feeding Frenzy Support','Predator Support','Meat Shield Support',
  'Physical to Lightning Support','Void Manipulation Support',
  'Efficacy Support','Swift Affliction Support','Deadly Ailments Support',
  'Unbound Ailments Support','Cruelty Support','Bloodthirst Support',
  'Close Combat Support','Fortify Support','Pulverise Support',
  'Onslaught Support','Added Chaos Damage Support','Withering Touch Support',
  'Chance to Bleed Support','Maim Support','Chance to Poison Support',
  'Vicious Projectiles Support','Mirage Archer Support',
  'Barrage Support','Volley Support','Ballista Totem Support',
  'Spell Totem Support','Multiple Totems Support','Trap And Mine Damage Support',
  'Cluster Traps Support','Multiple Traps Support','Swift Assembly Support',
  'Blastchain Mine Support','High-Impact Mine Support',
  'Cast When Damage Taken Support','Cast on Death Support',
  'Arcanist Brand Support','Hextouch Support','Blasphemy Support',
  'Generosity Support','Divine Blessing Support','Eternal Blessing Support',
  'Second Wind Support','Enhance Support','Empower Support','Enlighten Support',
  'Awakened Added Fire Damage Support','Awakened Added Cold Damage Support',
  'Awakened Elemental Damage with Attacks Support',
  'Awakened Spell Echo Support','Awakened Greater Multiple Projectiles Support',
  'Awakened Multistrike Support','Awakened Brutality Support',
  'Awakened Melee Physical Damage Support','Awakened Controlled Destruction Support',
  'Awakened Burning Damage Support','Awakened Elemental Focus Support',
  'Awakened Void Manipulation Support','Awakened Added Lightning Damage Support',
  'Awakened Chain Support',
  // Auras / Heralds / Buffs
  'Hatred','Anger','Wrath','Grace','Determination','Discipline',
  'Purity of Fire','Purity of Ice','Purity of Lightning','Purity of Elements',
  'Haste','Zealotry','Malevolence','Pride','Defiance Banner','War Banner',
  'Dread Banner','Herald of Ash','Herald of Ice','Herald of Thunder',
  'Herald of Agony','Herald of Purity','Vitality','Clarity','Precision',
  'Petrified Blood','Tempest Shield','Arctic Armour','Molten Shell',
  'Steelskin','Immortal Call','Bone Armour',
  // Curses
  'Flammability','Frostbite','Conductivity','Elemental Weakness',
  'Despair','Vulnerability','Enfeeble','Temporal Chains',
  'Punishment','Assassin\'s Mark','Warlord\'s Mark','Poacher\'s Mark',
  'Sniper\'s Mark',
  // Movement
  'Flame Dash','Dash','Shield Charge','Whirling Blades','Leap Slam',
  'Frostblink','Smoke Mine','Lightning Warp','Blink Arrow',
  // Utility / Other
  'Blood Rage','Phase Run','Withering Step','Vaal Grace',
  'Vaal Haste','Vaal Discipline','Vaal Righteous Fire',
  'Portal','Decoy Totem','Summon Stone Golem','Summon Flame Golem',
  'Summon Ice Golem','Summon Lightning Golem','Summon Chaos Golem',
  'Summon Carrion Golem','Summon Stone Golem',
  'Convocation','Offering','Flesh Offering','Bone Offering','Spirit Offering',
  'Raise Spectre','Animate Guardian','Animate Weapon',
  'Mind Over Matter','Arcane Cloak',
  // Vaal Gems
  'Vaal Arc','Vaal Fireball','Vaal Spark','Vaal Cyclone',
  'Vaal Ground Slam','Vaal Double Strike','Vaal Ancestral Warchief',
  'Vaal Earthquake','Vaal Molten Shell','Vaal Cold Snap',
  'Vaal Blade Vortex','Vaal Rain of Arrows','Vaal Storm Call',
  'Vaal Summon Skeletons','Vaal Detonate Dead',
];

// Common unique items encountered during leveling
const KNOWN_UNIQUE_NAMES = [
  'Tabula Rasa','Goldrim','Wanderlust','Lifesprig','Axiom Perpetuum',
  'Reverberation Rod','Last Resort','Ondar\'s Clasp','Karui Ward',
  'Lochtonial Caress','Wurm\'s Molt','Belt of the Deceiver',
  'Praxis','Thief\'s Torment','Berek\'s Grip','Berek\'s Pass','Berek\'s Respite',
  'Blackheart','Le Heup of All','Atziri\'s Foible','Doedre\'s Tenure',
  'Hrimsorrow','Facebreaker','Meginord\'s Girdle','String of Servitude',
  'Seven-League Step','Victario\'s Flight','Shavronne\'s Wrappings',
  'Carcass Jack','Vis Mortis','The Covenant','Edge of Madness',
  'Limbsplit','The Screaming Eagle','Storm Cloud','Quill Rain',
  'Silverbranch','Death\'s Harp','Doomfletch','Chin Sol',
  'Lycosidae','Springleaf','Pledge of Hands',
];

// All known item names for text scanning, sorted longest first (greedy match)
const ALL_KNOWN_NAMES = [...KNOWN_GEM_NAMES, ...KNOWN_UNIQUE_NAMES]
  .sort((a, b) => b.length - a.length);

// ─── LOCAL CACHE ────────────────────────────────────────────────────────────
let _itemCache = {};    // name -> item data
let _fetchedTypes = {}; // track which poe.ninja types we've fetched

// ─── FETCH FROM POE.NINJA ──────────────────────────────────────────────────
async function fetchPoeNinjaType(type) {
  if (_fetchedTypes[type]) return;
  try {
    let data = null;
    // Use main process to avoid CORS issues
    if (window.poeOverlay && window.poeOverlay.fetchPoeNinja) {
      data = await window.poeOverlay.fetchPoeNinja(type);
    } else {
      // Fallback: direct fetch (works in some environments)
      const url = `${POE_NINJA_BASE}?league=${POE_NINJA_LEAGUE}&type=${type}&language=en`;
      const res = await fetch(url);
      if (!res.ok) return;
      data = await res.json();
    }
    if (!data || !data.lines) return;

    for (const item of data.lines) {
      const name = item.name;
      // For gems, prefer the lowest gem level version (base)
      if (type === 'SkillGem') {
        const existing = _itemCache[name];
        if (existing && existing.gemLevel && existing.gemLevel <= (item.gemLevel || 99)) continue;
        // Only store base versions (level 1 or lowest available)
        if (item.gemLevel > 1 && _itemCache[name]) continue;
      }
      // For uniques, prefer the first version we see
      if (_itemCache[name] && type !== 'SkillGem') continue;

      _itemCache[name] = {
        name: item.name,
        icon: item.icon,
        baseType: item.baseType || item.name,
        itemClass: item.itemClass,
        levelRequired: item.levelRequired,
        gemLevel: item.gemLevel,
        gemQuality: item.gemQuality,
        links: item.links,
        implicitModifiers: item.implicitModifiers || [],
        explicitModifiers: item.explicitModifiers || [],
        flavourText: item.flavourText || '',
        itemType: item.itemType || '',
        variant: item.variant || '',
        corrupted: item.corrupted || false,
        _type: type,
      };
    }
    _fetchedTypes[type] = true;
  } catch (err) {
    console.warn(`[PoE Data] Failed to fetch ${type}:`, err.message);
  }
}

async function loadAllItemData() {
  // First try loading from local cache
  if (window.poeOverlay && window.poeOverlay.loadItemCache) {
    try {
      const cached = await window.poeOverlay.loadItemCache();
      if (cached && Object.keys(cached).length > 0) {
        _itemCache = cached;
        console.log(`[PoE Data] Loaded ${Object.keys(cached).length} items from cache`);
      }
    } catch (e) {}
  }

  // Fetch from poe.ninja in background (updates cache)
  const types = ['SkillGem', 'UniqueArmour', 'UniqueWeapon', 'UniqueAccessory',
                 'UniqueFlask', 'UniqueJewel'];
  for (const type of types) {
    await fetchPoeNinjaType(type);
  }

  // Save updated cache
  if (window.poeOverlay && window.poeOverlay.saveItemCache) {
    try {
      await window.poeOverlay.saveItemCache(_itemCache);
      console.log(`[PoE Data] Saved ${Object.keys(_itemCache).length} items to cache`);
    } catch (e) {}
  }
}

function getItemData(name) {
  return _itemCache[name] || null;
}

// ─── TEXT PARSING — Detect item/gem names in action strings ─────────────────
function parseActionTextWithItems(text) {
  // Returns an array of segments: { type: 'text'|'item', value: string }
  const segments = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestMatch = null;
    let earliestIndex = remaining.length;
    let matchedName = null;

    // Find the earliest occurrence of any known item name
    for (const name of ALL_KNOWN_NAMES) {
      const idx = remaining.indexOf(name);
      if (idx !== -1 && idx < earliestIndex) {
        // Word boundary check: ensure the match isn't part of a larger word
        const charBefore = idx > 0 ? remaining[idx - 1] : ' ';
        const charAfter = idx + name.length < remaining.length ? remaining[idx + name.length] : ' ';
        const validBefore = /[\s,;:.()\-—\/\u0000]/.test(charBefore) || idx === 0;
        const validAfter = /[\s,;:.()\-—\/\u0000]/.test(charAfter) || (idx + name.length) === remaining.length;
        if (validBefore && validAfter) {
          earliestIndex = idx;
          earliestMatch = name;
          matchedName = name;
        }
      }
    }

    if (earliestMatch === null) {
      // No more items found, rest is plain text
      segments.push({ type: 'text', value: remaining });
      break;
    }

    // Add text before the match
    if (earliestIndex > 0) {
      segments.push({ type: 'text', value: remaining.substring(0, earliestIndex) });
    }

    // Add the item match
    segments.push({ type: 'item', value: matchedName });

    // Continue after the match
    remaining = remaining.substring(earliestIndex + matchedName.length);
  }

  return segments;
}

// ─── TOOLTIP HTML GENERATION (PoE in-game style) ───────────────────────────
function getItemTooltipHtml(itemData) {
  if (!itemData) return '';

  const isGem = itemData._type === 'SkillGem';
  const isSupport = isGem && itemData.name.includes('Support');
  const isUnique = itemData._type && itemData._type.startsWith('Unique');

  let frameClass = 'poe-frame-gem';
  if (isUnique) frameClass = 'poe-frame-unique';
  else if (!isGem) frameClass = 'poe-frame-normal';

  let html = `<div class="poe-tooltip ${frameClass}">`;

  // ── Name banner ──
  html += `<div class="poe-tt-header">`;
  html += `<div class="poe-tt-header-bg"></div>`;
  html += `<span class="poe-tt-name">${esc(itemData.name)}</span>`;
  html += `</div>`;

  // ── Gem tags ──
  if (isGem) {
    const tags = buildGemTags(itemData);
    if (tags) html += `<div class="poe-tt-tags">${esc(tags)}</div>`;
  }

  // ── Properties ──
  html += `<div class="poe-tt-sep"></div>`;
  let hasProps = false;
  let propsHtml = `<div class="poe-tt-props">`;
  if (isGem && itemData.gemLevel) {
    propsHtml += `<div class="poe-tt-prop"><span class="poe-tt-lbl">Level: </span><span class="poe-tt-white">(1-${itemData.gemLevel})</span></div>`;
    hasProps = true;
  }
  if (itemData.levelRequired) {
    propsHtml += `<div class="poe-tt-prop"><span class="poe-tt-lbl">Requires Level </span><span class="poe-tt-white">${itemData.levelRequired}</span></div>`;
    hasProps = true;
  }
  if (isUnique && itemData.itemType) {
    propsHtml += `<div class="poe-tt-prop">${esc(itemData.itemType)}</div>`;
    hasProps = true;
  }
  propsHtml += `</div>`;
  if (hasProps) html += propsHtml;

  // ── Description (gem flavour — golden italic) ──
  if (isGem) {
    html += `<div class="poe-tt-sep"></div>`;
    const desc = isSupport
      ? 'Supports any skill with a matching socket.'
      : null;
    if (desc) html += `<div class="poe-tt-gem-desc">${esc(desc)}</div>`;
  }

  // ── Implicit mods ──
  if (itemData.implicitModifiers && itemData.implicitModifiers.length > 0) {
    html += `<div class="poe-tt-sep"></div>`;
    html += `<div class="poe-tt-mods">`;
    for (const mod of itemData.implicitModifiers) {
      html += `<div class="poe-tt-mod poe-tt-mod-magic">${esc(mod.text)}</div>`;
    }
    html += `</div>`;
  }

  // ── Explicit mods ──
  if (itemData.explicitModifiers && itemData.explicitModifiers.length > 0) {
    html += `<div class="poe-tt-sep"></div>`;
    html += `<div class="poe-tt-mods">`;
    for (const mod of itemData.explicitModifiers) {
      const cls = mod.optional ? 'poe-tt-mod poe-tt-mod-quality' : 'poe-tt-mod poe-tt-mod-magic';
      const lines = mod.text.split('\n');
      for (const line of lines) {
        html += `<div class="${cls}">${esc(line)}</div>`;
      }
    }
    html += `</div>`;
  }

  // ── Flavour text ──
  if (itemData.flavourText) {
    html += `<div class="poe-tt-sep"></div>`;
    html += `<div class="poe-tt-flavour">${esc(itemData.flavourText)}</div>`;
  }

  // ── Socket text (gems only) ──
  if (isGem) {
    html += `<div class="poe-tt-sep"></div>`;
    html += `<div class="poe-tt-socket-text">Place into an item socket of the right colour to gain this skill. Right click to remove from a socket.</div>`;
    if (itemData.icon) {
      html += `<div class="poe-tt-gem-icon"><img src="${encodeURI(itemData.icon)}" alt=""/></div>`;
    }
  }

  html += `</div>`;
  return html;
}

function buildGemTags(itemData) {
  const n = itemData.name.toLowerCase();
  const tags = [];
  if (n.includes('support')) tags.push('Support');
  // Element
  if (/fire|flame|burn|inciner|cremation|armageddon|molten|immolate|combust|scorching|blazing|infernal|rolling magma/.test(n)) tags.push('Fire');
  if (/cold|frost|freez|ice|arctic|glacial|winter|hypothermia|vortex|creeping/.test(n)) tags.push('Cold');
  if (/lightning|shock|spark|storm|ball lightning|galvanic|crackling|static|arc(?:$|\s)/.test(n)) tags.push('Lightning');
  if (/chaos|poison|blight|essence drain|contagion|dark pact|despair|wither|soulrend|bane|forbidden rite|void|decay/.test(n)) tags.push('Chaos');
  // Type
  if (/spell|cast/.test(n)) tags.push('Spell');
  if (/attack|strike|slam|cleave|cyclone/.test(n)) tags.push('Attack');
  if (/area|nova|cascade|earthquake/.test(n)) tags.push('AoE');
  if (/duration|brand/.test(n)) tags.push('Duration');
  if (/projectile|arrow|barrage|shot/.test(n)) tags.push('Projectile');
  if (/minion|summon|raise|animate|offering/.test(n)) tags.push('Minion');
  if (/totem/.test(n)) tags.push('Totem');
  if (/trap/.test(n)) tags.push('Trap');
  if (/mine/.test(n)) tags.push('Mine');
  if (/herald/.test(n)) tags.push('Herald');
  if (/aura|hatred|anger|wrath|grace|determination|discipline|haste|zealotry|malevolence|pride|purity/.test(n)) tags.push('Aura');
  if (/curse|mark|enfeeble|temporal|punishment|vulnerability|flammability|frostbite|conductivity/.test(n)) tags.push('Curse');
  if (/dash|charge|blink|warp|leap|movement/.test(n)) tags.push('Movement');
  return tags.length > 0 ? tags.join(', ') : null;
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── RENDER ITEM LINKS IN ACTION TEXT ───────────────────────────────────────
function renderActionHtml(actionText) {
  const segments = parseActionTextWithItems(actionText);
  let html = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      html += esc(seg.value);
    } else {
      const itemData = getItemData(seg.value);
      const isGem = KNOWN_GEM_NAMES.includes(seg.value);
      const isUnique = KNOWN_UNIQUE_NAMES.includes(seg.value);
      let cls = 'poe-item-link';
      if (isGem) cls += ' poe-link-gem';
      else if (isUnique) cls += ' poe-link-unique';

      if (itemData && itemData.icon) {
        html += `<span class="${cls}" data-item-name="${esc(seg.value)}">`;
        html += `<img class="poe-inline-icon" src="${encodeURI(itemData.icon)}" alt=""/>`;
        html += `${esc(seg.value)}</span>`;
      } else {
        html += `<span class="${cls}" data-item-name="${esc(seg.value)}">${esc(seg.value)}</span>`;
      }
    }
  }
  return html;
}

// ─── TOOLTIP POSITIONING & SHOW/HIDE ────────────────────────────────────────
let _tooltipEl = null;
let _tooltipTimeout = null;

function initTooltipSystem() {
  _tooltipEl = document.getElementById('poe-tooltip-container');
  if (!_tooltipEl) {
    _tooltipEl = document.createElement('div');
    _tooltipEl.id = 'poe-tooltip-container';
    _tooltipEl.className = 'poe-tooltip-container hidden';
    document.body.appendChild(_tooltipEl);
  }

  // Global mouse handlers for item links
  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('.poe-item-link');
    if (!link) return;
    const name = link.getAttribute('data-item-name');
    const data = getItemData(name);
    if (data) {
      showTooltip(link, data);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const link = e.target.closest('.poe-item-link');
    if (link) hideTooltip();
  });
}

function showTooltip(anchorEl, itemData) {
  if (_tooltipTimeout) clearTimeout(_tooltipTimeout);
  _tooltipEl.innerHTML = getItemTooltipHtml(itemData);
  _tooltipEl.style.left = '0px';
  _tooltipEl.style.top = '0px';
  _tooltipEl.classList.remove('hidden');

  // Force layout so we can measure tooltip size
  const ttRect = _tooltipEl.getBoundingClientRect();
  const rect = anchorEl.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const ttW = ttRect.width;
  const ttH = ttRect.height;

  // Default: position below the anchor, left-aligned with it
  let left = rect.left;
  let top = rect.bottom + 6;

  // If it overflows below, place above the anchor
  if (top + ttH > vh) {
    top = rect.top - ttH - 6;
  }

  // If it overflows right, shift left
  if (left + ttW > vw) {
    left = vw - ttW - 4;
  }

  // Clamp to viewport
  if (left < 2) left = 2;
  if (top < 2) top = 2;

  _tooltipEl.style.left = `${left}px`;
  _tooltipEl.style.top = `${top}px`;
}

function hideTooltip() {
  _tooltipTimeout = setTimeout(() => {
    if (_tooltipEl) {
      _tooltipEl.classList.add('hidden');
    }
  }, 50);
}
