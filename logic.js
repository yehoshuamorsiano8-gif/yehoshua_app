// --- LOGIC.JS: המוח המפעיל של מערכת יהושע ---

let appData = { daily: {}, units: {}, subUnits: {}, lastPosition: {} };
let chartObj = null;

// פונקציית אתחול - רצה ברגע שהדף נטען
async function init() {
    const cloudData = await window.loadFromCloud();
    if (cloudData) {
        appData = cloudData;
    } else {
        const local = localStorage.getItem('yehoshua_data');
        if (local) appData = JSON.parse(local);
    }

    renderSections();      // בונה את 14 הסעיפים (ללא סעיף 5)
    renderTorahSelector(); // בונה את סעיף 5 (תנ"ך, משנה, גמרא)
    document.getElementById('mainDate').valueAsDate = new Date();
    updateProgressUI();
}

// 1. רינדור 15 הסעיפים (דינמי מתוך SECTIONS_CONFIG)
function renderSections() {
    const cont = document.getElementById('dynamic-sections');
    if (!cont) return;
    cont.innerHTML = '';
    
    SECTIONS_CONFIG.forEach(sec => {
        if (sec.id === 5) return; // סעיף 5 מנוהל בנפרד
        
        let h = `<div class="section-header">סעיף ${sec.id}: ${sec.title}</div>`;
        sec.fields.forEach(f => {
            let input = `<input type="checkbox" class="inp" data-name="${f}">`;
            if (f.includes('(זמן)')) input = `<input type="time" class="inp" data-name="${f}">`;
            if (f.includes('(כמות)')) input = `<input type="number" class="inp" data-name="${f}" style="width:60px">`;
            if (f.includes('(סקאלה)') || sec.isScale) input = `<input type="range" min="1" max="5" value="3" class="inp" data-name="${f}">`;
            h += `<div class="field"><label>${f}</label>${input}</div>`;
        });
        cont.innerHTML += h;
    });
}

// 2. תפריט בחירה תורני עם חלוקה לסדרים
function renderTorahSelector() {
    const tCont = document.getElementById('torahContainer');
    if (!tCont) return;
    tCont.innerHTML = '';

    Object.keys(TORAH_DB).forEach(mainCat => {
        let h = `<div class="card" style="margin-bottom:10px;">
            <div style="font-weight:bold; cursor:pointer; color:var(--primary);" onclick="toggleAcc(this)">${mainCat} ▾</div>
            <div class="acc-content" style="display:none; padding-top:10px;">`;
        
        const subContent = TORAH_DB[mainCat];
        
        Object.keys(subContent).forEach(subCat => {
            h += `<div style="margin-right:10px; border-right:2px solid var(--accent); padding-right:5px; margin-bottom:10px;">
                    <div style="cursor:pointer; font-size:0.9em; color:#666; font-weight:bold;" onclick="toggleAcc(this)">${subCat} ▸</div>
                    <div class="acc-content" style="display:none;">
                        <select onchange="loadUnits(this, '${mainCat}', '${subCat}')" style="width:100%; margin:5px 0; padding:5px;">
                            <option>בחר ספר/מסכת...</option>`;
            
            Object.keys(subContent[subCat]).forEach(book => {
                h += `<option value="${book}">${book}</option>`;
            });
            
            h += `</select>
                  <div class="units-grid"></div>
                  <div class="sub-unit-box" style="display:none; margin-top:10px;"></div>
                </div>
            </div>`;
        });
        
        h += `</div></div>`;
        tCont.innerHTML += h;
    });
}

// 3. טעינת פרקים/דפים
function loadUnits(sel, mainCat, subCat) {
    const bookName = sel.value;
    const grid = sel.nextElementSibling;
    const subBox = grid.nextElementSibling;
    grid.innerHTML = '';
    subBox.style.display = 'none';

    const bookData = TORAH_DB[mainCat][subCat][bookName];
    if (!bookData) return;

    for (let i = 1; i <= bookData.ch; i++) {
        let unitId = `${mainCat}_${bookName}_${i}`;
        let item = document.createElement('div');
        item.className = 'unit-item ' + (appData.units[unitId] ? 'checked' : '');
        item.innerText = getUnitLabel(mainCat, i);
        
        item.onclick = () => renderSubUnits(subBox, unitId, bookName, i, item, bookData, mainCat);
        item.ondblclick = () => markFullUnit(unitId, item, bookData, mainCat);
        
        grid.appendChild(item);
    }
}

