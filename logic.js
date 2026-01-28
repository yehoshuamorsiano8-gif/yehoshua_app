// --- LOGIC.JS: המוח המלא - כולל מונה חכם וניהול מיקום ---

let appData = { daily: {}, units: {}, subUnits: {}, lastPosition: null };

// פונקציית אתחול
async function init() {
    const cloudData = await window.loadFromCloud();
    if (cloudData) {
        appData = cloudData;
    } else {
        const local = localStorage.getItem('yehoshua_data');
        if (local) appData = JSON.parse(local);
    }

    // הגדרת מיקום התחלתי אם המערכת חדשה
    if (!appData.lastPosition) {
        appData.lastPosition = {
            "תנך": { book: "תהילים", ch: 1, unit: 1, subCat: "כתובים" },
            "משנה": { book: "ברכות", ch: 1, unit: 1, subCat: "סדר זרעים" },
            "גמרא": { book: "ברכות", ch: 1, unit: 1, subCat: "סדר מועד" } 
        };
    }

    renderSections();      // 14 הסעיפים
    renderQuickAccess();   // המונה החכם (סעיף 5)
    renderTorahSelector(); // התפריט המלא (מוסתר)
    document.getElementById('mainDate').valueAsDate = new Date();
    updateProgressUI();
}

// 1. הממשק המצומצם - "כמה למדת היום?"
function renderQuickAccess() {
    const qaCont = document.getElementById('quick-access-torah');
    if (!qaCont) return;
    
    let h = `<div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 15px;">`;
    
    Object.keys(appData.lastPosition).forEach(cat => {
        const pos = appData.lastPosition[cat];
        const unitLabel = (cat === "גמרא") ? "עמודים" : (cat === "משנה" ? "משניות" : "פסוקים");
        
        h += `
        <div class="card" style="padding: 15px; border-right: 5px solid var(--accent); background: #fdfdfd; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span style="font-size: 0.8em; color: #666;">${cat} - ${pos.book}</span>
                <div style="font-weight: bold; font-size: 1.1em; color: var(--primary);">
                    אוחז: ${getUnitLabel(cat, pos.ch)}${cat !== "גמרא" ? ' משנה/פסוק ' + toGem(pos.unit) : ''}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="number" id="input_${cat}" value="1" min="1" style="width: 45px; padding: 5px; border: 1px solid var(--accent); border-radius: 4px;">
                <button onclick="addProgress('${cat}')" class="mark-all-btn" style="padding: 8px 12px;">הוסף ${unitLabel}</button>
            </div>
        </div>`;
    });
    
    h += `</div>
    <button onclick="toggleManualSelect()" style="width:100%; background:none; border:1px dashed var(--accent); color:var(--accent); cursor:pointer; padding:10px; border-radius:8px; font-weight:bold;">
        ⚙️ הגדרה ידנית / החלפת ספר
    </button>
    <div id="manual-torah-select" style="display:none; margin-top:15px;"></div>`;
    
    qaCont.innerHTML = h;
    
    // מעביר את התפריט המלא לתוך הדיב המוסתר
    const fullSelector = document.getElementById('torahContainer');
    if (fullSelector) {
        fullSelector.style.display = 'block';
        document.getElementById('manual-torah-select').appendChild(fullSelector);
    }
}

