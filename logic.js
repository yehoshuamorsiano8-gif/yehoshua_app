// --- LOGIC.JS: המוח המלא של מערכת יהושע ---

let appData = JSON.parse(localStorage.getItem('yehoshua_data')) || {};

let chartObj = null;
// אתחול אובייקטים בסיסיים אם הם לא קיימים
if (!appData.daily) appData.daily = {};
if (!appData.units) appData.units = {};
if (!appData.subUnits) appData.subUnits = {};

// פונקציית אתחול
function init() {
    renderSections();
    renderTorahSelector();
    document.getElementById('mainDate').valueAsDate = new Date();
    updateProgressUI();
}

// בניית 15 הסעיפים בדף הבית
function renderSections() {
    const cont = document.getElementById('dynamic-sections');
    if(!cont) return;
    cont.innerHTML = '';
    SECTIONS_CONFIG.forEach(sec => {
        let h = `<div class="section-header">סעיף ${sec.id}: ${sec.title}</div>`;
        sec.fields.forEach(f => {
            let isScale = f.includes('(סקאלה)') || sec.isScale;
            let input = isScale ? `<input type="range" min="1" max="5" value="3" class="inp" data-name="${f}">` : `<input type="checkbox" class="inp" data-name="${f}">`;
            if(f.includes('(זמן)')) input = `<input type="time" class="inp" data-name="${f}">`;
            if(f.includes('(כמות)')) input = `<input type="number" class="inp" data-name="${f}" style="width:60px">`;
            h += `<div class="field"><label>${f}</label>${input}</div>`;
        });
        cont.innerHTML += h;
    });
}

// בניית תפריט הבחירה התורני
function renderTorahSelector() {
    const tCont = document.getElementById('torahContainer');
    if(!tCont) return;
    tCont.innerHTML = '';
    Object.keys(TORAH_DB).forEach(cat => {
        let h = `<div class="card" style="padding:10px; margin-bottom:10px; border:1px solid #ccc;">
                    <div style="font-weight:bold; cursor:pointer; padding:5px;" onclick="toggleAcc(this)">${cat} ▾</div>
                    <div class="acc-content" style="display:none; padding-top:10px;">
                        <select onchange="loadUnits(this, '${cat}')" style="width:100%; padding:8px; margin-bottom:10px;"><option>בחר ספר...</option>`;
        Object.keys(TORAH_DB[cat]).forEach(b => h += `<option value="${b}">${b}</option>`);
        h += `</select><div class="units-grid"></div><div class="sub-unit-box"></div></div></div>`;
        tCont.innerHTML += h;
    });
}

