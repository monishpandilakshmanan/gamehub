const loggedData = [];

const loginView = document.getElementById('login-view');
const hubView = document.getElementById('hub-view');
const adminView = document.getElementById('admin-view');
const tileContainer = document.getElementById('tile-transition-container');

// Intercept Login Form Submissions
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const timestamp = new Date().toLocaleTimeString();
    
    // Save to server log
    loggedData.push({ time: timestamp, username: user, password: pass });
    refreshAdminLogs();
    
    // Go to App Selection View
    document.getElementById('display-user').innerText = user;
    setView('hub-view');
});

function setView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// Modal Task Handlers
function openTasks(title, banner, text, prize) {
    document.getElementById('modal-game-title').innerText = title;
    document.getElementById('modal-game-img').style.backgroundImage = `url('${banner}')`;
    document.getElementById('modal-task-desc').innerText = text;
    document.getElementById('modal-reward-val').innerText = prize;
    
    const bar = document.getElementById('task-progress');
    const claim = document.getElementById('claim-btn');
    
    bar.style.width = '0%';
    claim.classList.add('disabled');
    claim.disabled = true;
    
    document.getElementById('task-modal').style.display = 'flex';
    
    // Trigger task countdown bar progress loop simulation
    setTimeout(() => {
        bar.style.width = '100%';
    }, 100);

    setTimeout(() => {
        claim.classList.remove('disabled');
        claim.disabled = false;
    }, 2100);
}

function closeTasks() {
    document.getElementById('task-modal').style.display = 'none';
}

// Invisible Password Evaluation Hook
document.getElementById('admin-trigger').addEventListener('click', function() {
    const entry = prompt("SYSTEM LOGIN REQUIRED:\nEnter Terminal Authorization Hash Key:");
    if (entry === "HSINOM@2011") {
        playTileAnimation('admin-view');
    } else if (entry !== null) {
        alert("ACCESS ENFORCEMENT ERROR: Key Verification Failure.");
    }
});

// Tile Diagonal Matrix Transition Generator
function playTileAnimation(targetView) {
    const rCount = 8;
    const cCount = 8;
    
    tileContainer.style.gridTemplateRows = `repeat(${rCount}, 1fr)`;
    tileContainer.style.gridTemplateColumns = `repeat(${cCount}, 1fr)`;
    tileContainer.innerHTML = '';
    
    const tilesList = [];
    
    for (let r = 0; r < rCount; r++) {
        for (let c = 0; c < cCount; c++) {
            const tileNode = document.createElement('div');
            tileNode.classList.add('tile');
            tileContainer.appendChild(tileNode);
            tilesList.push({ el: tileNode, delay: r + c });
        }
    }
    
    tilesList.sort((x, y) => x.delay - y.delay);
    
    tilesList.forEach(node => {
        setTimeout(() => {
            node.el.classList.add('reveal');
        }, node.delay * 40);
    });
    
    const syncTime = (rCount + cCount) * 40 + 150;
    
    setTimeout(() => {
        setView(targetView);
        document.querySelectorAll('.tile').forEach(t => t.style.background = '#010201');
    }, syncTime);
    
    setTimeout(() => {
        tileContainer.innerHTML = '';
    }, syncTime + 500);
}

function exitAdmin() {
    setView('login-view');
}

// Clean DOM Generation for Admin Log Table Rows
function refreshAdminLogs() {
    const rootTable = document.getElementById('admin-log-table');
    if (loggedData.length === 0) return;
    
    rootTable.innerHTML = '';
    loggedData.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>[${item.time}]</td>
            <td><strong>${cleanString(item.username)}</strong></td>
            <td style="color: #ff3333;">${cleanString(item.password)}</td>
        `;
        rootTable.appendChild(tr);
    });
}

function cleanString(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
