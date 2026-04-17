// --- STATE & UTILS ---
let isLoggingIn = true;
let currentUser = null;
let lastResult = null;
let allScreenings = []; // Cache for Patients & History views

// Nav IDs and their active style classes
const NAV_ITEMS = {
    'nav-dashboard': 'showDashboard',
    'nav-patients':  'showPatients',
    'nav-history':   'showHistory',
};

function setActiveNav(activeId) {
    Object.keys(NAV_ITEMS).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === activeId) {
            el.classList.add('text-teal-700', 'font-bold', 'border-b-2', 'border-teal-600');
            el.classList.remove('text-slate-500', 'font-medium');
        } else {
            el.classList.remove('text-teal-700', 'font-bold', 'border-b-2', 'border-teal-600');
            el.classList.add('text-slate-500', 'font-medium');
        }
    });
}

function hideAllViews() {
    ['view-auth', 'view-dashboard', 'view-upload', 'view-results',
     'view-patients', 'view-history', 'fab-results'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden-view');
    });
    // Reset all nav items
    Object.keys(NAV_ITEMS).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('text-teal-700', 'font-bold', 'border-b-2', 'border-teal-600');
        el.classList.add('text-slate-500', 'font-medium');
    });
}

function showNavShell() {
    document.getElementById('top-nav').classList.remove('hidden-view');
    document.getElementById('side-nav').classList.remove('hidden-view');
    document.getElementById('main-content-area').style.marginLeft = '16rem';
}

function showAuth() {
    hideAllViews();
    document.getElementById('view-auth').classList.remove('hidden-view');
    document.getElementById('top-nav').classList.add('hidden-view');
    document.getElementById('side-nav').classList.add('hidden-view');
    document.getElementById('main-content-area').style.marginLeft = '0';
}

function showDashboard() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    showNavShell();
    document.getElementById('view-dashboard').classList.remove('hidden-view');
    setActiveNav('nav-dashboard');

    // Role-based UI Customization
    const isDoctor = currentUser && currentUser.role === 'doctor';
    document.getElementById('dashboard-title').textContent = isDoctor ? 'Clinical Dashboard' : 'Health Overview';
    document.getElementById('dashboard-subtitle').textContent = isDoctor
        ? 'Real-time diabetic retinopathy screening overview.'
        : 'Your personal retinal health and diagnostic history.';
    document.getElementById('table-title').textContent = isDoctor ? 'Recent Patient Screenings' : 'Your Screening History';

    fetchDashboardData();
}

function showUpload() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    showNavShell();

    document.getElementById('process-fill').style.width = '0%';
    document.getElementById('process-percentage').textContent = '0%';

    if (document.getElementById('patient-name-input')) {
        document.getElementById('patient-name-input').value = '';
    }
    if (document.getElementById('preview-container')) {
        document.getElementById('preview-container').classList.add('hidden-view');
    }

    document.getElementById('view-upload').classList.remove('hidden-view');
}

function showResults() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    showNavShell();
    document.getElementById('view-results').classList.remove('hidden-view');
}

// ============================================================
// VIEW: PATIENTS
// ============================================================

function showPatients() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    showNavShell();
    document.getElementById('view-patients').classList.remove('hidden-view');
    setActiveNav('nav-patients');
    renderPatients(allScreenings);
}

