// Wuthering Waves Draft Overlay
let resonators = [];
let bosses = [];

// ── Shared constants ─────────────────────────────────────────────────────────
const CHAR_ICON_MAP = {
    'luuk-herssen': 'luukherssen',
    'rover-spectro': 'srover',
    'rover-havoc':   'hrover',
    'rover-aero':    'arover',
    'xiangli-yao':   'xiangliyao',
};
const TOWER_KEYS         = ['left','mid1','mid2','mid3','mid4','right'];
const TOWER_BLOCK_LABELS = { left:'L4', mid1:'M1', mid2:'M2', mid3:'M3', mid4:'M4', right:'R4' };
const TOWER_BLOCK_TITLES = { left:'Left 4', mid1:'Mid 1', mid2:'Mid 2', mid3:'Mid 3', mid4:'Mid 4', right:'Right 4' };

let resonatorsById = new Map();
let selectedCharacters1 = new Set();
let selectedCharacters2 = new Set();
let characterResonances1 = {};
let characterResonances2 = {};

const STORAGE_KEY = 'wuwa_overlay_state';
const BG_KEY = 'wuwa_bg_image';
const BG_OVERLAY_KEY = 'wuwa_bg_overlay';
const SAVED_DRAFTS_KEY = 'wuwa_saved_drafts';
let playerName1 = 'Player 1';
let playerName2 = 'Player 2';

function saveAppState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            selectedCharacters1: Array.from(selectedCharacters1),
            selectedCharacters2: Array.from(selectedCharacters2),
            characterResonances1,
            characterResonances2,
            towerConfig,
            playerName1,
            playerName2,
        }));
    } catch (e) {
        console.warn('saveAppState failed:', e);
    }
}

function loadAppState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (Array.isArray(state.selectedCharacters1)) selectedCharacters1 = new Set(state.selectedCharacters1);
        if (Array.isArray(state.selectedCharacters2)) selectedCharacters2 = new Set(state.selectedCharacters2);
        if (state.characterResonances1) characterResonances1 = state.characterResonances1;
        if (state.characterResonances2) characterResonances2 = state.characterResonances2;
        if (state.playerName1) playerName1 = state.playerName1;
        if (state.playerName2) playerName2 = state.playerName2;
        if (state.towerConfig) {
            TOWER_KEYS.forEach(key => {
                if (state.towerConfig[key] && towerConfig[key]) {
                    Object.assign(towerConfig[key], state.towerConfig[key]);
                }
            });
        }
    } catch (e) {
        console.warn('loadAppState failed:', e);
    }
}

const isElectron = typeof window !== 'undefined' && window.electron;

async function loadResonators() {
    try {
        if (isElectron && window.electron.loadResonators) {
            resonators = await window.electron.loadResonators();
            if (!resonators || !resonators.length) {
                return await loadResonatorsFallback();
            }
            renderCharacters();
        } else {
            await loadResonatorsFallback();
        }
    } catch (error) {
        console.error('Error loading resonators:', error);
        showError('Error loading data: ' + error.message);
    }
}

async function loadResonatorsFallback() {
    try {
        const response = await fetch('resonators.json');
        resonators = await response.json();
        if (!resonators || !resonators.length) {
            throw new Error('No characters found in resonators.json');
        }
        renderCharacters();
    } catch (error) {
        console.error('Error in resonators fallback:', error);
        showError('Error loading data: ' + error.message);
    }
}

function applyMainBg(dataUrl) {
    const opacity = parseFloat(localStorage.getItem(BG_OVERLAY_KEY) ?? '0.45');
    ['mainScreen', 'draftScreen'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (dataUrl) {
            const dim = `rgba(0,0,0,${opacity})`;
            el.style.backgroundImage = `linear-gradient(${dim},${dim}),url(${dataUrl})`;
            el.style.backgroundSize = 'cover,cover';
            el.style.backgroundPosition = 'center,center';
            el.style.backgroundRepeat = 'no-repeat,no-repeat';
        } else {
            el.style.backgroundImage = '';
            el.style.backgroundSize = '';
            el.style.backgroundPosition = '';
            el.style.backgroundRepeat = '';
        }
    });
}

function loadMainBg() {
    const stored = localStorage.getItem(BG_KEY);
    if (stored) applyMainBg(stored);
}

function showError(message) {
    const container = document.getElementById('charactersContainer');
    const errorHTML = `<div class="error-message">${message}</div>`;
    if (container) {
        container.innerHTML = errorHTML;
    } else {
        document.body.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

let _appStateLoaded = false;
function renderCharacters() {
    if (!_appStateLoaded) { _appStateLoaded = true; loadAppState(); }
    resonatorsById = new Map(resonators.map(r => [r.id, r]));
    const container = document.getElementById('charactersContainer');
    container.innerHTML = '';

    const titlesRow = document.createElement('div');
    titlesRow.className = 'player-titles';
    titlesRow.innerHTML = `
        <div class="player-title-wrapper">
            <span class="player-title-text">${playerName1}</span>
            <span class="player-counter" id="counter1">Characters: ${selectedCharacters1.size}</span>
            <button class="clear-player-btn" onclick="clearPlayer(1)">Clear</button>
        </div>
        <div class="player-title element-label">Element</div>
        <div class="player-title-wrapper">
            <button class="clear-player-btn" onclick="clearPlayer(2)">Clear</button>
            <span class="player-counter" id="counter2">Characters: ${selectedCharacters2.size}</span>
            <span class="player-title-text">${playerName2}</span>
        </div>
    `;
    container.appendChild(titlesRow);

    const elements = {};
    resonators.forEach(char => {
        if (!elements[char.element]) elements[char.element] = [];
        elements[char.element].push(char);
    });

    const elementOrder = ['Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro'];
    elementOrder.forEach(element => {
        if (elements[element]) container.appendChild(createElementRow(element, elements[element]));
    });

    container.appendChild(createDeckFooter());
}

function createDeckFooter() {
    const footer = document.createElement('div');
    footer.className = 'deck-footer-row';

    const p1Section = document.createElement('div');
    p1Section.className = 'deck-save-section';
    p1Section.innerHTML = `
        <textarea class="deck-import-input" id="deckImport1" placeholder="Paste deck: CharS0,CharS6,..."></textarea>
        <div class="deck-btn-row">
            <button class="deck-import-btn" onclick="importDeck(1)">Import P1</button>
            <button class="deck-export-btn" onclick="exportDeck(1)">Export P1</button>
        </div>
        <input type="text" class="player-name-input" id="playerNameInput1" placeholder="Player 1 name" value="${playerName1}" />
    `;
    p1Section.querySelector('#playerNameInput1').oninput = (e) => {
        playerName1 = e.target.value || 'Player 1';
        document.querySelectorAll('.player-title-text')[0].textContent = playerName1;
        saveAppState();
    };

    const centerSpacer = document.createElement('div');
    centerSpacer.className = 'deck-footer-spacer';
    centerSpacer.innerHTML = `
        <button class="start-draft-btn" onclick="startDraft()">Start Draft</button>
        <button class="tower-btn" onclick="openTower()">Tower ⚙️</button>
        <button class="tower-btn" onclick="openMyTimes()">My Times</button>
    `;

    const p2Section = document.createElement('div');
    p2Section.className = 'deck-save-section';
    p2Section.innerHTML = `
        <textarea class="deck-import-input" id="deckImport2" placeholder="Paste deck: CharS0,CharS6,..."></textarea>
        <div class="deck-btn-row">
            <button class="deck-import-btn" onclick="importDeck(2)">Import P2</button>
            <button class="deck-export-btn" onclick="exportDeck(2)">Export P2</button>
        </div>
        <input type="text" class="player-name-input" id="playerNameInput2" placeholder="Player 2 name" value="${playerName2}" />
    `;
    p2Section.querySelector('#playerNameInput2').oninput = (e) => {
        playerName2 = e.target.value || 'Player 2';
        document.querySelectorAll('.player-title-text')[1].textContent = playerName2;
        saveAppState();
    };

    footer.appendChild(p1Section);
    footer.appendChild(centerSpacer);
    footer.appendChild(p2Section);
    return footer;
}

function createElementRow(element, characters) {
    const row = document.createElement('div');
    row.className = 'element-row';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'player-column';

    const centerColumn = document.createElement('div');
    centerColumn.className = 'element-column';

    const rightColumn = document.createElement('div');
    rightColumn.className = 'player-column';

    const leftGrid = document.createElement('div');
    leftGrid.className = 'character-grid left-grid';

    const rightGrid = document.createElement('div');
    rightGrid.className = 'character-grid right-grid';

    characters.sort((a, b) => a.name.localeCompare(b.name));
    characters.forEach(char => {
        leftGrid.appendChild(createCharacterCard(char, selectedCharacters1, characterResonances1, 'player1'));
        rightGrid.appendChild(createCharacterCard(char, selectedCharacters2, characterResonances2, 'player2'));
    });

    leftColumn.appendChild(leftGrid);
    centerColumn.appendChild(createElementDisplayCard(element));
    rightColumn.appendChild(rightGrid);

    row.appendChild(leftColumn);
    row.appendChild(centerColumn);
    row.appendChild(rightColumn);
    return row;
}

function createElementDisplayCard(element) {
    const card = document.createElement('div');
    card.className = `element-display-card element-${element.toLowerCase()}`;

    const elementIcon = document.createElement('img');
    elementIcon.src = `Icons/Attribute/${element}.png`;
    elementIcon.alt = element;
    elementIcon.className = 'element-icon-large';
    elementIcon.onerror = function() {
        this.src = `Icons/Attribute/${element.toLowerCase()}.png`;
    };

    const elementName = document.createElement('div');
    elementName.className = 'element-name';
    elementName.textContent = element;

    card.appendChild(elementIcon);
    card.appendChild(elementName);
    return card;
}

function createCharacterCard(char, selectedCharacters, characterResonances, playerClass) {
    const card = document.createElement('div');
    card.className = `character-card ${playerClass}`;
    card.dataset.id = char.id;

    if (selectedCharacters.has(char.id)) card.classList.add('selected');
    card.onclick = () => toggleSelection(char.id, card, selectedCharacters, playerClass);

    const icon = document.createElement('div');
    icon.className = 'character-icon';

    const img = document.createElement('img');
    const candidate = CHAR_ICON_MAP[char.id] || char.id;
    const fallbackIds = [
        candidate,
        char.id,
        char.id.replace(/-/g, ''),
        (CHAR_ICON_MAP[char.id] || '').replace(/-/g, '')
    ].filter(Boolean);

    let currentIndex = 0;
    const updateSrc = () => {
        if (currentIndex >= fallbackIds.length) {
            img.style.display = 'none';
            icon.textContent = char.name.charAt(0);
            icon.style.fontSize = '24px';
            icon.style.fontWeight = 'bold';
            icon.style.display = 'flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            return;
        }
        img.src = `Icons/ResonatorsIcons/${fallbackIds[currentIndex++]}.png`;
    };

    img.onerror = () => updateSrc();
    updateSrc();
    img.alt = char.name;
    icon.appendChild(img);

    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = char.name.length > 8 ? char.name.substring(0, 8) + '...' : char.name;

    const resonance = document.createElement('select');
    resonance.className = 'resonance-selector';

    for (let i = 0; i <= 6; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (characterResonances[char.id] === i) option.selected = true;
        resonance.appendChild(option);
    }

    resonance.onchange = (e) => {
        characterResonances[char.id] = parseInt(e.target.value);
        saveAppState();
    };

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(resonance);
    return card;
}

function updateCounters() {
    const c1 = document.getElementById('counter1');
    const c2 = document.getElementById('counter2');
    if (c1) c1.textContent = `Characters: ${selectedCharacters1.size}`;
    if (c2) c2.textContent = `Characters: ${selectedCharacters2.size}`;
}

// ── Draft state ──────────────────────────────────────────────────────────────
let draftPicks = new Array(16).fill(null); // {char, player, resonance}
let currentPickIndex = 0;
let draftPoolListenersAdded = false;
let teamSlots1 = new Array(6).fill(null); // 0-2: Time 1, 3-5: Time 2
let teamSlots2 = new Array(6).fill(null);
let weaponStates1 = new Array(6).fill('yellow');
let weaponStates2 = new Array(6).fill('yellow');
let decksSwapped = false;
let towerBarStates = { left: 'normal', mid1: 'normal', mid2: 'normal', mid3: 'normal', mid4: 'normal', right: 'normal' };
let teamTimes = { p1t1: '', p1t2: '', p2t1: '', p2t2: '' };
let turn1Advantage = 0;
let currentTurn = 1;

// 1=ban P1, 2=ban P2, 3=pick P1, 4=pick P2, 5=pick P2, 6=pick P1,
// 7=pick P1, 8=pick P2, 9=ban P1, 10=ban P2, 11=pick P2, 12=pick P1,
// 13=pick P1, 14=pick P2, 15=pick P2, 16=pick P1
const PICK_ORDER = [1, 2, 1, 2, 2, 1, 1, 2, 1, 2, 2, 1, 1, 2, 2, 1];

function getDraftPlayer(pickIndex) {
    return PICK_ORDER[pickIndex] ?? 1;
}

function startDraft() {
    if (selectedCharacters1.size === 0 && selectedCharacters2.size === 0) {
        alert('No characters selected for the draft.');
        return;
    }
    resetDraftState();
    draftPoolListenersAdded = false;
    decksSwapped = false;
    teamTimes = { p1t1: '', p1t2: '', p2t1: '', p2t2: '' };
    turn1Advantage = 0;
    currentTurn = 1;
    try {
        renderDraftScreen();
        document.getElementById('mainScreen').style.display = 'none';
        document.getElementById('draftScreen').style.display = 'flex';
        if (!draftPoolListenersAdded) {
            const pool = document.getElementById('draftPool');
            pool.addEventListener('dragover', (e) => { e.preventDefault(); });
            pool.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                    if (data.type === 'cascade' && typeof data.idx === 'number') unPickSlot(data.idx);
                } catch (_) {}
            });
            draftPoolListenersAdded = true;
        }
    } catch (err) {
        alert('Error opening draft: ' + err.message);
        console.error(err);
    }
}

