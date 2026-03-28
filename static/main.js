// --- STATE & UTILS ---
let isLoggingIn = true;
let currentUser = null;

function hideAllViews() {
    document.getElementById('view-auth').classList.add('hidden-view');
    document.getElementById('view-dashboard').classList.add('hidden-view');
    document.getElementById('view-upload').classList.add('hidden-view');
    document.getElementById('view-results').classList.add('hidden-view');
    document.getElementById('fab-results').classList.add('hidden-view');
    
    // reset nav
    document.getElementById('nav-dashboard').classList.remove('border-teal-600', 'text-teal-700', 'border-b-2');
    document.getElementById('nav-dashboard').classList.add('text-slate-500');
}

function showAuth() {
    hideAllViews();
    document.getElementById('view-auth').classList.remove('hidden-view');
    document.getElementById('top-nav').classList.add('hidden-view');
    document.getElementById('side-nav').classList.add('hidden-view');
    document.getElementById('main-content-area').style.marginLeft = "0";
}

function showDashboard() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    document.getElementById('view-dashboard').classList.remove('hidden-view');
    document.getElementById('top-nav').classList.remove('hidden-view');
    document.getElementById('side-nav').classList.remove('hidden-view');
    document.getElementById('main-content-area').style.marginLeft = "16rem";
    document.getElementById('nav-dashboard').classList.add('border-teal-600', 'text-teal-700', 'border-b-2');
    document.getElementById('nav-dashboard').classList.remove('text-slate-500');
    fetchDashboardData();
}

function showUpload() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    
    // RESET STATE for new screening
    document.getElementById('file-input').value = '';
    document.getElementById('processing-view').classList.add('hidden-view');
    document.getElementById('preview-card').classList.add('hidden-view');
    document.getElementById('process-fill').style.width = '0%';
    document.getElementById('process-percentage').textContent = '0%';
    
    document.getElementById('view-upload').classList.remove('hidden-view');
}

function showResults() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    document.getElementById('view-results').classList.remove('hidden-view');
}

// --- AUTH LOGIC ---

function toggleAuthMode() {
    isLoggingIn = !isLoggingIn;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nameInput = document.getElementById('auth-name');
    const btnText = document.getElementById('auth-btn-text');
    const switchText = document.getElementById('auth-switch-text');
    const switchAction = document.getElementById('auth-switch-action');

    if (isLoggingIn) {
        title.textContent = "Welcome Back";
        subtitle.textContent = "Sign in to access patient screenings.";
        nameInput.classList.add('hidden');
        btnText.textContent = "Sign In";
        switchText.textContent = "Don't have an account?";
        switchAction.textContent = "Sign up";
    } else {
        title.textContent = "Create Account";
        subtitle.textContent = "Join the clinical retina network.";
        nameInput.classList.remove('hidden');
        btnText.textContent = "Register Doctor";
        switchText.textContent = "Already have an account?";
        switchAction.textContent = "Sign in";
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;

    try {
        if (isLoggingIn) {
            // Login logic
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 expects username
            formData.append('password', password);

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!res.ok) throw new Error("Invalid credentials");
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            checkAuth();
        } else {
            // Signup logic
            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            if (!res.ok) throw new Error("Registration failed");
            alert("Account created! Please sign in.");
            toggleAuthMode();
        }
    } catch (err) {
        alert(err.message);
    }
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAuth();
        return;
    }

    try {
        const res = await fetch('/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Session expired");
        
        currentUser = await res.json();
        const displayName = currentUser.name.toLowerCase().startsWith('dr.') ? currentUser.name : `Dr. ${currentUser.name}`;
        document.getElementById('user-profile-name').textContent = displayName;
        showDashboard();
    } catch (err) {
        logout();
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
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
        renderDashboard(screenings);
    } catch (err) {
        console.error("Failed to fetch screenings", err);
    }
}

function renderDashboard(screenings) {
    const tableBody = document.getElementById('screenings-table-body');
    tableBody.innerHTML = '';

    // Calculate Stats
    const total = screenings.length;
    const flagged = screenings.filter(s => s.risk !== "Low").length;
    const pending = 0; // In a real app, this might come from another field

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-flagged').textContent = flagged;
    document.getElementById('stat-pending').textContent = pending;

    screenings.forEach(s => {
        const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const badgeClass = s.risk === "High" ? "bg-error/10 text-error" : (s.risk === "Moderate" ? "bg-[orange]/10 text-[orange]" : "bg-on-primary-container/10 text-on-primary-container");
        
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
                    <button class="bg-surface-container-high px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition">View</button>
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
fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });

async function handleFile(file) {
    if (!file.type.startsWith('image/')) return alert("Upload valid image.");
    
    processView.classList.remove('hidden-view');
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('preview-filename').textContent = file.name;
        document.getElementById('preview-card').classList.remove('hidden-view');
    };
    reader.readAsDataURL(file);

    let progress = 0;
    const interval = setInterval(() => {
        if (progress < 90) {
            progress += Math.random() * 5;
            processBar.style.width = `${progress}%`;
            processPercent.textContent = `${Math.floor(progress)}%`;
        }
    }, 150);

    const formData = new FormData();
    formData.append("file", file);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        
        clearInterval(interval);
        processBar.style.width = "100%";
        processPercent.textContent = "100%";
        
        setTimeout(() => {
            renderResults(data);
            document.getElementById('fab-results').classList.remove('hidden-view');
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

    const badge = document.getElementById('risk-badge');
    badge.textContent = `${data.risk.toUpperCase()} RISK`;
    badge.className = "px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider " + 
                     (data.risk === "High" ? "bg-error text-on-error" : 
                     (data.risk === "Moderate" ? "bg-[orange] text-white" : "bg-on-primary-container text-on-primary"));
}

// Start
checkAuth();