function renderPatients(screenings) {
    const grid = document.getElementById('patients-grid');
    grid.innerHTML = '';

    // Aggregate unique patients by patient_name
    const patientMap = {};
    screenings.forEach(s => {
        const key = s.patient_name;
        if (!patientMap[key]) {
            patientMap[key] = {
                name: s.patient_name,
                ids: [],
                screenings: [],
                latestDate: s.date,
                highestRisk: 'Low',
            };
        }
        patientMap[key].ids.push(s.patient_id);
        patientMap[key].screenings.push(s);
        // Track highest risk
        const riskOrder = { 'High': 3, 'Moderate': 2, 'Low': 1 };
        if ((riskOrder[s.risk] || 0) > (riskOrder[patientMap[key].highestRisk] || 0)) {
            patientMap[key].highestRisk = s.risk;
        }
        // Track latest date
        if (new Date(s.date) > new Date(patientMap[key].latestDate)) {
            patientMap[key].latestDate = s.date;
        }
    });

    const patients = Object.values(patientMap);

    // Update stats
    document.getElementById('patients-stat-total').textContent = patients.length;
    document.getElementById('patients-stat-high').textContent = patients.filter(p => p.highestRisk === 'High').length;
    document.getElementById('patients-stat-screenings').textContent = screenings.length;

    if (patients.length === 0) {
        grid.innerHTML = `
            <div class="col-span-3 py-24 text-center">
                <span class="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-4">group_off</span>
                <p class="text-on-surface-variant font-semibold">No patient records found.</p>
                <p class="text-on-surface-variant/60 text-sm mt-1">Perform a screening to add patients to the registry.</p>
            </div>`;
        return;
    }

    // Sort: High risk first, then by latest date
    patients.sort((a, b) => {
        const riskOrder = { 'High': 3, 'Moderate': 2, 'Low': 1 };
        const rd = (riskOrder[b.highestRisk] || 0) - (riskOrder[a.highestRisk] || 0);
        if (rd !== 0) return rd;
        return new Date(b.latestDate) - new Date(a.latestDate);
    });

    patients.forEach(p => {
        const lastDate = new Date(p.latestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const riskColor = p.highestRisk === 'High'
            ? 'bg-error/10 text-error border-error/20'
            : p.highestRisk === 'Moderate'
            ? 'bg-orange-50 text-orange-600 border-orange-200'
            : 'bg-on-primary-container/10 text-on-primary-container border-on-primary-container/20';

        const riskBg = p.highestRisk === 'High'
            ? 'border-l-4 border-error'
            : p.highestRisk === 'Moderate'
            ? 'border-l-4 border-orange-400'
            : '';

        const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const avatarBg = p.highestRisk === 'High' ? 'bg-error/10' : 'bg-primary-container/20';
        const avatarText = p.highestRisk === 'High' ? 'text-error' : 'text-on-primary-container';

        const latestScreening = p.screenings.sort((a,b) => new Date(b.date) - new Date(a.date))[0];

        grid.insertAdjacentHTML('beforeend', `
            <div class="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4 ${riskBg}">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl ${avatarBg} flex items-center justify-center flex-shrink-0">
                        <span class="text-xl font-black ${avatarText}">${initials}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-black text-on-surface text-lg leading-tight truncate">${p.name}</h3>
                        <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">${p.ids.slice(0,2).map(id => '#' + id).join(', ')}</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${riskColor} flex-shrink-0">${p.highestRisk}</span>
                </div>
                <div class="h-px bg-outline-variant/20"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">Screenings</p>
                        <p class="text-xl font-black text-on-surface">${p.screenings.length}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-0.5">Last Seen</p>
                        <p class="text-sm font-bold text-on-surface">${lastDate}</p>
                    </div>
                </div>
                <div class="bg-surface-container-low rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Latest Result</p>
                        <p class="text-sm font-black text-on-surface mt-0.5">${latestScreening.severity}</p>
                    </div>
                    <button onclick='viewScreening(${JSON.stringify(latestScreening)})' class="bg-on-primary-container text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-fixed hover:text-on-primary-fixed transition active:scale-95">
                        View Latest
                    </button>
                </div>
            </div>
        `);
    });
}

function filterPatients() {
    const q = document.getElementById('patients-search').value.toLowerCase();
    const filtered = q
        ? allScreenings.filter(s => s.patient_name.toLowerCase().includes(q) || s.patient_id.toLowerCase().includes(q))
        : allScreenings;
    renderPatients(filtered);
}

// ============================================================
// VIEW: HISTORY
// ============================================================

function showHistory() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    showNavShell();
    document.getElementById('view-history').classList.remove('hidden-view');
    setActiveNav('nav-history');
    renderHistory(allScreenings);
}