function exitDraft() {
    document.getElementById('draftScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

function clearAllPicks() {
    resetDraftState();
    renderDraftScreen();
}

function tradeSelect() {
    decksSwapped = !decksSwapped;
    [selectedCharacters1, selectedCharacters2] = [selectedCharacters2, selectedCharacters1];
    [characterResonances1, characterResonances2] = [characterResonances2, characterResonances1];
    [playerName1, playerName2] = [playerName2, playerName1];
    resetDraftState();
    renderDraftScreen();
    saveAppState();
}

function parseTime(str) {
    if (!str || !str.trim()) return null;
    str = str.trim();
    if (str.includes(':')) {
        const parts = str.split(':');
        const m = parseInt(parts[0], 10);
        const s = parseInt(parts[1], 10);
        if (isNaN(m) || isNaN(s) || s >= 60) return null;
        return m * 60 + s;
    }
    if (!/^\d+$/.test(str)) return null;
    if (str.length <= 2) return parseInt(str, 10);
    const secs = parseInt(str.slice(-2), 10);
    const mins = parseInt(str.slice(0, -2), 10);
    if (secs >= 60) return null;
    return mins * 60 + secs;
}

function formatTime(totalSecs) {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimeSummary() {
    const area = document.getElementById('timeAdvantageArea');
    if (!area) return;

    const t1 = parseTime(teamTimes.p1t1);
    const t2 = parseTime(teamTimes.p1t2);
    const t3 = parseTime(teamTimes.p2t1);
    const t4 = parseTime(teamTimes.p2t2);

    area.innerHTML = '';
    if (t1 === null || t2 === null || t3 === null || t4 === null) return;

    const p1Total = t1 + t2;
    const p2Total = t3 + t4;

    let eff1 = p1Total;
    let eff2 = p2Total;
    if (currentTurn === 2 && turn1Advantage !== 0) {
        if (turn1Advantage > 0) eff2 = Math.max(0, eff2 - turn1Advantage);
        else eff1 = Math.max(0, eff1 - Math.abs(turn1Advantage));
    }

    const totalsRow = document.createElement('div');
    totalsRow.className = 'time-totals-row';
    totalsRow.innerHTML = `<span style="color:#00d1ff">${playerName1}: ${formatTime(p1Total)}</span><span class="time-diff-sep">vs</span><span style="color:#a020f0">${playerName2}: ${formatTime(p2Total)}</span>`;
    area.appendChild(totalsRow);

    if (currentTurn === 2 && turn1Advantage !== 0) {
        const advNote = document.createElement('div');
        advNote.className = 'time-advantage-note';
        const advHolder = turn1Advantage > 0 ? playerName1 : playerName2;
        advNote.textContent = `T1 advantage: ${advHolder} +${formatTime(Math.abs(turn1Advantage))}`;
        area.appendChild(advNote);

        const effRow = document.createElement('div');
        effRow.className = 'time-totals-row';
        effRow.innerHTML = `<span style="color:#00d1ff">${playerName1}: ${formatTime(eff1)}</span><span class="time-diff-sep">vs</span><span style="color:#a020f0">${playerName2}: ${formatTime(eff2)}</span>`;
        area.appendChild(effRow);
    }

    const diff = eff1 - eff2;
    const diffDiv = document.createElement('div');
    diffDiv.className = 'time-diff';
    if (diff > 0) {
        diffDiv.innerHTML = `<span style="color:#00d1ff">${playerName1}</span> wins by ${formatTime(diff)}`;
    } else if (diff < 0) {
        diffDiv.innerHTML = `<span style="color:#a020f0">${playerName2}</span> wins by ${formatTime(Math.abs(diff))}`;
    } else {
        diffDiv.textContent = 'Tied!';
    }
    area.appendChild(diffDiv);

    if (currentTurn === 1) {
        const goBtn = document.createElement('button');
        goBtn.className = 'go-second-turn-btn';
        goBtn.textContent = 'Go Second Turn';
        goBtn.onclick = goSecondTurn;
        area.appendChild(goBtn);
    }
}

function goSecondTurn() {
    const t1 = parseTime(teamTimes.p1t1);
    const t2 = parseTime(teamTimes.p1t2);
    const t3 = parseTime(teamTimes.p2t1);
    const t4 = parseTime(teamTimes.p2t2);
    if (t1 === null || t2 === null || t3 === null || t4 === null) return;

    const p1Total = t1 + t2;
    const p2Total = t3 + t4;
    const advantage = p1Total - p2Total;

    decksSwapped = !decksSwapped;
    [selectedCharacters1, selectedCharacters2] = [selectedCharacters2, selectedCharacters1];
    [characterResonances1, characterResonances2] = [characterResonances2, characterResonances1];
    [playerName1, playerName2] = [playerName2, playerName1];

    // After name swap, negate so turn1Advantage > 0 still means "current P1 won T1"
    turn1Advantage = -advantage;
    currentTurn = 2;
    resetDraftState();
    teamTimes = { p1t1: '', p1t2: '', p2t1: '', p2t2: '' };

    renderDraftScreen();
    saveAppState();
}

function getPlayerNonBanPicks(player) {
    return Array.from({ length: 16 }, (_, i) => i)
        .filter(i => !BAN_INDICES.has(i) && getDraftPlayer(i) === player)
        .map(i => draftPicks[i]);
}

function pickCharacter(charId) {
    if (currentPickIndex >= 16) return;
    const player = getDraftPlayer(currentPickIndex);
    // During a ban, the active player bans from the OPPONENT's deck
    const ban = isBanPick(currentPickIndex);
    const pool = ban
        ? (player === 1 ? selectedCharacters2 : selectedCharacters1)
        : (player === 1 ? selectedCharacters1 : selectedCharacters2);
    if (!pool.has(charId)) return;
    if (draftPicks.some(p => p && p.char.id === charId)) return;
    const char = resonatorsById.get(charId);
    const resonance = ban
        ? (player === 1 ? (characterResonances2[charId] || 0) : (characterResonances1[charId] || 0))
        : (player === 1 ? (characterResonances1[charId] || 0) : (characterResonances2[charId] || 0));
    draftPicks[currentPickIndex] = { char, player, resonance };
    currentPickIndex++;
    renderDraftScreen();
}

function unPickSlot(idx) {
    if (!draftPicks[idx]) return;
    draftPicks[idx] = null;
    currentPickIndex = draftPicks.findIndex(p => p === null);
    if (currentPickIndex === -1) currentPickIndex = 16;
    renderDraftScreen();
}

function swapDraftSlots(a, b) {
    const temp = draftPicks[a];
    draftPicks[a] = draftPicks[b];
    draftPicks[b] = temp;
    currentPickIndex = draftPicks.findIndex(p => p === null);
    if (currentPickIndex === -1) currentPickIndex = 16;
    renderDraftScreen();
}

function placeDraftPickAt(charId, charPlayer, slotIdx) {
    if (draftPicks.some(p => p && p.char.id === charId)) return;
    if (draftPicks[slotIdx]) return;
    const char = resonatorsById.get(charId);
    if (!char) return;
    const resonance = charPlayer === 1 ? (characterResonances1[charId] || 0) : (characterResonances2[charId] || 0);
    draftPicks[slotIdx] = { char, player: charPlayer, resonance };
    currentPickIndex = draftPicks.findIndex(p => p === null);
    if (currentPickIndex === -1) currentPickIndex = 16;
    renderDraftScreen();
}

const BAN_INDICES = new Set([0, 1, 8, 9]);

function resetDraftState() {
    draftPicks = new Array(16).fill(null);
    currentPickIndex = 0;
    teamSlots1 = new Array(6).fill(null);
    teamSlots2 = new Array(6).fill(null);
    weaponStates1 = new Array(6).fill('yellow');
    weaponStates2 = new Array(6).fill('yellow');
    towerBarStates = { left: 'normal', mid1: 'normal', mid2: 'normal', mid3: 'normal', mid4: 'normal', right: 'normal' };
}

function isBanPick(idx) { return BAN_INDICES.has(idx); }

function appendTowerBlockContent(block, key, cfg) {
    const lbl = document.createElement('div');
    lbl.className = 'tb-label';
    lbl.textContent = TOWER_BLOCK_LABELS[key];
    block.appendChild(lbl);

    const recArea = document.createElement('div');
    recArea.className = 'tb-rec-area';
    const recElems = (cfg.recommended || []).filter(Boolean);
    if (recElems.length > 0) {
        const recRow = document.createElement('div');
        recRow.className = 'tb-elem-row';
        recElems.forEach(elem => {
            const img = document.createElement('img');
            img.src = `Icons/Attribute/${elem}.png`;
            img.className = 'tb-elem-icon';
            img.title = elem;
            recRow.appendChild(img);
        });
        recArea.appendChild(recRow);
    }
    block.appendChild(recArea);

    const bossIds = key === 'mid4'
        ? [cfg.boss2].filter(Boolean)
        : [cfg.boss, cfg.boss1].filter(Boolean);
    bossIds.forEach(id => {
        const bossData = bosses.find(b => b.id === id);
        if (!bossData) return;
        const bossWrap = document.createElement('div');
        bossWrap.className = 'tb-boss-wrap';
        const img = document.createElement('img');
        img.src = `Icons/IconsBoss/${bossData.image}.png`;
        img.className = 'tb-boss-img';
        img.title = bossData.name;
        img.onerror = () => { img.style.display = 'none'; };
        bossWrap.appendChild(img);
        const resists = [bossData.Resist1, bossData.Resist2].filter(r => r && r !== 'none');
        if (resists.length > 0) {
            const resRow = document.createElement('div');
            resRow.className = 'tb-elem-row';
            resists.forEach(elem => {
                const rImg = document.createElement('img');
                rImg.src = `Icons/Attribute/${elem}.png`;
                rImg.className = 'tb-resist-icon';
                rImg.title = elem;
                resRow.appendChild(rImg);
            });
            bossWrap.appendChild(resRow);
        }
        block.appendChild(bossWrap);
    });

    const infoBtn = document.createElement('button');
    infoBtn.className = 'tb-info-btn';
    infoBtn.textContent = 'Info';
    infoBtn.onclick = (e) => { e.stopPropagation(); showTowerBlockInfo(key); };
    block.appendChild(infoBtn);
}

function renderTowerBar() {
    const bar = document.getElementById('towerBar');
    if (!bar) return;
    bar.innerHTML = '';

    TOWER_KEYS.forEach(key => {
        const state = towerBarStates[key] || 'normal';
        const block = document.createElement('div');
        block.className = `tb-block tb-block-${state}`;

        block.onclick = () => {
            const cur = towerBarStates[key];
            const bannedCount   = Object.values(towerBarStates).filter(s => s === 'banned').length;
            const selectedCount = Object.values(towerBarStates).filter(s => s === 'selected').length;
            if (cur !== 'normal') {
                towerBarStates[key] = 'normal';
            } else if (bannedCount < 2) {
                towerBarStates[key] = 'banned';
            } else if (selectedCount < 2) {
                towerBarStates[key] = 'selected';
            }
            renderDraftScreen();
        };

        appendTowerBlockContent(block, key, towerConfig[key]);
        bar.appendChild(block);
    });
}

function showTowerBlockInfo(key) {
    const cfg = towerConfig[key];
    const descText = key === 'mid2' ? towerConfig.mid1.description
                   : key === 'mid4' ? towerConfig.mid3.description
                   : cfg.description;

    document.querySelectorAll('.tb-info-overlay').forEach(e => e.remove());

    const overlay = document.createElement('div');
    overlay.className = 'tb-info-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const modal = document.createElement('div');
    modal.className = 'tb-info-modal';

    const hdr = document.createElement('div');
    hdr.className = 'tb-info-header';
    const titleEl = document.createElement('span');
    titleEl.className = 'tb-info-title';
    titleEl.textContent = TOWER_BLOCK_TITLES[key];
    hdr.appendChild(titleEl);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tb-info-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => overlay.remove();
    hdr.appendChild(closeBtn);
    modal.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'tb-info-body';

    function addElemSection(sectionLabel, elems) {
        if (!elems.length) return;
        const sec = document.createElement('div');
        sec.className = 'tb-info-section';
        const lbl = document.createElement('div');
        lbl.className = 'tb-info-sec-label';
        lbl.innerHTML = `<span class="tb-info-sword">⚔</span> ${sectionLabel}`;
        sec.appendChild(lbl);
        const row = document.createElement('div');
        row.className = 'tb-info-elem-row';
        elems.forEach(elem => {
            const item = document.createElement('div');
            item.className = 'tb-info-elem-item';
            const img = document.createElement('img');
            img.src = `Icons/Attribute/${elem}.png`;
            img.className = 'tb-info-elem-icon';
            img.title = elem;
            const name = document.createElement('span');
            name.textContent = elem;
            item.appendChild(img);
            item.appendChild(name);
            row.appendChild(item);
        });
        sec.appendChild(row);
        body.appendChild(sec);
    }

    // Recommended
    addElemSection('Recommended', (cfg.recommended || []).filter(Boolean));

    // Type section — rows: T11/T12, T21, T22
    const typeRows = [];
    if (cfg.type) {
        const row1 = cfg.type.filter(Boolean);
        if (row1.length) typeRows.push(row1);
    }
    if (cfg.extra !== undefined) {
        if (Array.isArray(cfg.extra)) {
            if (cfg.extra[0]) typeRows.push([cfg.extra[0]]);
            if (cfg.extra[1]) typeRows.push([cfg.extra[1]]);
        } else if (cfg.extra) {
            typeRows.push([cfg.extra]);
        }
    }
    if (typeRows.length) {
        const typeSec = document.createElement('div');
        typeSec.className = 'tb-info-section';
        const typeLbl = document.createElement('div');
        typeLbl.className = 'tb-info-sec-label';
        typeLbl.innerHTML = `<span class="tb-info-sword">⚔</span> Type`;
        typeSec.appendChild(typeLbl);
        typeRows.forEach(rowElems => {
            const row = document.createElement('div');
            row.className = 'tb-info-elem-row';
            rowElems.forEach(elem => {
                const item = document.createElement('div');
                item.className = 'tb-info-elem-item';
                const img = document.createElement('img');
                img.src = `Icons/Attribute/${elem}.png`;
                img.className = 'tb-info-elem-icon';
                img.title = elem;
                const name = document.createElement('span');
                name.textContent = elem;
                item.appendChild(img);
                item.appendChild(name);
                row.appendChild(item);
            });
            typeSec.appendChild(row);
        });
        body.appendChild(typeSec);
    }

    // Boss(es)
    const bossIds = [cfg.boss, cfg.boss1, cfg.boss2].filter(Boolean);
    bossIds.forEach(id => {
        const bd = bosses.find(b => b.id === id);
        if (!bd) return;
        const sec = document.createElement('div');
        sec.className = 'tb-info-section';
        const lbl = document.createElement('div');
        lbl.className = 'tb-info-sec-label';
        lbl.innerHTML = `<span class="tb-info-sword">⚔</span> Boss`;
        sec.appendChild(lbl);
        const bossRow = document.createElement('div');
        bossRow.className = 'tb-info-boss-row';
        const bImg = document.createElement('img');
        bImg.src = `Icons/IconsBoss/${bd.image}.png`;
        bImg.className = 'tb-info-boss-img';
        bImg.onerror = () => { bImg.style.display = 'none'; };
        bossRow.appendChild(bImg);
        const bDetails = document.createElement('div');
        bDetails.className = 'tb-info-boss-details';
        const bName = document.createElement('div');
        bName.className = 'tb-info-boss-name';
        bName.textContent = bd.name;
        bDetails.appendChild(bName);
        const resists = [bd.Resist1, bd.Resist2].filter(r => r && r !== 'none');
        if (resists.length) {
            const rRow = document.createElement('div');
            rRow.className = 'tb-info-elem-row';
            resists.forEach(elem => {
                const item = document.createElement('div');
                item.className = 'tb-info-elem-item';
                const rImg = document.createElement('img');
                rImg.src = `Icons/Attribute/${elem}.png`;
                rImg.className = 'tb-info-elem-icon';
                const rName = document.createElement('span');
                rName.textContent = elem;
                item.appendChild(rImg);
                item.appendChild(rName);
                rRow.appendChild(item);
            });
            bDetails.appendChild(rRow);
        }
        bossRow.appendChild(bDetails);
        sec.appendChild(bossRow);
        body.appendChild(sec);
    });

    // Description
    if (descText) {
        const sec = document.createElement('div');
        sec.className = 'tb-info-section';
        const lbl = document.createElement('div');
        lbl.className = 'tb-info-sec-label';
        lbl.innerHTML = `<span class="tb-info-sword">⚔</span> Description`;
        sec.appendChild(lbl);
        const desc = document.createElement('p');
        desc.className = 'tb-info-desc';
        desc.textContent = descText;
        sec.appendChild(desc);
        body.appendChild(sec);
    }

    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function renderDraftScreen() {
    const isDone = currentPickIndex >= 16;
    const player = isDone ? null : getDraftPlayer(currentPickIndex);
    const isBan = !isDone && isBanPick(currentPickIndex);
    const status = document.getElementById('draftStatus');
    if (status) {
        status.textContent = isDone
            ? 'Draft complete!'
            : `${isBan ? 'Ban' : 'Pick'} ${currentPickIndex + 1}/16 — Player ${player}`;
        status.style.color = isDone ? '#ffd700' : (isBan ? '#dc2626' : (player === 1 ? '#00d1ff' : '#a020f0'));
    }
    renderTowerBar();
    renderDraftPool();
    renderDraftCascade();
}

function buildCharImg(char, wrapperClass = 'draft-icon-circle') {
    const wrapper = document.createElement('div');
    wrapper.className = wrapperClass;
    const img = document.createElement('img');
    img.alt = char.name;
    const ids = [CHAR_ICON_MAP[char.id] || char.id, char.id, char.id.replace(/-/g, '')].filter(Boolean);
    let idx = 0;
    const tryNext = () => {
        if (idx >= ids.length) {
            img.style.display = 'none';
            wrapper.textContent = char.name.charAt(0);
            Object.assign(wrapper.style, { fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' });
            return;
        }
        img.src = `Icons/ResonatorsIcons/${ids[idx++]}.png`;
    };
    img.onerror = tryNext;
    tryNext();
    wrapper.appendChild(img);
    return wrapper;
}

function createDraftCharCard(char, charPlayer, currentPlayer, isBanPhase = false) {
    const card = document.createElement('div');
    card.className = 'character-card';

    // Ban: active player clicks the OPPONENT's cards; Pick: own cards
    const isActive = isBanPhase
        ? (currentPlayer !== null && currentPlayer !== charPlayer)
        : (currentPlayer === charPlayer);

    if (isActive) {
        card.classList.add('draft-active');
        card.onclick = () => pickCharacter(char.id);
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'pool', charId: char.id, charPlayer }));
            e.dataTransfer.effectAllowed = 'move';
        });
    } else {
        card.classList.add('draft-inactive');
    }

    card.appendChild(buildCharImg(char, 'character-icon'));

    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = char.name.length > 8 ? char.name.substring(0, 8) + '...' : char.name;

    const res = charPlayer === 1 ? (characterResonances1[char.id] || 0) : (characterResonances2[char.id] || 0);
    const resDiv = document.createElement('div');
    resDiv.className = 'draft-char-res';
    resDiv.textContent = `S${res}`;

    card.appendChild(name);
    card.appendChild(resDiv);
    return card;
}

function renderDraftPool() {
    const pool = document.getElementById('draftPool');
    pool.innerHTML = '';
    const currentPlayer = currentPickIndex < 16 ? getDraftPlayer(currentPickIndex) : null;
    const isBanPhase = currentPickIndex < 16 && isBanPick(currentPickIndex);
    pool.dataset.turn = currentPlayer
        ? (isBanPhase ? `ban${currentPlayer}` : `p${currentPlayer}`)
        : 'none';
    const pickedIds = new Set(draftPicks.filter(Boolean).map(p => p.char.id));

    const titlesRow = document.createElement('div');
    titlesRow.className = 'player-titles';
    titlesRow.innerHTML = `
        <div class="player-title-wrapper"><span class="player-title-text" style="color:#00d1ff">${playerName1}</span></div>
        <div class="player-title element-label">Element</div>
        <div class="player-title-wrapper" style="justify-content:flex-end"><span class="player-title-text" style="color:#a020f0">${playerName2}</span></div>
    `;
    pool.appendChild(titlesRow);

    const elementOrder = ['Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro'];
    const byElement = {};
    resonators.forEach(c => {
        if (!selectedCharacters1.has(c.id) && !selectedCharacters2.has(c.id)) return;
        if (!byElement[c.element]) byElement[c.element] = [];
        byElement[c.element].push(c);
    });

    elementOrder.forEach(el => {
        if (!byElement[el]) return;
        const chars = byElement[el];
        chars.sort((a, b) => a.name.localeCompare(b.name));

        const hasP1 = chars.some(c => selectedCharacters1.has(c.id) && !pickedIds.has(c.id));
        const hasP2 = chars.some(c => selectedCharacters2.has(c.id) && !pickedIds.has(c.id));
        if (!hasP1 && !hasP2) return;

        const row = document.createElement('div');
        row.className = 'element-row';

        const leftCol = document.createElement('div');
        leftCol.className = 'player-column';
        const leftGrid = document.createElement('div');
        leftGrid.className = 'character-grid';
        leftGrid.style.justifyContent = 'flex-end';
        chars.forEach(c => { if (selectedCharacters1.has(c.id) && !pickedIds.has(c.id)) leftGrid.appendChild(createDraftCharCard(c, 1, currentPlayer, isBanPhase)); });
        leftCol.appendChild(leftGrid);

        const centerCol = document.createElement('div');
        centerCol.className = 'element-column';
        centerCol.appendChild(createElementDisplayCard(el));

        const rightCol = document.createElement('div');
        rightCol.className = 'player-column';
        const rightGrid = document.createElement('div');
        rightGrid.className = 'character-grid';
        rightGrid.style.justifyContent = 'flex-start';
        chars.forEach(c => { if (selectedCharacters2.has(c.id) && !pickedIds.has(c.id)) rightGrid.appendChild(createDraftCharCard(c, 2, currentPlayer, isBanPhase)); });
        rightCol.appendChild(rightGrid);

        row.appendChild(leftCol);
        row.appendChild(centerCol);
        row.appendChild(rightCol);
        pool.appendChild(row);
    });

    renderPicksSummary(pool);
}

function renderPicksSummary(pool) {
    const p1Picks = getPlayerNonBanPicks(1);
    const p2Picks = getPlayerNonBanPicks(2);
    if (!p1Picks.some(Boolean) && !p2Picks.some(Boolean)) return;

    const divider = document.createElement('div');
    divider.className = 'picks-divider';
    pool.appendChild(divider);

    const summary = document.createElement('div');
    summary.className = 'picks-summary';
    summary.appendChild(buildPicksSection(1, p1Picks, teamSlots1));
    summary.appendChild(buildPicksSection(2, p2Picks, teamSlots2));
    pool.appendChild(summary);

    const timeAdvArea = document.createElement('div');
    timeAdvArea.id = 'timeAdvantageArea';
    timeAdvArea.className = 'time-advantage-area';
    pool.appendChild(timeAdvArea);
    updateTimeSummary();
}

function buildMiniRoomBlock(key) {
    if (!towerConfig[key]) return null;
    const block = document.createElement('div');
    block.className = 'tb-block team-room-mini';
    appendTowerBlockContent(block, key, towerConfig[key]);
    return block;
}

function buildPicksSection(player, picks, teamSlots) {
    const color = player === 1 ? '#00d1ff' : '#a020f0';
    const picksMap = new Map(draftPicks.filter(Boolean).map(p => [p.char.id, p]));

    const section = document.createElement('div');
    section.className = 'picks-player-section';

    const title = document.createElement('div');
    title.className = 'picks-section-title';
    title.textContent = player === 1 ? playerName1 : playerName2;
    title.style.color = color;
    section.appendChild(title);

    const assignedIds = new Set(teamSlots.filter(Boolean));

    const circlesRow = document.createElement('div');
    circlesRow.className = 'picks-circles-row';
    picks.forEach(pick => {
        if (!pick) {
            const empty = document.createElement('div');
            empty.className = 'picks-circle picks-circle-empty';
            circlesRow.appendChild(empty);
        } else if (!assignedIds.has(pick.char.id)) {
            const circle = buildCharImg(pick.char, 'picks-circle');
            circle.title = pick.char.name;
            circle.draggable = true;
            circle.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'team-assign', charId: pick.char.id, fromPlayer: player }));
                e.dataTransfer.effectAllowed = 'move';
            });
            circlesRow.appendChild(circle);
        }
        // if assigned to a team slot: omit from top row (visible in team slots below)
    });
    section.appendChild(circlesRow);

    const selectedRooms = TOWER_KEYS.filter(k => towerBarStates[k] === 'selected');

    for (let team = 1; team <= 2; team++) {
        const group = document.createElement('div');
        group.className = 'picks-team-group';

        const roomKey = selectedRooms[team - 1] || null;
        if (roomKey) {
            const mini = buildMiniRoomBlock(roomKey);
            if (mini) group.appendChild(mini);
        }

        const teamContent = document.createElement('div');
        teamContent.className = 'picks-team-content';

        const labelRow = document.createElement('div');
        labelRow.className = 'picks-team-label-row';

        const label = document.createElement('div');
        label.className = 'picks-team-label';
        label.textContent = `Team ${team}`;
        label.style.color = color;
        labelRow.appendChild(label);

        const timeKey = `p${player}t${team}`;
        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.className = 'team-time-input';
        timeInput.placeholder = '0:00';
        timeInput.value = teamTimes[timeKey] || '';
        timeInput.addEventListener('input', (e) => {
            teamTimes[timeKey] = e.target.value;
            updateTimeSummary();
        });
        labelRow.appendChild(timeInput);

        teamContent.appendChild(labelRow);

        const slotsRow = document.createElement('div');
        slotsRow.className = 'picks-team-slots';

        for (let s = 0; s < 3; s++) {
            const slotIdx = (team - 1) * 3 + s;
            const assignedId = teamSlots[slotIdx];
            const weaponStates = player === 1 ? weaponStates1 : weaponStates2;

            const unit = document.createElement('div');
            unit.className = 'picks-slot-unit';

            const slot = document.createElement('div');
            slot.className = 'picks-team-slot';

            if (assignedId) {
                const pick = picksMap.get(assignedId);
                if (pick) slot.appendChild(buildCharImg(pick.char, 'picks-circle'));
                slot.classList.add('picks-team-slot-filled');
                slot.draggable = true;
                slot.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'team-assign', charId: assignedId, fromPlayer: player }));
                    e.dataTransfer.effectAllowed = 'move';
                });
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    teamSlots[slotIdx] = null;
                    weaponStates[slotIdx] = 'yellow';
                    renderDraftScreen();
                });
            } else {
                const plus = document.createElement('span');
                plus.className = 'picks-slot-plus';
                plus.textContent = '+';
                slot.appendChild(plus);
            }

            slot.addEventListener('dragover', (e) => { e.preventDefault(); });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
                    if (data.type === 'team-assign' && data.fromPlayer === player) {
                        const fromIdx = teamSlots.indexOf(data.charId);
                        const displaced = teamSlots[slotIdx];
                        if (fromIdx !== -1) {
                            // Slot-to-slot swap: carry weapon state with character
                            const tempW = weaponStates[fromIdx];
                            weaponStates[fromIdx] = displaced ? weaponStates[slotIdx] : 'yellow';
                            weaponStates[slotIdx] = tempW;
                            teamSlots[fromIdx] = displaced || null;
                        } else {
                            // New assignment from picks row: set state by rarity
                            const dragPick = picksMap.get(data.charId);
                            weaponStates[slotIdx] = (dragPick?.char?.rarity === 4) ? 'purple' : 'yellow';
                        }
                        teamSlots[slotIdx] = data.charId;
                        renderDraftScreen();
                    }
                } catch (_) {}
            });

            unit.appendChild(slot);

            const wState = weaponStates[slotIdx] || 'yellow';
            const weaponBtn = document.createElement('button');
            weaponBtn.className = `weapon-btn weapon-btn-${wState}`;
            weaponBtn.textContent = 'weapon';
            weaponBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cycle = ['yellow', 'purple', 'blue'];
                const next = cycle[(cycle.indexOf(weaponStates[slotIdx]) + 1) % 3];
                weaponStates[slotIdx] = next;
                weaponBtn.className = `weapon-btn weapon-btn-${next}`;
            });
            unit.appendChild(weaponBtn);

            slotsRow.appendChild(unit);
        }
        teamContent.appendChild(slotsRow);
        group.appendChild(teamContent);
        section.appendChild(group);
    }
    return section;
}