// 2. לוגיקת המונה החכם - מעבר פרקים אוטומטי
function addProgress(cat) {
    let amount = parseInt(document.getElementById(`input_${cat}`).value) || 0;
    let pos = appData.lastPosition[cat];
    let bookData = TORAH_DB[cat][pos.subCat][pos.book];

    for (let i = 0; i < amount; i++) {
        // סימון תת-יחידה
        let subId = `${cat}_${pos.book}_${pos.ch}_${pos.unit}`;
        appData.subUnits[subId] = true;

        // חישוב כמות יחידות בפרק
        let maxInCurrentCh;
        if (cat === "גמרא") {
            maxInCurrentCh = 2; // עמוד א ועמוד ב
        } else {
            const vArr = bookData.v.split(',').map(Number);
            maxInCurrentCh = vArr[pos.ch - 1];
        }

        // קידום המונה
        if (pos.unit < maxInCurrentCh) {
            pos.unit++;
        } else {
            // מעבר פרק
            if (pos.ch < bookData.ch) {
                appData.units[`${cat}_${pos.book}_${pos.ch}`] = true; // סימון הפרק שהסתיים
                pos.ch++;
                pos.unit = 1;
            } else {
                alert(`מזל טוב! סיימת את ספר ${pos.book}!`);
                break;
            }
        }
    }

    saveAll();
    renderQuickAccess();
}

// 3. פונקציות תצוגה ועזר (גימטריה, תגים וכו')
function toGem(n) {
    if (n === 15) return "טו";
    if (n === 16) return "טז";
    const l = {400:'ת',300:'ש',200:'ר',100:'ק',90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י',9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א'};
    let r = ""; let num = n;
    const keys = Object.keys(l).map(Number).sort((a,b)=>b-a);
    for (let v of keys) { while (num >= v) { r += l[v]; num -= v; } }
    return r;
}

function getUnitLabel(cat, i) {
    if (cat === "גמרא") {
        const pageNum = Math.floor((i - 1) / 2) + 2; 
        const side = (i % 2 !== 0) ? '.' : ':';
        return toGem(pageNum) + side;
    }
    return 'פרק ' + toGem(i);
}

// רינדור 14 הסעיפים האחרים
function renderSections() {
    const cont = document.getElementById('dynamic-sections');
    if (!cont) return;
    cont.innerHTML = '';
    SECTIONS_CONFIG.forEach(sec => {
        if (sec.id === 5) return;
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

// תפריט בחירה מלא (למקרה שרוצים להחליף ספר)
function renderTorahSelector() {
    const tCont = document.getElementById('torahContainer');
    if (!tCont) return;
    tCont.innerHTML = '';
    Object.keys(TORAH_DB).forEach(mainCat => {
        let h = `<div class="card" style="margin-bottom:10px; border: 1px solid #ddd;">
            <div style="font-weight:bold; cursor:pointer;" onclick="toggleAcc(this)">${mainCat} ▾</div>
            <div class="acc-content" style="display:none; padding:10px;">`;
        Object.keys(TORAH_DB[mainCat]).forEach(subCat => {
            h += `<div style="margin-bottom:5px;"><strong>${subCat}:</strong>
                <select onchange="updateManualPos('${mainCat}', '${subCat}', this.value)" style="width:100%; padding:5px;">
                    <option>בחר ספר...</option>
                    ${Object.keys(TORAH_DB[mainCat][subCat]).map(b => `<option value="${b}">${b}</option>`).join('')}
                </select></div>`;
        });
        h += `</div></div>`;
        tCont.innerHTML += h;
    });
}

function updateManualPos(cat, sub, book) {
    appData.lastPosition[cat] = { book: book, ch: 1, unit: 1, subCat: sub };
    saveAll();
    renderQuickAccess();
}

function toggleAcc(el) {
    const content = el.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function toggleManualSelect() {
    const el = document.getElementById('manual-torah-select');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
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
        Object.keys(TORAH_DB[cat]).forEach(s => {
            Object.keys(TORAH_DB[cat][s]).forEach(book => {
                total += TORAH_DB[cat][s][book].ch;
                for (let i=1; i<=TORAH_DB[cat][s][book].ch; i++) {
                    if (appData.units[`${cat}_${book}_${i}`]) done++;
                }
            });
        });
        const pct = total > 0 ? Math.round((done/total)*100) : 0;
        container.innerHTML += `<div style="margin-bottom:10px;">${cat}: ${pct}% 
            <div class="progress-bar-container"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    });
}

function showTab(id) {
    document.querySelectorAll('.tab-content, .nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.onload = init;