function renderHistory(screenings) {
    const tbody = document.getElementById('history-table-body');
    const empty = document.getElementById('history-empty');
    tbody.innerHTML = '';

    document.getElementById('history-count-label').textContent =
        `${screenings.length} record${screenings.length !== 1 ? 's' : ''}`;

    if (screenings.length === 0) {
        empty.classList.remove('hidden-view');
        return;
    }
    empty.classList.add('hidden-view');

    // Sort newest first
    const sorted = [...screenings].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(s => {
        const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = new Date(s.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const badgeClass = s.risk === 'High'
            ? 'bg-error/10 text-error'
            : s.risk === 'Moderate'
            ? 'bg-orange-50 text-orange-600'
            : 'bg-on-primary-container/10 text-on-primary-container';

        const riskBadgeClass = s.risk === 'High'
            ? 'bg-error text-white'
            : s.risk === 'Moderate'
            ? 'bg-orange-400 text-white'
            : 'bg-on-primary-container/20 text-on-primary-container';

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-8 py-4">
                    <div class="font-bold text-on-surface">#${s.patient_id}</div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider">${s.patient_name}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-on-surface font-medium">${date}</div>
                    <div class="text-[10px] text-on-surface-variant">${time}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badgeClass}">
                        ● ${s.severity.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${riskBadgeClass}">
                        ${s.risk}
                    </span>
                </td>
                <td class="px-6 py-4 font-black text-on-surface">${s.confidence.toFixed(1)}%</td>
                <td class="px-8 py-4 text-right">
                    <button onclick='viewScreening(${JSON.stringify(s)})' class="bg-surface-container-high px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition active:scale-95">
                        View
                    </button>
                </td>
            </tr>
        `);
    });
}

function filterHistory() {
    const q = (document.getElementById('history-search').value || '').toLowerCase();
    const risk = document.getElementById('history-risk-filter').value;

    let filtered = allScreenings;
    if (q) filtered = filtered.filter(s =>
        s.patient_name.toLowerCase().includes(q) ||
        s.patient_id.toLowerCase().includes(q) ||
        s.severity.toLowerCase().includes(q)
    );
    if (risk) filtered = filtered.filter(s => s.risk === risk);

    renderHistory(filtered);
}

// ============================================================
// VIEW SCREENING MODAL
// ============================================================

function viewScreening(s) {
    // s can be an object (from allScreenings) or a DB screening object
    const screening = typeof s === 'string' ? JSON.parse(s) : s;

    // Populate modal
    document.getElementById('modal-patient-id').textContent = '#' + screening.patient_id;
    document.getElementById('modal-patient-name').textContent = screening.patient_name;
    document.getElementById('modal-severity').textContent = screening.severity;
    document.getElementById('modal-confidence').textContent = screening.confidence.toFixed(1) + '%';
    document.getElementById('modal-confidence-bar').style.width = screening.confidence + '%';
    document.getElementById('modal-message').textContent = screening.message;

    // Risk badge
    const badge = document.getElementById('modal-risk-badge');
    badge.textContent = screening.risk.toUpperCase() + ' RISK';
    badge.className = 'inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ' +
        (screening.risk === 'High' ? 'bg-error text-white' :
         screening.risk === 'Moderate' ? 'bg-orange-400 text-white' :
         'bg-on-primary-container text-white');

    // Heatmap
    const imgEl = document.getElementById('modal-heatmap');
    const noImg = document.getElementById('modal-no-image');
    if (screening.overlay) {
        imgEl.src = screening.overlay;
        imgEl.classList.remove('hidden-view');
        noImg.classList.add('hidden-view');
    } else {
        imgEl.src = '';
        imgEl.classList.add('hidden-view');
        noImg.classList.remove('hidden-view');
    }

    // Wire Print Report button to use this screening's data
    document.getElementById('modal-pdf-btn').onclick = () => {
        lastResult = screening;
        closeModal();
        generatePDF();
    };

    // Show modal
    document.getElementById('modal-overlay').classList.remove('hidden-view');
    document.body.style.overflow = 'hidden';
}

function closeModal(event) {
    if (event && event.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.add('hidden-view');
    document.body.style.overflow = '';
}


// --- AUTH LOGIC ---

let selectedRole = 'doctor';

function setAuthRole(role) {
    selectedRole = role;
    const docBtn = document.getElementById('role-btn-doctor');
    const patBtn = document.getElementById('role-btn-patient');
    const patientFields = document.getElementById('auth-patient-fields');

    if (role === 'doctor') {
        docBtn.classList.add('bg-primary-container', 'text-white', 'border-primary-container');
        docBtn.classList.remove('border-outline-variant', 'text-on-surface-variant');
        patBtn.classList.remove('bg-primary-container', 'text-white', 'border-primary-container');
        patBtn.classList.add('border-outline-variant', 'text-on-surface-variant');
        patientFields.classList.add('hidden');
    } else {
        patBtn.classList.add('bg-primary-container', 'text-white', 'border-primary-container');
        patBtn.classList.remove('border-outline-variant', 'text-on-surface-variant');
        docBtn.classList.remove('bg-primary-container', 'text-white', 'border-primary-container');
        docBtn.classList.add('border-outline-variant', 'text-on-surface-variant');
        patientFields.classList.remove('hidden');
    }
}

function toggleAuthMode() {
    isLoggingIn = !isLoggingIn;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nameInput = document.getElementById('auth-name');
    const btnText = document.getElementById('auth-btn-text');
    const switchText = document.getElementById('auth-switch-text');
    const switchAction = document.getElementById('auth-switch-action');
    const roleContainer = document.getElementById('auth-role-container');
    const patientFields = document.getElementById('auth-patient-fields');

    if (isLoggingIn) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to access your screenings.';
        nameInput.classList.add('hidden');
        roleContainer.classList.add('hidden');
        patientFields.classList.add('hidden');
        btnText.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        switchAction.textContent = 'Sign up';
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Join the healthcare network.';
        nameInput.classList.remove('hidden');
        roleContainer.classList.remove('hidden');
        setAuthRole(selectedRole);
        btnText.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchAction.textContent = 'Sign in';
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    try {
        if (isLoggingIn) {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!res.ok) throw new Error('Invalid credentials');
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            checkAuth();
        } else {
            const age = document.getElementById('auth-age').value;
            const diabetes = document.getElementById('auth-diabetes').value;

            const payload = {
                email,
                password,
                name,
                role: selectedRole,
                age: selectedRole === 'patient' ? parseInt(age) : null,
                diabetes_type: selectedRole === 'patient' ? diabetes : null
            };

            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Registration failed');
            alert('Account created! Please sign in.');
            toggleAuthMode();
        }
    } catch (err) {
        alert(err.message);
    }
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) { showAuth(); return; }

    try {
        const res = await fetch('/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Session expired');

        currentUser = await res.json();
        const displayName = (currentUser.role === 'doctor' && !currentUser.name.toLowerCase().startsWith('dr.'))
            ? `Dr. ${currentUser.name}` : currentUser.name;
        document.getElementById('user-profile-name').textContent = displayName;
        showDashboard();
    } catch (err) {
        logout();
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    allScreenings = [];
    showAuth();
}

// --- DATA LOGIC ---

async function fetchDashboardData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/screenings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const screenings = await res.json();
        allScreenings = screenings; // Cache globally
        renderDashboard(screenings);
    } catch (err) {
        console.error('Failed to fetch screenings', err);
    }
}

function renderDashboard(screenings) {
    const tableBody = document.getElementById('screenings-table-body');
    tableBody.innerHTML = '';

    const total = screenings.length;
    const flagged = screenings.filter(s => s.risk !== 'Low').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-flagged').textContent = flagged;
    document.getElementById('stat-pending').textContent = 0;

    // Show only the 6 most recent on dashboard
    const recent = [...screenings].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    recent.forEach(s => {
        const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const badgeClass = s.risk === 'High'
            ? 'bg-error/10 text-error'
            : s.risk === 'Moderate'
            ? 'bg-orange-50 text-orange-600'
            : 'bg-on-primary-container/10 text-on-primary-container';

        const row = `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-8 py-4">
                    <div class="font-bold text-on-surface">#${s.patient_id}</div>
                    <div class="text-[10px] text-on-surface-variant uppercase tracking-wider">${s.patient_name}</div>
                </td>
                <td class="px-6 py-4 text-sm text-on-surface-variant font-medium">${date}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${badgeClass}">
                        ● ${s.severity.toUpperCase()}
                    </span>
                </td>
                <td class="px-6 py-4 font-black text-on-surface">${s.confidence.toFixed(1)}%</td>
                <td class="px-8 py-4 text-right">
                    <button onclick='viewScreening(${JSON.stringify(s)})' class="bg-surface-container-high px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition active:scale-95">View</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// --- FILE UPLOAD ---

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const processView = document.getElementById('processing-view');
const processBar = document.getElementById('process-fill');
const processPercent = document.getElementById('process-percentage');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-on-primary-container', 'bg-primary-fixed/10'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-on-primary-container', 'bg-primary-fixed/10'); });
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('border-on-primary-container', 'bg-primary-fixed/10'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        console.log('File detected via input change');
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    if (!file) return;
    console.log('handleFile triggered for:', file.name);

    if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file.');
        return;
    }

    const patientName = document.getElementById('patient-name-input').value.trim();

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('preview-container').classList.remove('hidden-view');
    };
    reader.readAsDataURL(file);

    processView.classList.remove('hidden-view');

    let progress = 0;
    const interval = setInterval(() => {
        if (progress < 90) {
            progress += Math.random() * 5;
            processBar.style.width = `${progress}%`;
            processPercent.textContent = `${Math.floor(progress)}%`;
        }
    }, 150);

    const formData = new FormData();
    formData.append('file', file);
    if (patientName) formData.append('patient_name', patientName);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error('Analysis failed');
        const data = await res.json();
        lastResult = data;

        clearInterval(interval);
        processBar.style.width = '100%';
        processPercent.textContent = '100%';

        setTimeout(() => {
            renderResults(data);
            document.getElementById('fab-results').classList.remove('hidden-view');
            // Refresh the global cache after a new screening
            fetchDashboardData();
        }, 600);
    } catch (err) {
        clearInterval(interval);
        alert(err.message);
        processView.classList.add('hidden-view');
    }
}