function renderDraftCascade() {
    const cascade = document.getElementById('draftCascade');
    cascade.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'cascade-header';

    const row1 = document.createElement('div');
    row1.className = 'cascade-header-row';

    const tradeBtn = document.createElement('button');
    tradeBtn.className = `cascade-trade-btn${decksSwapped ? ' active' : ''}`;
    tradeBtn.textContent = 'Switch';
    tradeBtn.onclick = tradeSelect;
    row1.appendChild(tradeBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'cascade-clear-btn';
    clearBtn.textContent = 'Clear';
    clearBtn.onclick = clearAllPicks;
    row1.appendChild(clearBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'cascade-save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = saveDraft;
    row1.appendChild(saveBtn);
    header.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'cascade-header-row';

    const viewTimesBtn = document.createElement('button');
    viewTimesBtn.className = 'cascade-viewtimes-btn';
    viewTimesBtn.textContent = 'View Times';
    viewTimesBtn.onclick = () => openViewTimes(null);
    row2.appendChild(viewTimesBtn);

    const draftsBtn = document.createElement('button');
    draftsBtn.className = 'cascade-drafts-btn';
    draftsBtn.textContent = 'Drafts';
    draftsBtn.onclick = openSavedDrafts;
    row2.appendChild(draftsBtn);
    header.appendChild(row2);

    cascade.appendChild(header);

    const playerNamesRow = document.createElement('div');
    playerNamesRow.className = 'cascade-player-names';
    const p1Label = document.createElement('div');
    p1Label.className = 'cascade-player-name cascade-player-name-p1';
    p1Label.textContent = playerName1;
    const p2Label = document.createElement('div');
    p2Label.className = 'cascade-player-name cascade-player-name-p2';
    p2Label.textContent = playerName2;
    playerNamesRow.appendChild(p1Label);
    playerNamesRow.appendChild(p2Label);
    cascade.appendChild(playerNamesRow);

    // SLOT_H = full slot height (cs-num ~9px + icon 60px + 3px gap)
    // When switching sides: next pick starts at SLOT_H/2 (half-overlap stagger)
    // When same side: next pick starts at SLOT_H (no overlap possible, same column)
    const SLOT_H = 72;

    const tops = [0];
    for (let i = 1; i < 16; i++) {
        const sameSide = getDraftPlayer(i - 1) === getDraftPlayer(i);
        tops.push(tops[i - 1] + (sameSide ? SLOT_H : Math.round(SLOT_H / 2)));
    }

    const grid = document.createElement('div');
    grid.className = 'cascade-grid';
    grid.style.height = (tops[15] + SLOT_H) + 'px';

    for (let i = 0; i < 16; i++) {
        const player = getDraftPlayer(i);
        const slot = buildCascadeSlot(i);
        slot.style.top   = tops[i] + 'px';
        slot.style.left  = player === 1 ? '0' : 'calc(50% + 2px)';
        slot.style.width = 'calc(50% - 2px)';
        grid.appendChild(slot);
    }
    cascade.appendChild(grid);
}

function buildCascadeSlot(idx) {
    const player = getDraftPlayer(idx);
    const pick = draftPicks[idx];
    const isCurrent = idx === currentPickIndex && currentPickIndex < 16;
    const isBan = BAN_INDICES.has(idx);

    const slot = document.createElement('div');
    slot.className = `cascade-slot cs-p${player}`;
    if (isCurrent) slot.classList.add('cs-current');
    if (isBan) slot.classList.add('cs-ban');

    slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (draftPicks[idx]) unPickSlot(idx);
    });

    if (pick) {
        slot.draggable = true;
        slot.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'cascade', idx }));
            e.dataTransfer.effectAllowed = 'move';
        });
    }

    slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    slot.addEventListener('drop', (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
            if (data.type === 'cascade' && typeof data.idx === 'number') {
                swapDraftSlots(data.idx, idx);
            } else if (data.type === 'pool') {
                placeDraftPickAt(data.charId, data.charPlayer, idx);
            }
        } catch (_) {}
    });

    const num = document.createElement('div');
    num.className = 'cs-num';
    num.textContent = idx + 1;
    slot.appendChild(num);

    if (pick) {
        slot.appendChild(buildCharImg(pick.char));
        const res = document.createElement('div');
        res.className = 'cs-res';
        res.textContent = `S${pick.resonance}`;
        slot.appendChild(res);
    } else {
        const empty = document.createElement('div');
        empty.className = 'cs-empty';
        empty.textContent = '+';
        slot.appendChild(empty);
    }
    return slot;
}

