// --- LOGIC.JS: המוח המלא של מערכת יהושע ---

let appData = JSON.parse(localStorage.getItem('yehoshua_data')) || {
    daily: {},
    units: {},
    subUnits: {}
};

let chartObj = null;

// פונקציית אתחול
function init() {
    renderSections();
    renderTorahSelector();
    const dateInput = document.getElementById('mainDate');
    if(dateInput) dateInput.valueAsDate = new Date();
    updateProgressUI();
}

// 1. פונקציית עזר לחישוב התקדמות כללית (עבור הגרף)
function calculateOverallProgress() {
    let totalItems = 0;
    let completedItems = 0;

    Object.keys(TORAH_DB).forEach(cat => {
        Object.keys(TORAH_DB[cat]).forEach(book => {
            totalItems += TORAH_DB[cat][book].ch;
            for (let i = 1; i <= TORAH_DB[cat][book].ch; i++) {
                if (appData.units[`${cat}_${book}_${i}`]) completedItems++;
            }
        });
    });

    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { percent };
}

// 2. בניית 15 הסעיפים בדף הבית
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

// 3. טעינת פרקים/דפים עם תמיכה בדאבל-קליק
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
        
        // הגדרת כמות פסוקים/משניות
        let vCount = 15;
        if (bookData.v) {
            const vArray = bookData.v.split(',').map(Number);
            vCount = vArray[i - 1] || 15;
        } else if (cat === "גמרא") vCount = 2;

        // לחיצה בודדת: פתיחת פירוט
        item.onclick = () => {
            renderSubUnits(subBox, id, bookName, i, item, bookData, cat);
        };

        // דאבל קליק: סימון כל הפרק (לפי ההנחיות שלך!)
        item.ondblclick = () => {
            markAllInChapter(id, vCount, item);
        };

        grid.appendChild(item);
    }
}

// 4. הצגת ריבועי פסוקים/משניות
function renderSubUnits(subBox, parentId, bookName, chapterNum, parentEl, bookData, cat) {
    subBox.style.display = 'block';
    subBox.dataset.currentId = parentId;

    let vCount = 15;
    if (bookData.v) {
        const vArray = bookData.v.split(',').map(Number);
        vCount = vArray[chapterNum - 1] || 15;
    } else if (cat === "גמרא") vCount = 2;

    subBox.innerHTML = `
        <div class="sub-unit-box">
            <strong>${bookName} - ${toGem(chapterNum)}:</strong>
            <div class="units-grid" id="subGrid"></div>
        </div>`;
    
    const subGrid = document.getElementById('subGrid');
    for(let j = 1; j <= vCount; j++) {
        let subId = `${parentId}_${j}`;
        let subItem = document.createElement('div');
        subItem.className = 'unit-item ' + (appData.subUnits[subId] ? 'checked' : '');
        subItem.innerText = (cat === "גמרא") ? (j === 1 ? 'א' : 'ב') : j;
        
        subItem.onclick = (e) => {
            e.stopPropagation();
            appData.subUnits[subId] = !appData.subUnits[subId];
            subItem.classList.toggle('checked');
            checkIfChapterComplete(parentId, vCount, parentEl);
            saveToLoc();
        };
        subGrid.appendChild(subItem);
    }
}

// 5. פונקציות עזר לסימון ושמירה
function markAllInChapter(parentId, vCount, parentEl) {
    const isCurrentlyChecked = parentEl.classList.contains('checked');
    const newValue = !isCurrentlyChecked;

    appData.units[parentId] = newValue;
    for(let j = 1; j <= vCount; j++) {
        appData.subUnits[`${parentId}_${j}`] = newValue;
    }
    
    if(newValue) parentEl.classList.add('checked');
    else parentEl.classList.remove('checked');
    
    saveToLoc();
    updateProgressUI();
}

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

function saveToLoc() { 
    localStorage.setItem('yehoshua_data', JSON.stringify(appData)); 
    // אם קיימת פונקציית סנכרון לענן, נקרא לה כאן
    if (window.syncToCloud) window.syncToCloud(appData);
}

// 6. עדכון ממשק התקדמות וגרפים
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
        progCont.innerHTML += `
            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <span>${cat}</span>
                    <span>${pct}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-fill" style="width:${pct}%"></div>
                </div>
            </div>`;
    });
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const stats = calculateOverallProgress();

    if (chartObj) chartObj.destroy();

    chartObj = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['הושלם', 'נותר'],
            datasets: [{
                data: [stats.percent, 100 - stats.percent],
                backgroundColor: ['#c5a059', '#e0e0e0'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });
}

// עזרים רגילים
function toGem(n) {
    const l = {400:'ת',300:'ש',200:'ר',100:'ק',90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י',9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א'};
    let r = ""; if (n === 15) return "טו"; if (n === 16) return "טז";
    for (let v of Object.keys(l).sort((a,b)=>b-a)) { while (n >= v) { r += l[v]; n -= v; } } return r;
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
        h += `</select><div class="units-grid"></div><div class="sub-unit-box" style="display:none"></div></div></div>`;
        tCont.innerHTML += h;
    });
}

function toggleAcc(el) {
    const content = el.nextElementSibling;
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

window.onload = init;