function toggleAcc(el) {
    const content = el.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

// טעינת פרקים/דפים - ללא לחיצה כפולה
function loadUnits(sel, cat) {
    const bookName = sel.value;
    const grid = sel.nextElementSibling;
    const subBox = grid.nextElementSibling;
    grid.innerHTML = '';
    subBox.style.display = 'none';
    
    const bookData = TORAH_DB[cat][bookName];
    if (!bookData) return;

    for (let i = 1; i <= bookData.ch; i++) {
        let id = `${cat}_${bookName}_${i}`;
        let item = document.createElement('div');
        item.className = 'unit-item ' + (appData.units[id] ? 'checked' : '');
        item.innerText = toGem(i);
        
        // לחיצה בודדת בלבד - פותחת/סוגרת את פירוט הפסוקים
        item.onclick = () => {
            if (subBox.dataset.currentId === id && subBox.style.display === 'block') {
                subBox.style.display = 'none';
            } else {
                renderSubUnits(subBox, id, bookName, i, item, bookData, cat);
                subBox.dataset.currentId = id;
            }
        };
        grid.appendChild(item);
    }
}

// הצגת ריבועי פסוקים/משניות עם כפתור "סמן הכל"
function renderSubUnits(subBox, parentId, bookName, chapterNum, parentEl, bookData, cat) {
    subBox.style.display = 'block';
    
    let vCount = 15; 
    if (bookData.v) {
        const vArray = bookData.v.split(',').map(Number);
        vCount = vArray[chapterNum - 1] || 15;
    } else if (cat === "גמרא") {
        vCount = 2; 
    }

    subBox.innerHTML = `
        <div style="margin-top:10px; padding:15px; background:#f8f9fa; border:2px solid var(--accent); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong>${bookName} - ${cat === "גמרא" ? 'דף' : 'פרק'} ${toGem(chapterNum)}:</strong>
                <button onclick="markAllInChapter('${parentId}', ${vCount}, this)" style="padding:5px 10px; cursor:pointer; background:var(--primary); color:white; border:none; border-radius:5px; font-size:0.8em;">סמן את כל הפרק כבוצע</button>
            </div>
            <div class="units-grid"></div>
        </div>`;
    
    const subGrid = subBox.querySelector('.units-grid');
    for(let j = 1; j <= vCount; j++) {
        let subId = `${parentId}_${j}`;
        let label = (cat === "גמרא") ? (j === 1 ? 'א' : 'ב') : j;
        
        let subItem = document.createElement('div');
        subItem.className = 'unit-item ' + (appData.subUnits[subId] ? 'checked' : '');
        subItem.innerText = label;
        subItem.style.background = "white";
        
        subItem.onclick = (e) => {
            e.stopPropagation();
            appData.subUnits[subId] = !appData.subUnits[subId];
            subItem.classList.toggle('checked');
            
            // עדכון הסטטוס של הפרק הראשי בהתאם
            checkIfChapterComplete(parentId, vCount, parentEl);
            saveToLoc();
        };
        subGrid.appendChild(subItem);
    }
}

// פונקציית עזר לסימון כל הפרק
function markAllInChapter(parentId, vCount, btn) {
    appData.units[parentId] = true;
    for(let j = 1; j <= vCount; j++) {
        appData.subUnits[`${parentId}_${j}`] = true;
    }
    // רענון התצוגה
    const parentEl = document.querySelector(`.unit-item[innertext="${parentId.split('_').pop()}"]`); // הערה: זה יצטרך זיהוי מדויק יותר אם יש כפילויות
    location.reload(); // הדרך הפשוטה לוודא שהכל התעדכן ויזואלית
    saveToLoc();
}

// בדיקה אם כל הפסוקים סומנו ואז סימון הפרק הראשי
function checkIfChapterComplete(parentId, vCount, parentEl) {
    let allDone = true;
    for(let j = 1; j <= vCount; j++) {
        if(!appData.subUnits[`${parentId}_${j}`]) {
            allDone = false;
            break;
        }
    }
    appData.units[parentId] = allDone;
    if(allDone) parentEl.classList.add('checked');
    else parentEl.classList.remove('checked');
}

function toGem(n) {
    const l = {400:'ת',300:'ש',200:'ר',100:'ק',90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י',9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א'};
    let r = ""; if (n === 15) return "טו"; if (n === 16) return "טז";
    for (let v of Object.keys(l).sort((a,b)=>b-a)) { while (n >= v) { r += l[v]; n -= v; } } return r;
}

function saveToLoc() { localStorage.setItem('yehoshua_data', JSON.stringify(appData)); }

function saveData() {
    const date = document.getElementById('mainDate').value;
    if(!date) { alert("בחר תאריך"); return; }
    let score = 0;
    document.querySelectorAll('.inp').forEach(el => {
        if (el.type === 'checkbox' && el.checked) score += 10;
        else if (el.type === 'range') score += parseInt(el.value);
    });
    appData.daily[date] = score;
    saveToLoc();
    alert("נשמר במערכת יהושע!");
}

function showTab(id) {
    document.querySelectorAll('.tab-content, .nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelector(`[onclick="showTab('${id}')"]`).classList.add('active');
    if(id === 'insight-tab') updateProgressUI();
}

// עדכון סרגלי התקדמות
function updateProgressUI() {
    const progCont = document.getElementById('torahProgressBars');
    if(!progCont) return;
    progCont.innerHTML = '';
    Object.keys(TORAH_DB).forEach(cat => {
        let total = 0, done = 0;
        Object.keys(TORAH_DB[cat]).forEach(book => {
            total += TORAH_DB[cat][book].ch;
            for(let i=1; i<=TORAH_DB[cat][book].ch; i++) {
                if(appData.units[`${cat}_${book}_${i}`]) done++;
            }
        });
        let pct = Math.round((done / total) * 100) || 0;
        progCont.innerHTML += `<div><strong>${cat}: ${pct}%</strong><div class="progress-bar-container"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    });
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById('chartJS');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const dates = Object.keys(appData.daily).sort();
    const vals = dates.map(d => appData.daily[d]);
    if(chartObj) chartObj.destroy();
    chartObj = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'ציון יומי', data: vals, borderColor: '#c5a059', fill: true, backgroundColor: 'rgba(197,160,89,0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

window.onload = init;