// ── Saved Drafts ──────────────────────────────────────────────────────────────

function loadSavedDrafts() {
    try { return JSON.parse(localStorage.getItem(SAVED_DRAFTS_KEY) || '[]'); }
    catch(e) { return []; }
}

function saveDraft() {
    const drafts = loadSavedDrafts();
    const savedRooms = TOWER_KEYS.filter(k => towerBarStates[k] === 'selected')
        .map(k => TOWER_BLOCK_TITLES[k]);
    drafts.push({
        id: Date.now(),
        savedAt: Date.now(),
        player1: playerName1,
        player2: playerName2,
        rooms: savedRooms,
        pickOrder: Array.from({length: 16}, (_, i) => getDraftPlayer(i)),
        picks: draftPicks.map((pick, i) => pick ? {
            charId: pick.char.id,
            charName: pick.char.name,
            player: pick.player,
            resonance: pick.resonance,
            isBan: BAN_INDICES.has(i)
        } : null)
    });
    try { localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(drafts)); }
    catch(e) {}
    openSavedDrafts();
}

function deleteSavedDraft(id) {
    const drafts = loadSavedDrafts().filter(d => d.id !== id);
    localStorage.setItem(SAVED_DRAFTS_KEY, JSON.stringify(drafts));
    openSavedDrafts();
}

