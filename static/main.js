// --- STATE & UTILS ---
let isLoggingIn = true;
let currentUser = null;
let lastResult = null;

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
    
    // Role-based UI Customization
    const isDoctor = currentUser && currentUser.role === 'doctor';
    document.getElementById('dashboard-title').textContent = isDoctor ? "Clinical Dashboard" : "Health Overview";
    document.getElementById('dashboard-subtitle').textContent = isDoctor ? "Real-time diabetic retinopathy screening overview." : "Your personal retinal health and diagnostic history.";
    document.getElementById('table-title').textContent = isDoctor ? "Recent Patient Screenings" : "Your Screening History";
    
    // Hide/Show Doctor-specific sidebar items if needed
    // (Could add more specific side-nav IDs to index.html for this)

    fetchDashboardData();
}

function showUpload() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    
    document.getElementById('process-fill').style.width = '0%';
    document.getElementById('process-percentage').textContent = '0%';
    
    // Clear Intake Name
    if (document.getElementById('patient-name-input')) {
        document.getElementById('patient-name-input').value = '';
    }
    
    document.getElementById('view-upload').classList.remove('hidden-view');
}

function showResults() {
    if (!localStorage.getItem('token')) return showAuth();
    hideAllViews();
    document.getElementById('view-results').classList.remove('hidden-view');
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
        title.textContent = "Welcome Back";
        subtitle.textContent = "Sign in to access your screenings.";
        nameInput.classList.add('hidden');
        roleContainer.classList.add('hidden');
        patientFields.classList.add('hidden');
        btnText.textContent = "Sign In";
        switchText.textContent = "Don't have an account?";
        switchAction.textContent = "Sign up";
    } else {
        title.textContent = "Create Account";
        subtitle.textContent = "Join the healthcare network.";
        nameInput.classList.remove('hidden');
        roleContainer.classList.remove('hidden');
        setAuthRole(selectedRole); // ensure correct fields show
        btnText.textContent = "Sign Up";
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
            // ... (keep login logic same)
            const formData = new URLSearchParams();
            formData.append('username', email);
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
    
    const patientName = document.getElementById('patient-name-input').value.trim();
    
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
    formData.append("file", file);
    if (patientName) formData.append("patient_name", patientName);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        lastResult = data; // Cache for PDF export
        
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
    
    if (data.patient_name) {
        document.getElementById('result-patient-name').textContent = data.patient_name;
    }

    const badge = document.getElementById('risk-badge');
    badge.textContent = `${data.risk.toUpperCase()} RISK`;
    badge.className = "px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider " + 
                     (data.risk === "High" ? "bg-error text-on-error" : 
                     (data.risk === "Moderate" ? "bg-[orange] text-white" : "bg-on-primary-container text-on-primary"));
}

// --- PDF GENERATION ---
async function generatePDF() {
    if (!lastResult) return alert("No screening results found to export.");

    const template = document.getElementById('pdf-template');
    
    // Populate template
    document.getElementById('pdf-date').textContent = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    document.getElementById('pdf-report-id').textContent = Math.random().toString(36).substr(2, 9).toUpperCase();
    document.getElementById('pdf-patient-name').textContent = currentUser.role === 'patient' ? currentUser.name : "Anonymous Patient";
    
    let meta = "";
    if (currentUser.role === 'patient') {
        meta = `Age: ${currentUser.age || 'N/A'} | Diabetes: ${currentUser.diabetes_type || 'None'}`;
    }
    document.getElementById('pdf-patient-meta').textContent = meta;
    document.getElementById('pdf-doctor-name').textContent = currentUser.role === 'doctor' ? `Dr. ${currentUser.name}` : "Automated AI Screening";
    
    document.getElementById('pdf-heatmap').src = lastResult.overlay;
    document.getElementById('pdf-severity').textContent = lastResult.severity;
    document.getElementById('pdf-confidence').textContent = `${lastResult.confidence.toFixed(1)}%`;
    document.getElementById('pdf-message').textContent = lastResult.message;
    
    const badge = document.getElementById('pdf-risk-badge');
    badge.textContent = `${lastResult.risk.toUpperCase()} RISK`;
    badge.style.backgroundColor = lastResult.risk === "High" ? "#ba1a1a" : (lastResult.risk === "Moderate" ? "#ffa500" : "#006a61");

    // Populate dynamic patient name
    if (lastResult.patient_name) {
        document.getElementById('pdf-patient-name').textContent = lastResult.patient_name;
    }

    // PDF Options
    const opt = {
        margin:       0.5,
        filename:     `Retina_AI_Report_${document.getElementById('pdf-report-id').textContent}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Show template briefly, generate, and hide
    template.classList.remove('hidden-view');
    try {
        await html2pdf().set(opt).from(template).save();
    } catch (err) {
        console.error("PDF Generation failed", err);
        alert("Failed to generate PDF. Please try again.");
    } finally {
        template.classList.add('hidden-view');
    }
}

function addToRecord() {
    // Record is already saved in DB upon prediction.
    // This action finalize user awareness and returns to dashboard.
    showDashboard();
}

// Start
checkAuth();