// 4. רינדור פסוקים/משניות/עמודים
function renderSubUnits(subBox, unitId, bookName, num, parentEl, bookData, mainCat) {
    subBox.style.display = 'block';
    let count = 15;
    if (bookData.v) {
        const vArr = bookData.v.split(',');
        count = parseInt(vArr[num-1]) || 15;
    }
    if (mainCat === "גמרא") count = 2;

    subBox.innerHTML = `<div style="background:#f0f4f8; padding:10px; border-radius:8px; border:1px solid var(--accent);">
        <strong>${bookName} - ${getUnitLabel(mainCat, num)}:</strong>
        <div class="units-grid"></div>
    </div>`;

    const subGrid = subBox.querySelector('.units-grid');
    for (let j = 1; j <= count; j++) {
        let subId = `${unitId}_${j}`;
        let subItem = document.createElement('div');
        subItem.className = 'unit-item ' + (appData.subUnits[subId] ? 'checked' : '');
        subItem.innerText = (mainCat === "גמרא") ? (j === 1 ? 'א' : 'ב') : toGem(j);
        
        subItem.onclick = () => {
            appData.subUnits[subId] = !appData.subUnits[subId];
            subItem.classList.toggle('checked');
            checkParentStatus(unitId, count, parentEl);
            saveAll();
        };
        subGrid.appendChild(subItem);
    }
}

// --- פונקציות עזר ---

function getUnitLabel(cat, i) {
    if (cat === "גמרא") {
        const pageNum = Math.floor((i - 1) / 2) + 2; 
        const side = (i % 2 !== 0) ? '.' : ':';
        return toGem(pageNum) + side;
    }
    return toGem(i);
}

function markFullUnit(unitId, el, bookData, mainCat) {
    const isCheck = !el.classList.contains('checked');
    appData.units[unitId] = isCheck;
    el.classList.toggle('checked', isCheck);
    
    let count = 15;
    if (bookData.v) {
        const vArr = bookData.v.split(',');
        const idx = parseInt(unitId.split('_').pop()) - 1;
        count = parseInt(vArr[idx]) || 15;
    }
    if (mainCat === "גמרא") count = 2;

    for (let j = 1; j <= count; j++) appData.subUnits[`${unitId}_${j}`] = isCheck;
    saveAll();
}

function checkParentStatus(unitId, count, parentEl) {
    let all = true;
    for (let j = 1; j <= count; j++) {
        if (!appData.subUnits[`${unitId}_${j}`]) { all = false; break; }
    }
    appData.units[unitId] = all;
    parentEl.classList.toggle('checked', all);
}

function toGem(n) {
    if (n === 15) return "טו";
    if (n === 16) return "טז";
    const l = {400:'ת',300:'ש',200:'ר',100:'ק',90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י',9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א'};
    let r = ""; let num = n;
    const keys = Object.keys(l).map(Number).sort((a,b)=>b-a);
    for (let v of keys) { while (num >= v) { r += l[v]; num -= v; } }
    return r;
}

function toggleAcc(el) {
    const content = el.nextElementSibling;
    content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'block' : 'none';
}

async function saveAll() {
    localStorage.setItem('yehoshua_data', JSON.stringify(appData));
    if (window.syncToCloud) await window.syncToCloud(appData);
    updateProgressUI();
}

function updateProgressUI() {
    const container = document.getElementById('torahProgressBars');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(TORAH_DB).forEach(cat => {
        let total = 0, done = 0;
        const sub = TORAH_DB[cat];
        Object.keys(sub).forEach(s => {
            Object.keys(sub[s]).forEach(book => {
                total += sub[s][book].ch;
                for (let i=1; i<=sub[s][book].ch; i++) {
                    if (appData.units[`${cat}_${book}_${i}`]) done++;
                }
            });
        });
        const pct = total > 0 ? Math.round((done/total)*100) : 0;
        container.innerHTML += `<div>${cat}: ${pct}% <div class="progress-bar-container"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    });
}

function showTab(id) {
    document.querySelectorAll('.tab-content, .nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.onload = init;