function buildMiniCascadeGrid(draft) {
    const SLOT_H = 62;
    const tops = [0];
    for (let i = 1; i < 16; i++) {
        const sameSide = draft.pickOrder[i - 1] === draft.pickOrder[i];
        tops.push(tops[i - 1] + (sameSide ? SLOT_H : Math.round(SLOT_H / 2)));
    }
    const grid = document.createElement('div');
    grid.className = 'sd-cascade-grid';
    grid.style.height = (tops[15] + SLOT_H) + 'px';

    for (let i = 0; i < 16; i++) {
        const player = draft.pickOrder[i];
        const pick = draft.picks[i];
        const isBan = pick ? pick.isBan : BAN_INDICES.has(i);

        const wrap = document.createElement('div');
        wrap.className = 'sd-slot-wrap';
        wrap.style.top  = tops[i] + 'px';
        wrap.style.left = player === 1 ? '0' : 'calc(50% + 1px)';
        wrap.style.width = 'calc(50% - 1px)';

        const slot = document.createElement('div');
        slot.className = `sd-slot cs-p${player}${isBan ? ' cs-ban' : ''}`;

        const num = document.createElement('div');
        num.className = 'sd-slot-num';
        num.textContent = i + 1;
        slot.appendChild(num);

        if (pick) {
            const char = resonatorsById.get(pick.charId);
            if (char) slot.appendChild(buildCharImg(char, 'sd-icon'));
        } else {
            const empty = document.createElement('div');
            empty.className = 'cs-empty';
            empty.textContent = '+';
            slot.appendChild(empty);
        }
        wrap.appendChild(slot);
        grid.appendChild(wrap);
    }
    return grid;
}

function buildSavedDraftCard(draft) {
    const card = document.createElement('div');
    card.className = 'sd-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'sd-card-header';

    const names = document.createElement('div');
    names.className = 'sd-card-names';
    const n1 = document.createElement('span');
    n1.className = 'sd-name-p1';
    n1.textContent = draft.player1;
    const sep = document.createElement('span');
    sep.className = 'sd-name-sep';
    sep.textContent = ' vs ';
    const n2 = document.createElement('span');
    n2.className = 'sd-name-p2';
    n2.textContent = draft.player2;
    names.appendChild(n1); names.appendChild(sep); names.appendChild(n2);

    const delBtn = document.createElement('button');
    delBtn.className = 'sd-del-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = () => deleteSavedDraft(draft.id);

    cardHeader.appendChild(names);
    cardHeader.appendChild(delBtn);
    card.appendChild(cardHeader);

    if (draft.rooms && draft.rooms.length) {
        const roomsRow = document.createElement('div');
        roomsRow.className = 'cascade-rooms-row';
        const r1 = document.createElement('span');
        r1.textContent = draft.rooms[0] || '—';
        const sep = document.createElement('span');
        sep.className = 'cascade-rooms-sep';
        sep.textContent = '|';
        const r2 = document.createElement('span');
        r2.textContent = draft.rooms[1] || '—';
        roomsRow.appendChild(r1);
        roomsRow.appendChild(sep);
        roomsRow.appendChild(r2);
        card.appendChild(roomsRow);
    }

    const colLabels = document.createElement('div');
    colLabels.className = 'sd-col-labels';
    const l1 = document.createElement('div');
    l1.className = 'sd-col-label sd-col-label-p1';
    l1.textContent = draft.player1;
    const l2 = document.createElement('div');
    l2.className = 'sd-col-label sd-col-label-p2';
    l2.textContent = draft.player2;
    colLabels.appendChild(l1); colLabels.appendChild(l2);
    card.appendChild(colLabels);

    const gridWrap = document.createElement('div');
    gridWrap.className = 'sd-grid-wrap';
    gridWrap.appendChild(buildMiniCascadeGrid(draft));
    card.appendChild(gridWrap);

    return card;
}