function renderResults(data) {
    document.getElementById('result-overlay').src = data.overlay;
    document.getElementById('result-severity').textContent = data.severity;
    document.getElementById('result-message').textContent = data.message;
    document.getElementById('result-confidence').textContent = `${data.confidence.toFixed(1)}%`;
    document.getElementById('confidence-bar').style.width = `${data.confidence}%`;
    document.getElementById('result-class-id').textContent = `AI CLASS: ${data.class}`;

    if (data.patient_name) {
        document.getElementById('result-patient-name').textContent = data.patient_name;
    }

    const badge = document.getElementById('risk-badge');
    badge.textContent = `${data.risk.toUpperCase()} RISK`;
    badge.className = 'px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider ' +
                     (data.risk === 'High' ? 'bg-error text-on-error' :
                     (data.risk === 'Moderate' ? 'bg-orange-400 text-white' : 'bg-on-primary-container text-on-primary'));
}

// --- PDF GENERATION ---
async function generatePDF() {
    if (!lastResult) return alert('No screening results found to export.');

    const template = document.getElementById('pdf-template');

    document.getElementById('pdf-date').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('pdf-report-id').textContent = Math.random().toString(36).substr(2, 9).toUpperCase();
    document.getElementById('pdf-patient-name').textContent = lastResult.patient_name || (currentUser.role === 'patient' ? currentUser.name : 'Anonymous Patient');

    let meta = '';
    if (currentUser.role === 'patient') {
        meta = `Age: ${currentUser.age || 'N/A'} | Diabetes: ${currentUser.diabetes_type || 'None'}`;
    }
    document.getElementById('pdf-patient-meta').textContent = meta;
    document.getElementById('pdf-doctor-name').textContent = currentUser.role === 'doctor' ? `Dr. ${currentUser.name}` : 'Automated AI Screening';

    document.getElementById('pdf-heatmap').src = lastResult.overlay || '';
    document.getElementById('pdf-severity').textContent = lastResult.severity;
    document.getElementById('pdf-confidence').textContent = `${lastResult.confidence.toFixed(1)}%`;
    document.getElementById('pdf-message').textContent = lastResult.message;

    const badge = document.getElementById('pdf-risk-badge');
    badge.textContent = `${lastResult.risk.toUpperCase()} RISK`;
    badge.style.backgroundColor = lastResult.risk === 'High' ? '#ba1a1a' : (lastResult.risk === 'Moderate' ? '#ffa500' : '#006a61');

    const opt = {
        margin:       0.5,
        filename:     `Retina_AI_Report_${document.getElementById('pdf-report-id').textContent}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    template.classList.remove('hidden-view');
    try {
        await html2pdf().set(opt).from(template).save();
    } catch (err) {
        console.error('PDF Generation failed', err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        template.classList.add('hidden-view');
    }
}

function addToRecord() {
    showDashboard();
}

// Start
checkAuth();