function openSavedDrafts() {
    let modal = document.getElementById('savedDraftsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'savedDraftsModal';
        modal.className = 'sd-modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = '';
    modal.style.display = 'flex';

    const topBar = document.createElement('div');
    topBar.className = 'sd-topbar';
    const title = document.createElement('span');
    title.className = 'sd-title';
    title.textContent = 'Saved Drafts';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sd-close-btn';
    closeBtn.textContent = '← Back';
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    topBar.appendChild(closeBtn);
    topBar.appendChild(title);
    modal.appendChild(topBar);

    const drafts = loadSavedDrafts();
    const body = document.createElement('div');
    body.className = 'sd-body';

    if (!drafts.length) {
        const empty = document.createElement('div');
        empty.className = 'sd-empty';
        empty.textContent = 'No saved drafts yet.';
        body.appendChild(empty);
    } else {
        drafts.slice().reverse().forEach(d => body.appendChild(buildSavedDraftCard(d)));
    }
    modal.appendChild(body);
}

function toggleSelection(charId, card, selectedCharacters, playerClass) {
    if (selectedCharacters.has(charId)) {
        selectedCharacters.delete(charId);
        card.classList.remove('selected');
    } else {
        selectedCharacters.add(charId);
        card.classList.add('selected');
    }
    updateCounters();
    saveAppState();
}

function clearPlayer(player) {
    if (player === 1) {
        selectedCharacters1.clear();
        characterResonances1 = {};
    } else {
        selectedCharacters2.clear();
        characterResonances2 = {};
    }
    renderCharacters();
    saveAppState();
}

function normalizeName(str) {
    return str.toLowerCase().replace(/[\s\-_()']/g, '').replace(/\(|\)/g, '');
}

const NAME_ALIASES = {
    'theshorekeeper': 'shorekeeper',
    'luuk':           'luukherssen',
};

function findCharacterByName(inputName) {
    let normalized = normalizeName(inputName);
    normalized = NAME_ALIASES[normalized] ?? normalized;
    return resonators.find(char =>
        normalizeName(char.name) === normalized ||
        normalizeName(char.id) === normalized
    );
}

function importDeck(player) {
    const textarea = document.getElementById(`deckImport${player}`);
    const raw = textarea ? textarea.value.trim() : '';
    if (!raw) return;

    const selectedChars = player === 1 ? selectedCharacters1 : selectedCharacters2;
    selectedChars.clear();
    if (player === 1) { characterResonances1 = {}; } else { characterResonances2 = {}; }
    const resonances = player === 1 ? characterResonances1 : characterResonances2;

    const notFound = [];
    raw.split(',').forEach(entry => {
        const trimmed = entry.trim();
        const match = trimmed.match(/^(.+?)S([0-6])$/i);
        if (!match) return;
        const name = match[1].trim();
        const constellation = parseInt(match[2], 10);
        const char = findCharacterByName(name);
        if (char) {
            selectedChars.add(char.id);
            resonances[char.id] = constellation;
        } else {
            notFound.push(name);
        }
    });

    renderCharacters();
    saveAppState();
    if (notFound.length > 0) {
        alert(`Characters not found (P${player}):\n${notFound.join(', ')}`);
    }
}

function exportDeck(player) {
    const selectedChars = player === 1 ? selectedCharacters1 : selectedCharacters2;
    const resonances = player === 1 ? characterResonances1 : characterResonances2;

    const entries = [];
    selectedChars.forEach(id => {
        const char = resonatorsById.get(id);
        if (char) {
            const constellation = resonances[id] ?? 0;
            entries.push(`${char.name}S${constellation}`);
        }
    });

    const textarea = document.getElementById(`deckImport${player}`);
    if (textarea) {
        textarea.value = entries.join(',');
        textarea.select();
    }
}

async function saveDeck(player) {
    const input = document.getElementById(`deckName${player}`);
    const deckName = input ? input.value.trim() : '';
    if (!deckName) {
        alert(`Enter a deck name for Player ${player}.`);
        return;
    }

    const selectedChars = player === 1 ? selectedCharacters1 : selectedCharacters2;
    const resonances = player === 1 ? characterResonances1 : characterResonances2;

    const data = resonators
        .filter(char => selectedChars.has(char.id))
        .map(char => ({ ...char, selected_resonance: resonances[char.id] || 0, player }));

    if (data.length === 0) {
        alert(`Player ${player} has no selected characters.`);
        return;
    }

    try {
        if (isElectron && window.electron.saveDeck) {
            const result = await window.electron.saveDeck(deckName, data);
            alert(result.message);
        } else {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${deckName}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert(`Deck "${deckName}" exported!`);
        }
    } catch (error) {
        alert(`Error saving deck: ${error.message}`);
    }
}

function minimizeWindow() {
    if (isElectron && window.electron.minimizeWindow) window.electron.minimizeWindow();
}

function maximizeWindow() {
    if (isElectron && window.electron.maximizeWindow) window.electron.maximizeWindow();
}

function closeWindow() {
    if (isElectron && window.electron.closeWindow) {
        window.electron.closeWindow();
    } else {
        alert('Use the browser X button to close.');
    }
}

window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

async function loadBosses() {
    try {
        const response = await fetch('bosses.json');
        bosses = await response.json();
    } catch (e) {
        console.error('Error loading bosses:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadResonators();
    loadBosses();
    loadMainBg();
});

// ── Tower Config ──────────────────────────────────────────────────────────────
const ELEMENTS = ['Aero', 'Electro', 'Fusion', 'Glacio', 'Havoc', 'Spectro'];
const ELEM_ABBREV = { Aero: 'A', Electro: 'E', Fusion: 'F', Glacio: 'G', Havoc: 'H', Spectro: 'S' };
const ELEM_EXPAND = { A: 'Aero', E: 'Electro', F: 'Fusion', G: 'Glacio', H: 'Havoc', S: 'Spectro' };
const ea = v => v ? (ELEM_ABBREV[v] || v) : v;
const de = v => v ? (ELEM_EXPAND[v] || v) : v;

let towerConfig = {
    left:  { recommended: [null, null], type: [null, null], boss: null,  description: '' },
    mid1:  { recommended: [null, null], boss: null,                      description: '' },
    mid2:  { recommended: [null, null], type: [null, null], extra: null, boss: null, description: '' },
    mid3:  { recommended: [null, null], type: [null, null], extra: [null, null], boss: null, description: '' },
    mid4:  { recommended: [null, null], boss1: null, boss2: null,        description: '' },
    right: { recommended: [null, null], boss: null,                      description: '' },
};

function cycleElement(current) {
    if (current === null) return ELEMENTS[0];
    const idx = ELEMENTS.indexOf(current);
    return idx >= ELEMENTS.length - 1 ? null : ELEMENTS[idx + 1];
}

function openTower() {
    renderTowerScreen();
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('towerScreen').style.display = 'flex';
}

function closeTower() {
    document.getElementById('towerScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

function buildElemSlot(value, onChange, large) {
    const slot = document.createElement('div');
    slot.className = large ? 'tower-slot-large' : 'tower-slot-small';
    slot.title = value ? value : 'Clique para selecionar elemento';
    slot.onclick = () => onChange(cycleElement(value));

    if (value) {
        const img = document.createElement('img');
        img.className = 'tower-elem-icon';
        img.alt = value;
        img.src = `Icons/Attribute/${value}.png`;
        img.onerror = () => { img.src = `Icons/Attribute/${value.toLowerCase()}.png`; };
        slot.appendChild(img);
        if (large) {
            const name = document.createElement('div');
            name.className = 'tower-elem-name';
            name.textContent = value;
            slot.appendChild(name);
        }
    } else {
        const plus = document.createElement('span');
        plus.className = 'tower-slot-plus';
        plus.textContent = '+';
        slot.appendChild(plus);
    }
    return slot;
}

function createSectionLabel(text) {
    const lbl = document.createElement('div');
    lbl.className = 'tower-section-label';
    lbl.textContent = text;
    return lbl;
}

function buildBossSlot(currentValue, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'boss-slot';

    function refresh() {
        wrapper.innerHTML = '';
        const boss = bosses.find(b => b.id === currentValue);

        const trigger = document.createElement('div');
        trigger.className = 'boss-slot-trigger' + (boss ? ' has-value' : '');

        if (boss) {
            const img = document.createElement('img');
            img.src = `Icons/IconsBoss/${boss.image}.png`;
            img.className = 'boss-slot-img';
            img.onerror = () => { img.style.display = 'none'; };
            trigger.appendChild(img);
            const lbl = document.createElement('span');
            lbl.className = 'boss-slot-name';
            lbl.textContent = boss.name;
            trigger.appendChild(lbl);
        } else {
            const ph = document.createElement('span');
            ph.className = 'boss-slot-placeholder';
            ph.textContent = '+ Boss';
            trigger.appendChild(ph);
        }

        const arrow = document.createElement('span');
        arrow.className = 'boss-slot-arrow';
        arrow.textContent = '▾';
        trigger.appendChild(arrow);

        wrapper.appendChild(trigger);

        trigger.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.boss-dropdown').forEach(d => d.remove());

            const dropdown = document.createElement('div');
            dropdown.className = 'boss-dropdown';

            const search = document.createElement('input');
            search.className = 'boss-search';
            search.placeholder = 'Search...';
            search.type = 'text';
            dropdown.appendChild(search);

            const list = document.createElement('div');
            list.className = 'boss-list';

            function renderList(filter) {
                list.innerHTML = '';
                const none = document.createElement('div');
                none.className = 'boss-item' + (!currentValue ? ' selected' : '');
                none.textContent = '— None —';
                none.onclick = () => { onChange(null); currentValue = null; dropdown.remove(); refresh(); };
                list.appendChild(none);

                bosses
                    .filter(b => !filter || b.name.toLowerCase().includes(filter.toLowerCase()))
                    .forEach(b => {
                        const item = document.createElement('div');
                        item.className = 'boss-item' + (b.id === currentValue ? ' selected' : '');

                        const img = document.createElement('img');
                        img.src = `Icons/IconsBoss/${b.image}.png`;
                        img.className = 'boss-item-img';
                        img.onerror = () => { img.style.display = 'none'; };
                        item.appendChild(img);

                        const name = document.createElement('span');
                        name.textContent = b.name;
                        item.appendChild(name);

                        item.onclick = () => { onChange(b.id); currentValue = b.id; dropdown.remove(); refresh(); };
                        list.appendChild(item);
                    });
            }

            renderList('');
            search.oninput = () => renderList(search.value);
            dropdown.appendChild(list);

            const rect = trigger.getBoundingClientRect();
            dropdown.style.top  = (rect.bottom + 4) + 'px';
            dropdown.style.left = rect.left + 'px';
            dropdown.style.width = Math.max(rect.width, 190) + 'px';
            document.body.appendChild(dropdown);
            search.focus();

            setTimeout(() => {
                document.addEventListener('click', function close(ev) {
                    if (!dropdown.contains(ev.target)) {
                        dropdown.remove();
                        document.removeEventListener('click', close);
                    }
                });
            }, 0);
        };
    }

    refresh();
    return wrapper;
}

function elemsRow(arr, onChange) {
    const row = document.createElement('div');
    row.className = 'tower-elems-row';
    arr.forEach((val, idx) => {
        row.appendChild(buildElemSlot(val, nv => { onChange(nv, idx); }, false));
    });
    return row;
}

function buildTowerBlock(title, config, blockType) {
    const isWide = blockType === 'left' || blockType === 'right';
    const block = document.createElement('div');
    block.className = isWide ? 'tower-block tower-block-wide' : 'tower-block';

    const titleEl = document.createElement('div');
    titleEl.className = 'tower-block-title';
    titleEl.textContent = title;
    block.appendChild(titleEl);

    if (blockType === 'left') {
        // Left 4: Recomendado: 2 small → Type: 2 small → 1 large boss
        block.appendChild(createSectionLabel('Recommended:'));
        block.appendChild(elemsRow(config.recommended, (nv, i) => { config.recommended[i] = nv; renderTowerScreen(); }));
        block.appendChild(createSectionLabel('Type:'));
        block.appendChild(elemsRow(config.type, (nv, i) => { config.type[i] = nv; renderTowerScreen(); }));
        block.appendChild(buildBossSlot(config.boss, nv => { config.boss = nv; renderTowerScreen(); }));

    } else {
        // All other blocks: Recomendado: 2 small at top, then Type: label, then block-specific content below

        block.appendChild(createSectionLabel('Recommended:'));
        block.appendChild(elemsRow(config.recommended, (nv, i) => { config.recommended[i] = nv; renderTowerScreen(); }));
        block.appendChild(createSectionLabel('Type:'));

        if (blockType === 'mid1') {
            // Type section: 1 large boss
            block.appendChild(buildBossSlot(config.boss, nv => { config.boss = nv; renderTowerScreen(); }));

        } else if (blockType === 'mid2') {
            // Type section: 2 small + 1 small + 1 large boss
            block.appendChild(elemsRow(config.type, (nv, i) => { config.type[i] = nv; renderTowerScreen(); }));
            block.appendChild(buildElemSlot(config.extra, nv => { config.extra = nv; renderTowerScreen(); }, false));
            block.appendChild(buildBossSlot(config.boss, nv => { config.boss = nv; renderTowerScreen(); }));

        } else if (blockType === 'mid3') {
            // Type section: 2 small + 1 small + 1 small + 1 large boss
            block.appendChild(elemsRow(config.type, (nv, i) => { config.type[i] = nv; renderTowerScreen(); }));
            block.appendChild(buildElemSlot(config.extra[0], nv => { config.extra[0] = nv; renderTowerScreen(); }, false));
            block.appendChild(buildElemSlot(config.extra[1], nv => { config.extra[1] = nv; renderTowerScreen(); }, false));
            block.appendChild(buildBossSlot(config.boss, nv => { config.boss = nv; renderTowerScreen(); }));

        } else if (blockType === 'mid4') {
            // Type section: 2 large boss slots stacked
            block.appendChild(buildBossSlot(config.boss1, nv => { config.boss1 = nv; renderTowerScreen(); }));
            block.appendChild(buildBossSlot(config.boss2, nv => { config.boss2 = nv; renderTowerScreen(); }));

        } else if (blockType === 'right') {
            // Type section: 1 large boss
            block.appendChild(buildBossSlot(config.boss, nv => { config.boss = nv; renderTowerScreen(); }));
        }
    }

    // mid2 and mid4 inherit description from mid1/mid3 — no textarea needed
    if (blockType !== 'mid2' && blockType !== 'mid4') {
        const descLabel = document.createElement('div');
        descLabel.className = 'tower-section-label tower-desc-label';
        descLabel.textContent = 'Description';
        block.appendChild(descLabel);

        const textarea = document.createElement('textarea');
        textarea.className = 'tower-desc-textarea';
        textarea.maxLength = 1000;
        textarea.placeholder = 'Notes...';
        textarea.value = config.description || '';
        textarea.oninput = () => {
            config.description = textarea.value;
            if (blockType === 'mid1') towerConfig.mid2.description = textarea.value;
            if (blockType === 'mid3') towerConfig.mid4.description = textarea.value;
            saveAppState();
        };
        block.appendChild(textarea);
    }

    return block;
}

function exportTower() {
    const parts = [];
    const rToks = cfg => (cfg.recommended || []).filter(Boolean).map(v => 'R' + ea(v));

    const blocks = [
        () => {
            const c = towerConfig.left;
            const t = ['L4', ...rToks(c)];
            if (c.type[0]) t.push('T11' + ea(c.type[0]));
            if (c.type[1]) t.push('T12' + ea(c.type[1]));
            if (c.boss) t.push('B' + c.boss);
            if (c.description) t.push('D:' + c.description);
            return t;
        },
        () => {
            const c = towerConfig.mid1;
            const t = ['M1', ...rToks(c)];
            if (c.boss) t.push('B' + c.boss);
            if (c.description) t.push('D:' + c.description); // mid2 inherits
            return t;
        },
        () => {
            const c = towerConfig.mid2;
            const t = ['M2', ...rToks(c)];
            if (c.type[0]) t.push('T11' + ea(c.type[0]));
            if (c.type[1]) t.push('T12' + ea(c.type[1]));
            if (c.extra) t.push('T21' + ea(c.extra));
            if (c.boss) t.push('B' + c.boss);
            // description omitted — inherited from M1
            return t;
        },
        () => {
            const c = towerConfig.mid3;
            const t = ['M3', ...rToks(c)];
            if (c.type[0]) t.push('T11' + ea(c.type[0]));
            if (c.type[1]) t.push('T12' + ea(c.type[1]));
            if (c.extra[0]) t.push('T21' + ea(c.extra[0]));
            if (c.extra[1]) t.push('T22' + ea(c.extra[1]));
            if (c.boss) t.push('B' + c.boss);
            if (c.description) t.push('D:' + c.description); // mid4 inherits
            return t;
        },
        () => {
            const c = towerConfig.mid4;
            const t = ['M4', ...rToks(c)];
            if (c.boss1) t.push('B1' + c.boss1);
            if (c.boss2) t.push('B2' + c.boss2);
            // description omitted — inherited from M3
            return t;
        },
        () => {
            const c = towerConfig.right;
            const t = ['R4', ...rToks(c)];
            if (c.boss) t.push('B' + c.boss);
            if (c.description) t.push('D:' + c.description);
            return t;
        },
    ];

    blocks.forEach(fn => {
        const toks = fn();
        if (toks.length > 1) parts.push(toks.join(','));
    });

    return parts.join(';');
}

function importTower(text) {
    if (!text.trim()) return;

    text.split(';').forEach(blockStr => {
        blockStr = blockStr.trim();
        if (!blockStr) return;

        let desc = '';
        const dMatch = blockStr.match(/,D:([\s\S]*)$/);
        if (dMatch) {
            desc = dMatch[1];
            blockStr = blockStr.slice(0, blockStr.length - dMatch[0].length);
        }

        const tokens = blockStr.split(',');
        const blockId = tokens[0].trim().toUpperCase();
        const data = tokens.slice(1);

        const cfgMap = {
            L4: towerConfig.left, M1: towerConfig.mid1, M2: towerConfig.mid2,
            M3: towerConfig.mid3, M4: towerConfig.mid4, R4: towerConfig.right,
        };
        const config = cfgMap[blockId];
        if (!config) return;

        if (config.recommended) config.recommended = [null, null];
        if ('type'  in config) config.type  = [null, null];
        if ('extra' in config) config.extra = Array.isArray(config.extra) ? [null, null] : null;
        if ('boss'  in config) config.boss  = null;
        if ('boss1' in config) config.boss1 = null;
        if ('boss2' in config) config.boss2 = null;
        config.description = desc;

        let rIdx = 0;
        data.forEach(token => {
            token = token.trim();
            if (!token) return;
            if (token.startsWith('T11'))      { if (config.type) config.type[0] = de(token.slice(3)); }
            else if (token.startsWith('T12')) { if (config.type) config.type[1] = de(token.slice(3)); }
            else if (token.startsWith('T21')) {
                const val = de(token.slice(3));
                if (blockId === 'M2') config.extra = val;
                else if (blockId === 'M3' && Array.isArray(config.extra)) config.extra[0] = val;
            }
            else if (token.startsWith('T22')) {
                if (blockId === 'M3' && Array.isArray(config.extra)) config.extra[1] = de(token.slice(3));
            }
            else if (token.startsWith('B1')) { if ('boss1' in config) config.boss1 = token.slice(2); }
            else if (token.startsWith('B2')) { if ('boss2' in config) config.boss2 = token.slice(2); }
            else if (token.startsWith('B'))  { if ('boss'  in config) config.boss  = token.slice(1); }
            else if (token.startsWith('R') && config.recommended && rIdx < 2) {
                config.recommended[rIdx++] = de(token.slice(1));
            }
        });
    });

    // Sync shared descriptions: M1→M2, M3→M4
    towerConfig.mid2.description = towerConfig.mid1.description;
    towerConfig.mid4.description = towerConfig.mid3.description;

    renderTowerScreen();
}


function renderTowerScreen() {
    const screen = document.getElementById('towerScreen');
    screen.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'tower-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'tower-header-left';
    headerLeft.innerHTML = `<button class="draft-back-btn" onclick="closeTower()">← Back</button><span class="tower-title">Tower 🗼 Settings</span>`;


    const windowControls = document.createElement('div');
    windowControls.className = 'window-controls';
    windowControls.innerHTML = `
        <button class="control-btn minimize" onclick="minimizeWindow()">─</button>
        <button class="control-btn maximize" onclick="maximizeWindow()">▢</button>
        <button class="control-btn close" onclick="closeWindow()">✕</button>
    `;

    header.appendChild(headerLeft);
    header.appendChild(windowControls);
    screen.appendChild(header);

    const body = document.createElement('div');
    body.className = 'tower-body';

    [
        ['Left 4',  towerConfig.left,  'left'],
        ['Mid 1',   towerConfig.mid1,  'mid1'],
        ['Mid 2',   towerConfig.mid2,  'mid2'],
        ['Mid 3',   towerConfig.mid3,  'mid3'],
        ['Mid 4',   towerConfig.mid4,  'mid4'],
        ['Right 4', towerConfig.right, 'right'],
    ].forEach(([title, cfg, type]) => body.appendChild(buildTowerBlock(title, cfg, type)));

    // ── Background image block ──
    const bgBlock = document.createElement('div');
    bgBlock.className = 'tower-block tower-bg-block';

    const bgBlockTitle = document.createElement('div');
    bgBlockTitle.className = 'tower-block-title';
    bgBlockTitle.textContent = 'Background';
    bgBlock.appendChild(bgBlockTitle);

    const hasBg = !!localStorage.getItem(BG_KEY);

    const bgInput = document.createElement('input');
    bgInput.type = 'file';
    bgInput.accept = 'image/*';
    bgInput.style.display = 'none';
    bgInput.addEventListener('change', () => {
        const file = bgInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            localStorage.setItem(BG_KEY, dataUrl);
            applyMainBg(dataUrl);
            previewImg.src = dataUrl;
            previewImg.style.display = '';
            clearBgBtn.style.display = '';
        };
        reader.readAsDataURL(file);
    });
    bgBlock.appendChild(bgInput);

    const previewImg = document.createElement('img');
    previewImg.className = 'tower-bg-preview';
    const storedBg = localStorage.getItem(BG_KEY);
    if (storedBg) {
        previewImg.src = storedBg;
        previewImg.style.display = '';
    } else {
        previewImg.style.display = 'none';
    }
    bgBlock.appendChild(previewImg);

    // ── Overlay/dimming slider ──
    const sliderRow = document.createElement('div');
    sliderRow.className = 'tower-bg-slider-row';

    const sliderLabel = document.createElement('span');
    sliderLabel.className = 'tower-bg-slider-label';
    sliderLabel.textContent = 'Darken';
    sliderRow.appendChild(sliderLabel);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'tower-bg-slider';
    slider.min = '0';
    slider.max = '0.9';
    slider.step = '0.05';
    slider.value = localStorage.getItem(BG_OVERLAY_KEY) ?? '0.45';
    slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        localStorage.setItem(BG_OVERLAY_KEY, val);
        const current = localStorage.getItem(BG_KEY);
        if (current) applyMainBg(current);
        pct.textContent = Math.round((1 - val) * 100) + '%';
    });
    sliderRow.appendChild(slider);

    const pct = document.createElement('span');
    pct.className = 'tower-bg-slider-pct';
    pct.textContent = Math.round((1 - parseFloat(slider.value)) * 100) + '%';
    sliderRow.appendChild(pct);

    bgBlock.appendChild(sliderRow);

    const setBgBtn = document.createElement('button');
    setBgBtn.className = 'tower-bg-btn';
    setBgBtn.textContent = 'Choose Image';
    setBgBtn.onclick = () => bgInput.click();
    bgBlock.appendChild(setBgBtn);

    const clearBgBtn = document.createElement('button');
    clearBgBtn.className = 'tower-bg-btn tower-bg-btn-clear';
    clearBgBtn.textContent = 'Remove BG';
    clearBgBtn.style.display = hasBg ? '' : 'none';
    clearBgBtn.onclick = () => {
        localStorage.removeItem(BG_KEY);
        applyMainBg(null);
        previewImg.style.display = 'none';
        clearBgBtn.style.display = 'none';
    };
    bgBlock.appendChild(clearBgBtn);

    const bgHint = document.createElement('div');
    bgHint.className = 'tower-bg-hint';
    bgHint.textContent = 'Recommended: Darken by 15% or 10%';
    bgBlock.appendChild(bgHint);

    body.appendChild(bgBlock);
    screen.appendChild(body);

    // ── Export / Import bar ──
    const ioBar = document.createElement('div');
    ioBar.className = 'tower-io-bar';

    const ioLabel = document.createElement('span');
    ioLabel.className = 'tower-io-label';
    ioLabel.textContent = 'Export / Import';
    ioBar.appendChild(ioLabel);

    const ioTextarea = document.createElement('textarea');
    ioTextarea.className = 'tower-io-textarea';
    ioTextarea.maxLength = 8000;
    ioTextarea.placeholder = 'Paste a code to import, or click Export to generate...';
    ioBar.appendChild(ioTextarea);

    const ioBtns = document.createElement('div');
    ioBtns.className = 'tower-io-btns';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'tower-io-btn';
    exportBtn.textContent = 'Export';
    exportBtn.onclick = () => { ioTextarea.value = exportTower(); ioTextarea.select(); };

    const importBtn = document.createElement('button');
    importBtn.className = 'tower-io-btn tower-io-btn-primary';
    importBtn.textContent = 'Import';
    importBtn.onclick = () => importTower(ioTextarea.value);

    ioBtns.appendChild(exportBtn);
    ioBtns.appendChild(importBtn);
    ioBar.appendChild(ioBtns);

    screen.appendChild(ioBar);
    saveAppState();
}

// ── MyTimes ───────────────────────────────────────────────────────────────────
const MYTIMES_KEY = 'wuwa_mytimes';
let myTimesSlots = null;
let myTimesHistory = null; // { left:[], mid1:[], ... }

function initMyTimesSlots() {
    return Object.fromEntries(
        TOWER_KEYS.map(k => [k, {
            chars: Array.from({length:3}, () => ({charId:null, weapon:'yellow'})),
            time: ''
        }])
    );
}

function initMyTimesHistory() {
    return Object.fromEntries(TOWER_KEYS.map(k => [k, []]));
}

function loadMyTimes() {
    try {
        const raw = localStorage.getItem(MYTIMES_KEY);
        if (!raw) { myTimesSlots = initMyTimesSlots(); myTimesHistory = initMyTimesHistory(); return; }
        const d = JSON.parse(raw);

        // slots
        const freshSlots = initMyTimesSlots();
        const slots = d.slots || {};
        TOWER_KEYS.forEach(k => {
            const s = slots[k];
            if (s && s.chars && Array.isArray(s.chars)) freshSlots[k] = s;
        });
        myTimesSlots = freshSlots;

        // history — migrate old global-array format → per-room
        const freshHist = initMyTimesHistory();
        if (Array.isArray(d.history)) {
            d.history.forEach(entry => {
                TOWER_KEYS.forEach(k => {
                    const rd = entry.data?.[k];
                    if (rd && (rd.chars?.some(c => c.charId) || rd.time)) {
                        freshHist[k].push({ id: entry.id, chars: rd.chars || [], time: rd.time || '' });
                    }
                });
            });
        } else if (d.history && typeof d.history === 'object') {
            TOWER_KEYS.forEach(k => { if (Array.isArray(d.history[k])) freshHist[k] = d.history[k]; });
        }
        myTimesHistory = freshHist;
    } catch(e) { myTimesSlots = initMyTimesSlots(); myTimesHistory = initMyTimesHistory(); }
}

function saveMyTimesPersist() {
    try { localStorage.setItem(MYTIMES_KEY, JSON.stringify({slots:myTimesSlots, history:myTimesHistory})); }
    catch(e) {}
}

function openMyTimes() {
    if (!myTimesSlots) loadMyTimes();
    renderMyTimesScreen();
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('myTimesScreen').style.display = 'flex';
}

function closeMyTimes() {
    document.getElementById('myTimesScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'flex';
}

function buildMtCharSearchSlot(key, slotIdx) {
    const slotData = myTimesSlots[key].chars[slotIdx];
    const wrap = document.createElement('div');
    wrap.className = 'mt-char-slot';

    function refresh() {
        wrap.innerHTML = '';
        if (slotData.charId) {
            const char = resonatorsById.get(slotData.charId);
            if (char) {
                wrap.appendChild(buildCharImg(char, 'mt-char-icon'));
                const nm = document.createElement('span');
                nm.className = 'mt-char-name';
                nm.textContent = char.name.length > 11 ? char.name.slice(0,11)+'…' : char.name;
                wrap.appendChild(nm);
            }
            const clr = document.createElement('button');
            clr.className = 'mt-char-clear';
            clr.textContent = '✕';
            clr.onclick = () => { slotData.charId = null; saveMyTimesPersist(); refresh(); };
            wrap.appendChild(clr);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'mt-char-input';
            input.placeholder = 'Search…';

            const drop = document.createElement('div');
            drop.className = 'mt-char-dropdown';

            input.addEventListener('input', () => {
                const q = input.value.trim().toLowerCase();
                drop.innerHTML = '';
                if (!q) { drop.style.display = 'none'; return; }
                const hits = resonators.filter(r => r.name.toLowerCase().includes(q)).slice(0,8);
                if (!hits.length) { drop.style.display = 'none'; return; }
                hits.forEach(char => {
                    const item = document.createElement('div');
                    item.className = 'mt-char-item';
                    item.appendChild(buildCharImg(char, 'mt-item-icon'));
                    const sp = document.createElement('span');
                    sp.textContent = char.name;
                    item.appendChild(sp);
                    item.addEventListener('mousedown', e => {
                        e.preventDefault();
                        slotData.charId = char.id;
                        if (char.rarity === 4) slotData.weapon = 'purple';
                        saveMyTimesPersist();
                        refresh();
                    });
                    drop.appendChild(item);
                });
                drop.style.display = '';
            });
            input.addEventListener('blur', () => setTimeout(() => { drop.style.display = 'none'; }, 150));
            input.addEventListener('focus', () => { if (input.value) input.dispatchEvent(new Event('input')); });

            wrap.appendChild(input);
            wrap.appendChild(drop);
        }
    }
    refresh();
    return wrap;
}

function buildMtWeaponBtn(key, slotIdx) {
    const slotData = myTimesSlots[key].chars[slotIdx];
    const btn = document.createElement('button');
    btn.className = `weapon-btn weapon-btn-${slotData.weapon}`;
    btn.textContent = 'weapon';
    btn.onclick = () => {
        const cycle = ['yellow','purple','blue'];
        slotData.weapon = cycle[(cycle.indexOf(slotData.weapon)+1)%3];
        btn.className = `weapon-btn weapon-btn-${slotData.weapon}`;
        saveMyTimesPersist();
    };
    return btn;
}

function buildMyTimesBlock(key) {
    const block = document.createElement('div');
    block.className = 'mt-block';

    const lbl = document.createElement('div');
    lbl.className = 'mt-block-title';
    lbl.textContent = TOWER_BLOCK_TITLES[key];
    block.appendChild(lbl);

    // Row: [Unit1(Char+Weapon)][Unit2(Char+Weapon)][Unit3(Char+Weapon)][Time]
    const charsRow = document.createElement('div');
    charsRow.className = 'mt-chars-row';
    for (let i = 0; i < 3; i++) {
        const unit = document.createElement('div');
        unit.className = 'mt-slot-unit';
        unit.appendChild(buildMtCharSearchSlot(key, i));
        unit.appendChild(buildMtWeaponBtn(key, i));
        charsRow.appendChild(unit);
    }

    const timeInp = document.createElement('input');
    timeInp.type = 'text';
    timeInp.className = 'mt-time-input';
    timeInp.placeholder = '0:00';
    timeInp.value = myTimesSlots[key].time || '';
    timeInp.addEventListener('input', () => { myTimesSlots[key].time = timeInp.value; saveMyTimesPersist(); });
    timeInp.addEventListener('blur', () => {
        const parsed = parseTime(timeInp.value);
        if (parsed !== null) {
            timeInp.value = formatTime(parsed);
            myTimesSlots[key].time = timeInp.value;
            saveMyTimesPersist();
        }
    });
    charsRow.appendChild(timeInp);
    block.appendChild(charsRow);

    // Save button for this room
    const saveRoomBtn = document.createElement('button');
    saveRoomBtn.className = 'mt-save-room-btn';
    saveRoomBtn.textContent = '+ Save';
    saveRoomBtn.onclick = () => {
        const roomData = myTimesSlots[key];
        const entryChars = JSON.parse(JSON.stringify(roomData.chars));
        const parsed = parseTime(roomData.time);
        const entryTime = parsed !== null ? formatTime(parsed) : roomData.time;
        if (parsed !== null) { roomData.time = entryTime; timeInp.value = entryTime; }
        if (!myTimesHistory[key]) myTimesHistory[key] = [];
        myTimesHistory[key].unshift({ id: Date.now(), chars: entryChars, time: entryTime });
        myTimesSlots[key].chars = Array.from({length:3}, () => ({charId:null, weapon:'yellow'}));
        myTimesSlots[key].time = '';
        saveMyTimesPersist();
        renderMyTimesScreen();
    };
    block.appendChild(saveRoomBtn);

    return block;
}

function buildRoomEntryCard(entry, key) {
    const card = document.createElement('div');
    card.className = 'mt-room-entry';

    const body = document.createElement('div');
    body.className = 'mt-room-entry-body';

    const charsRow = document.createElement('div');
    charsRow.className = 'mt-hist-slots';
    (entry.chars || []).forEach(c => {
        if (!c.charId) return;
        const char = resonatorsById.get(c.charId);
        if (!char) return;
        const sd = document.createElement('div');
        sd.className = 'mt-hist-slot';
        sd.appendChild(buildCharImg(char, 'mt-hist-icon'));
        const dot = document.createElement('span');
        dot.className = `mt-weapon-dot mt-weapon-dot-${c.weapon}`;
        sd.appendChild(dot);
        charsRow.appendChild(sd);
    });
    body.appendChild(charsRow);

    if (entry.time) {
        const tEl = document.createElement('div');
        tEl.className = 'mt-room-entry-time';
        tEl.textContent = entry.time;
        body.appendChild(tEl);
    }
    card.appendChild(body);

    const delBtn = document.createElement('button');
    delBtn.className = 'mt-hist-del';
    delBtn.textContent = '✕';
    delBtn.onclick = () => {
        myTimesHistory[key] = myTimesHistory[key].filter(e => e.id !== entry.id);
        saveMyTimesPersist();
        card.remove();
    };
    card.appendChild(delBtn);

    return card;
}

function renderMyTimesScreen() {
    const screen = document.getElementById('myTimesScreen');
    screen.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'tower-header';
    const headerLeft = document.createElement('div');
    headerLeft.className = 'tower-header-left';
    headerLeft.innerHTML = `<button class="draft-back-btn" onclick="closeMyTimes()">← Back</button><span class="tower-title">My Times 🕐</span>`;
    const wc = document.createElement('div');
    wc.className = 'window-controls';
    wc.innerHTML = `
        <button class="control-btn minimize" onclick="minimizeWindow()">─</button>
        <button class="control-btn maximize" onclick="maximizeWindow()">▢</button>
        <button class="control-btn close" onclick="closeWindow()">✕</button>
    `;
    header.appendChild(headerLeft);
    header.appendChild(wc);
    screen.appendChild(header);

    const content = document.createElement('div');
    content.className = 'mytimes-content';

    const grid = document.createElement('div');
    grid.className = 'mytimes-tower-grid';
    [
        {key:'left',  row:1, col:1},
        {key:'mid1',  row:1, col:2},
        {key:'right', row:1, col:3},
        {key:'mid2',  row:2, col:2},
        {key:'mid3',  row:3, col:2},
        {key:'mid4',  row:4, col:2},
    ].forEach(({key, row, col}) => {
        const block = buildMyTimesBlock(key);
        block.style.gridRow = row;
        block.style.gridColumn = col;
        grid.appendChild(block);
    });
    content.appendChild(grid);

    const actRow = document.createElement('div');
    actRow.className = 'mytimes-act-row';
    const clearBtn = document.createElement('button');
    clearBtn.className = 'mytimes-clear-btn';
    clearBtn.textContent = 'Clear All Slots';
    clearBtn.onclick = () => { myTimesSlots = initMyTimesSlots(); saveMyTimesPersist(); renderMyTimesScreen(); };
    actRow.appendChild(clearBtn);
    content.appendChild(actRow);

    const hasHistory = TOWER_KEYS.some(k => myTimesHistory[k]?.length > 0);
    if (hasHistory) {
        const histTitle = document.createElement('div');
        histTitle.className = 'mytimes-hist-title';
        histTitle.textContent = 'History';
        content.appendChild(histTitle);

        const histGrid = document.createElement('div');
        histGrid.className = 'mt-hist-columns';

        TOWER_KEYS.forEach(key => {
            const col = document.createElement('div');
            col.className = 'mt-hist-col';

            const colHdr = document.createElement('div');
            colHdr.className = 'mt-hist-col-header';
            colHdr.textContent = TOWER_BLOCK_LABELS[key];
            col.appendChild(colHdr);

            const entries = myTimesHistory[key] || [];
            if (!entries.length) {
                const empty = document.createElement('div');
                empty.className = 'mt-hist-col-empty';
                empty.textContent = '—';
                col.appendChild(empty);
            } else {
                entries.forEach(entry => col.appendChild(buildRoomEntryCard(entry, key)));
            }

            histGrid.appendChild(col);
        });

        content.appendChild(histGrid);
    }

    screen.appendChild(content);
}

function openViewTimes(selectedKey) {
    if (!myTimesSlots) loadMyTimes();
    document.querySelectorAll('.vt-overlay').forEach(e => e.remove());

    const overlay = document.createElement('div');
    overlay.className = 'vt-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    const modal = document.createElement('div');
    modal.className = 'vt-modal';

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'vt-header';
    if (selectedKey) {
        const back = document.createElement('button');
        back.className = 'vt-back-btn';
        back.textContent = '← Back';
        back.onclick = () => openViewTimes(null);
        hdr.appendChild(back);
        const title = document.createElement('span');
        title.className = 'vt-title';
        title.textContent = TOWER_BLOCK_TITLES[selectedKey];
        hdr.appendChild(title);
    } else {
        const title = document.createElement('span');
        title.className = 'vt-title';
        title.textContent = 'My Times';
        hdr.appendChild(title);
    }
    const closeBtn = document.createElement('button');
    closeBtn.className = 'vt-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => overlay.remove();
    hdr.appendChild(closeBtn);
    modal.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'vt-body';

    if (!selectedKey) {
        // Tower grid with 6 clickable room buttons
        const grid = document.createElement('div');
        grid.className = 'vt-tower-grid';
        [
            {key:'left',  row:1, col:1},
            {key:'mid1',  row:1, col:2},
            {key:'right', row:1, col:3},
            {key:'mid2',  row:2, col:2},
            {key:'mid3',  row:3, col:2},
            {key:'mid4',  row:4, col:2},
        ].forEach(({key, row, col}) => {
            const btn = document.createElement('button');
            btn.className = 'vt-room-btn';
            btn.style.gridRow = row;
            btn.style.gridColumn = col;
            const count = (myTimesHistory[key] || []).length;
            btn.innerHTML = `<span class="vt-room-label">${TOWER_BLOCK_LABELS[key]}</span>`;
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'vt-room-badge';
                badge.textContent = count;
                btn.appendChild(badge);
            }
            btn.onclick = () => openViewTimes(key);
            grid.appendChild(btn);
        });
        body.appendChild(grid);
    } else {
        const entries = myTimesHistory[selectedKey] || [];
        if (!entries.length) {
            const empty = document.createElement('div');
            empty.className = 'vt-empty';
            empty.textContent = 'No entries for this room yet.';
            body.appendChild(empty);
        } else {
            entries.forEach(entry => {
                const card = document.createElement('div');
                card.className = 'vt-entry-card';
                const charsRow = document.createElement('div');
                charsRow.className = 'vt-entry-chars';
                (entry.chars || []).forEach(c => {
                    if (!c.charId) return;
                    const char = resonatorsById.get(c.charId);
                    if (!char) return;
                    const slot = document.createElement('div');
                    slot.className = 'mt-hist-slot';
                    slot.appendChild(buildCharImg(char, 'mt-hist-icon'));
                    const dot = document.createElement('span');
                    dot.className = `mt-weapon-dot mt-weapon-dot-${c.weapon}`;
                    slot.appendChild(dot);
                    charsRow.appendChild(slot);
                });
                card.appendChild(charsRow);
                if (entry.time) {
                    const tEl = document.createElement('div');
                    tEl.className = 'vt-entry-time';
                    tEl.textContent = entry.time;
                    card.appendChild(tEl);
                }
                body.appendChild(card);
            });
        }
    }

    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

window.clearPlayer = clearPlayer;
window.clearAllPicks = clearAllPicks;
window.tradeSelect = tradeSelect;
window.importDeck = importDeck;
window.exportDeck = exportDeck;
window.saveDeck = saveDeck;
window.startDraft = startDraft;
window.exitDraft = exitDraft;
window.openTower = openTower;
window.closeTower = closeTower;
window.openMyTimes = openMyTimes;
window.closeMyTimes = closeMyTimes;
window.openViewTimes = openViewTimes;
window.goSecondTurn = goSecondTurn;
window.pickCharacter = pickCharacter;
window.minimizeWindow = minimizeWindow;
window.maximizeWindow = maximizeWindow;
window.closeWindow = closeWindow;
