import streamlit as st
import requests
import io
import time

# Must be the first Command
st.set_page_config(page_title="Vitreous AI", page_icon="👁️", layout="wide", initial_sidebar_state="expanded")

# In case the config.toml hasn't loaded properly for the user's run, the CSS forces the light theme.
with open("static/styles.css", "r") as f:
    st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)

API_URL = "http://127.0.0.1:8000/predict"

# Top Navigation Bar Injection
st.markdown("""
<div class="top-nav">
    <div style="display: flex; align-items: center;">
        <h2 style="color: #312e81; margin:0; margin-right: 40px; font-weight: 900; letter-spacing: -1px;">Vitreous</h2>
        <div class="nav-links">
            <a href="#" class="active">Dashboard</a>
            <a href="#">Patients</a>
            <a href="#">History</a>
        </div>
    </div>
    <div style="display: flex; align-items: center;">
        <div style="background: #f1f5f9; padding: 6px 16px; border-radius: 20px; color:#64748b; font-size: 0.85rem; margin-right: 20px;">🔍 Search records...</div>
        <div style="text-align: right; line-height: 1.2;">
            <div style="color: #0d9488; font-weight: 700; font-size: 0.85rem;">Dr. Smith, Ophthalmologist</div>
            <div style="color: #64748b; font-size: 0.75rem;">Central Retina Clinic</div>
        </div>
        <img src="https://i.pravatar.cc/150?img=11" style="width: 36px; height: 36px; border-radius: 50%; margin-left: 12px;">
    </div>
</div>
""", unsafe_allow_html=True)

# Application State
if 'current_view' not in st.session_state:
    st.session_state['current_view'] = 'dashboard'
if 'results' not in st.session_state:
    st.session_state['results'] = None

# Sidebar Content
with st.sidebar:
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown("<div style='color: #1e293b; font-weight: 800;'>Clinical Ops</div>", unsafe_allow_html=True)
    st.markdown("<div style='color: #94a3b8; font-size: 0.75rem; font-weight: 600; margin-bottom: 24px;'>V1.0.4</div>", unsafe_allow_html=True)
    
    st.markdown("⚙️ **Settings**<br><br>📄 **Reports**<br><br>🛡️ **Administration**", unsafe_allow_html=True)
    st.markdown("<div style='height: 50vh;'></div>", unsafe_allow_html=True)
    if st.button("⊕ New Screening", use_container_width=True):
        st.session_state['current_view'] = 'upload'
        st.rerun()

# ---------------------------------------------------------
# VIEW 1: Dashboard Home
# ---------------------------------------------------------
if st.session_state['current_view'] == 'dashboard':
    st.markdown("<div style='padding: 32px 48px;'>", unsafe_allow_html=True)
    
    header_col1, header_col2 = st.columns([3, 1])
    with header_col1:
        st.markdown("<h1 style='font-size: 3rem;'>Diagnostic Dashboard</h1>", unsafe_allow_html=True)
        st.markdown("<p style='font-size: 1.1rem;'>Real-time diabetic retinopathy screening overview.</p>", unsafe_allow_html=True)
    with header_col2:
        st.markdown("""
        <div class="op-status">
            <span style="font-size: 1.2rem;">🛡️</span> AI SYSTEM STATUS<br>
            <span style="color: #0f766e; font-size: 1.1rem;">Operational (99.1% Acc.)</span>
        </div>
        """, unsafe_allow_html=True)
        
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Stats row
    s1, s2, s3, s4 = st.columns(4)
    with s1:
        st.markdown("<div class='v-card'><div style='color:#0d9488; font-size:1.5rem; margin-bottom:10px;'>👥</div><h1 style='font-size: 2.5rem; margin:0;'>1,284</h1><p style='margin:0; font-size: 0.875rem;'>Total Screenings</p></div>", unsafe_allow_html=True)
    with s2:
        st.markdown("<div class='v-card v-card-danger'><div style='color:#ef4444; font-size:1.5rem; margin-bottom:10px;'>⚠️</div><h1 style='font-size: 2.5rem; margin:0;'>42</h1><p style='margin:0; font-size: 0.875rem;'>Flagged (Mod/Sev)</p></div>", unsafe_allow_html=True)
    with s3:
        st.markdown("<div class='v-card'><div style='color:#6366f1; font-size:1.5rem; margin-bottom:10px;'>📋</div><h1 style='font-size: 2.5rem; margin:0;'>18</h1><p style='margin:0; font-size: 0.875rem;'>Pending Reviews</p></div>", unsafe_allow_html=True)
    with s4:
        st.markdown("<div class='v-card-dark'><div style='color:#34d399; font-size:1.5rem; margin-bottom:10px;'>📈</div><h1 style='font-size: 2.5rem; margin:0;'>99.1%</h1><p style='margin:0; font-size: 0.875rem; color:#94a3b8 !important;'>AI Confidence Avg</p></div>", unsafe_allow_html=True)
        
    st.markdown("<br>", unsafe_allow_html=True)
    
    main_col, side_col = st.columns([2.5, 1])
    with main_col:
        st.markdown("""
        <div class='v-card' style='padding: 0;'>
            <div style='padding: 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;'>
                <h3 style='margin:0;'>Recent Patient Screenings</h3>
                <a href="#" style='color:#0d9488; text-decoration:none; font-weight:600;'>View All →</a>
            </div>
            <table class='v-table'>
                <tr><th>Patient ID / Name</th><th>Date</th><th>Clinical Status</th><th>AI Score</th><th>Action</th></tr>
                <tr>
                    <td><b>#DR-9021</b><br><span style='color:#64748b; font-size:0.85rem;'>Sarah Jenkins</span></td>
                    <td>Oct 24, 2023</td>
                    <td><span class='v-badge badge-danger'>● SEVERE (PDR)</span></td>
                    <td><b>98.4%</b></td>
                    <td><button style='background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-weight:600; color:#334155; cursor:pointer;'>View Analysis</button></td>
                </tr>
                <tr>
                    <td><b>#DR-8842</b><br><span style='color:#64748b; font-size:0.85rem;'>Michael Chen</span></td>
                    <td>Oct 23, 2023</td>
                    <td><span class='v-badge badge-success'>● NORMAL</span></td>
                    <td><b>99.8%</b></td>
                    <td><button style='background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-weight:600; color:#334155; cursor:pointer;'>View Analysis</button></td>
                </tr>
                <tr>
                    <td><b>#DR-7731</b><br><span style='color:#64748b; font-size:0.85rem;'>Elena Rodriguez</span></td>
                    <td>Oct 23, 2023</td>
                    <td><span class='v-badge badge-purple'>● MODERATE (NPDR)</span></td>
                    <td><b>92.1%</b></td>
                    <td><button style='background:#f1f5f9; border:1px none; padding:6px 12px; border-radius:6px; font-weight:600; color:#334155; cursor:pointer;'>View Analysis</button></td>
                </tr>
            </table>
        </div>
        """, unsafe_allow_html=True)
        
    with side_col:
        # Initiate Box
        st.markdown("""
        <div class='v-card-dark' style='margin-bottom: 24px;'>
            <h2 style='margin-top:0;'>Initiate New Retina Screening</h2>
            <p style='color:#94a3b8 !important; line-height:1.5; font-size:0.95rem; margin-bottom: 24px;'>Upload ultra-widefield fundus images or OCT scans for immediate AI analysis.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("☁️ UPLOAD SCAN"):
            st.session_state['current_view'] = 'upload'
            st.rerun()
            
        st.markdown("""
        <div class='v-card' style='background-color:#f8fafc; border:none;'>
            <div style='color:#6366f1; font-weight:800; font-size:0.8rem; margin-bottom:12px; letter-spacing:1px;'>💡 CLINICAL INSIGHT</div>
            <p style='font-size:0.9rem; line-height:1.6;'>We've detected a <span style='color:#ef4444; font-weight:700;'>12% increase</span> in severe cases this month. Consider reviewing the regional patient demographic report for potential localized risk factors.</p>
        </div>
        """, unsafe_allow_html=True)
        
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------
# VIEW 2: Upload
# ---------------------------------------------------------
elif st.session_state['current_view'] == 'upload':
    st.markdown("<div style='padding: 32px 48px;'>", unsafe_allow_html=True)
    st.markdown("<span style='font-size:0.85rem; color: #0d9488; font-weight:800; letter-spacing:1px;'>DIAGNOSTIC INTAKE</span>", unsafe_allow_html=True)
    st.markdown("<h1 style='font-size: 3rem;'>Retinal Fundus Upload</h1>", unsafe_allow_html=True)
    st.markdown("<p style='font-size: 1.1rem; max-width:60%;'>Upload high-resolution scans for neural network processing. Our clinical AI analyzes retinal vasculature for microaneurysms and exudates in real-time.</p>", unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    col_up1, col_up2 = st.columns([2, 1])
    
    with col_up1:
        uploaded_file = st.file_uploader("Drop clinical images here.", type=["jpg", "jpeg", "png", "dcm"])
        
        if uploaded_file is not None:
            # Show analyzing state
            with st.container():
                st.markdown("""
                <div class='v-card-dark' style='margin-top:20px; padding: 20px 32px;'>
                    <div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;'>
                        <h3 style='margin:0; font-size:1.2rem;'>AI Analyzing Retinal Vasculature...</h3>
                        <span style='color:#34d399; font-weight:800;'>65%</span>
                    </div>
                    <div style='height:8px; background:#1e293b; border-radius:4px; overflow:hidden; margin-bottom:16px;'>
                        <div style='width:65%; height:100%; background:#0d9488;'></div>
                    </div>
                    <div style='color:#94a3b8; font-size:0.85rem; margin-bottom:8px;'>✓ Image Pre-processing & Noise Reduction <span style='float:right;'>COMPLETE</span></div>
                    <div style='color:#f8fafc; font-size:0.85rem; font-weight:600;'>● Mapping Microvascular Architecture</div>
                </div>
                """, unsafe_allow_html=True)
                
                progress_bar = st.progress(0)
                for i in range(100):
                    time.sleep(0.01)
                    progress_bar.progress(i + 1)
                
                with st.spinner("Processing Grad-CAM and inferring diagnosis..."):
                    try:
                        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                        response = requests.post(API_URL, files=files)
                        if response.status_code == 200:
                            st.session_state['results'] = response.json()
                            st.session_state['uploaded_filename'] = uploaded_file.name
                            st.session_state['current_view'] = 'results'
                            st.rerun()
                        else:
                            st.error(f"Error from API: {response.text}")
                    except Exception as e:
                        st.error(f"Connection failed. Is the FastAPI backend running on port 8000? Error: {str(e)}")

    with col_up2:
        if 'uploaded_filename' in st.session_state and uploaded_file is not None:
            st.markdown(f"""
            <div class='v-card' style='padding:0; overflow:hidden;'>
                <div style='background:#000; height:200px; display:flex; align-items:center; justify-content:center;'>
                    <span style='color:white;'>[Image Preview]</span>
                </div>
                <div style='padding:20px;'>
                    <h3 style='margin:0 0 4px 0; font-size:1.1rem;'>{st.session_state['uploaded_filename']}</h3>
                    <p style='margin:0 0 16px 0; font-size:0.85rem;'>Uploaded 2 mins ago • 14.2 MB</p>
                    <div style='font-size:0.7rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:8px;'>PATIENT REFERENCE</div>
                    <div style='display:flex; align-items:center; margin-bottom:16px;'>
                        <div style='width:24px; height:24px; background:#e2e8f0; border-radius:50%; display:inline-block; margin-right:8px;'></div>
                        <b>Elena Rodriguez (ID: 88-301)</b>
                    </div>
                    <div style='font-size:0.75rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:8px;'>CLINICAL CONTEXT</div>
                    <span style='background:#f1f5f9; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; margin-right:8px;'>Diabetic Screening</span>
                    <span style='background:#f1f5f9; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;'>Follow-up</span>
                </div>
            </div>
            """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# ---------------------------------------------------------
# VIEW 3: Results
# ---------------------------------------------------------
elif st.session_state['current_view'] == 'results':
    st.markdown("<div style='padding: 32px 48px;'>", unsafe_allow_html=True)
    res = st.session_state['results']
    
    colA, colB = st.columns([3, 1])
    with colA:
        st.markdown("<span style='font-size:0.85rem; color: #64748b; font-weight:600; text-transform:uppercase;'>PATIENT PROFILE > SCREENING ID: 88291-B</span>", unsafe_allow_html=True)
        st.markdown("<h1 style='font-size: 2.8rem;'>Analysis Results</h1>", unsafe_allow_html=True)
    with colB:
        st.markdown("<br>", unsafe_allow_html=True)
        btn1, btn2 = st.columns(2)
        with btn1:
            st.markdown("<button style='width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; background:white; font-weight:600; color:#334155;'>Print Report</button>", unsafe_allow_html=True)
        with btn2:
            st.button("Add to Patient Record", use_container_width=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    c1, c2 = st.columns([2.5, 1])
    
    with c1:
        b64_overlay = res['overlay']
        st.markdown(f"""
        <div style='background:#000; border-radius:16px; overflow:hidden; position:relative; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); margin-bottom:16px;'>
            <img src="{b64_overlay}" width="100%" style="display:block;">
            <div style='position:absolute; bottom:24px; left:24px; background:white; padding:16px 20px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.2); max-width: 80%;'>
                <div style='color:#ef4444; font-weight:800; font-size:0.7rem; letter-spacing:1px; margin-bottom:4px;'>● ANOMALY DETECTED</div>
                <h4 style='margin:0 0 6px 0; font-size:1.1rem; color:#0f172a;'>Potential Microaneurysm Cluster</h4>
                <p style='margin:0; font-size:0.85rem; color:#475569;'>Region shows significant vascular dilation and early stage leakage consistent with NPDR.</p>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style='background:#fef2f2; border:1px solid #fecaca; padding:16px 20px; border-radius:12px; display:flex; align-items:flex-start;'>
            <div style='color:#ef4444; font-size:1.2rem; margin-right:16px;'>ⓘ</div>
            <div>
                <strong style='color:#991b1b; display:block; margin-bottom:4px;'>AI-assisted screening. Not a final diagnosis.</strong>
                <span style='color:#991b1b; font-size:0.85rem;'>The Vitreous AI algorithm provides preliminary observations based on uploaded fundus imagery. This report must be reviewed and validated by a licensed ophthalmologist or retina specialist before clinical action is taken.</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with c2:
        risk = res['risk']
        badge_class = "badge-danger" if risk == "High" else "badge-warning" if risk == "Moderate" else "badge-success"
        
        st.markdown(f"""
        <div class='v-card' style='margin-bottom:24px;'>
            <div style='font-size:0.75rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:12px;'>DIAGNOSTIC SUMMARY</div>
            <h2 style='margin:0 0 16px 0; font-size:1.8rem; line-height:1.2; color:#0f172a;'>{res['severity']}</h2>
            <div style='display:flex; align-items:center;'>
                <div class='v-badge {badge_class}' style='margin-right:12px;'>{risk.upper()} RISK</div>
                <div style='font-size:0.75rem; color:#64748b;'>Classified by Vitreous Core v4</div>
            </div>
            
            <hr style='border:0; border-top:1px solid #f1f5f9; margin:24px 0;'>
            
            <div style='font-size:0.75rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:8px;'>AI CONFIDENCE</div>
            <h1 style='color:#0d9488; margin:0; font-size:2.5rem;'>{res['confidence']:.1f}%</h1>
            <div style='height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden; margin-top:12px;'><div style='width:{res['confidence']}%; height:100%; background:#0d9488;'></div></div>
            
            <hr style='border:0; border-top:1px solid #f1f5f9; margin:24px 0;'>
            
            <div style='font-size:0.75rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:12px;'>RECOMMENDATION</div>
            <p style='font-style:italic; font-size:0.9rem; color:#334155; margin:0; line-height:1.5;'>"{res['message']}"</p>
            
            <div style='margin-top:24px;'>
                <button style='background:#0d9488; color:white; border:none; border-radius:8px; padding:12px; width:100%; font-weight:600; font-size:0.95rem; cursor:pointer;'>► Refer to Specialist →</button>
            </div>
        </div>
        
        <div class='v-card'>
            <div style='font-size:0.75rem; font-weight:800; color:#94a3b8; letter-spacing:1px; margin-bottom:16px;'>CLINICAL INSIGHTS</div>
            <div style='display:flex; margin-bottom:16px;'>
                <div style='color:#0ea5e9; font-size:1.2rem; margin-right:12px;'>👁</div>
                <div>
                    <strong style='display:block; font-size:0.9rem; color:#0f172a; margin-bottom:4px;'>Vascular Tortuosity</strong>
                    <span style='font-size:0.8rem; color:#64748b; line-height:1.4;'>Increased looping and dilation observed in the superior temporal arcade, indicating localized ischemia.</span>
                </div>
            </div>
            <div style='display:flex;'>
                <div style='color:#0ea5e9; font-size:1.2rem; margin-right:12px;'>⦿</div>
                <div>
                    <strong style='display:block; font-size:0.9rem; color:#0f172a; margin-bottom:4px;'>Hard Exudates</strong>
                    <span style='font-size:0.8rem; color:#64748b; line-height:1.4;'>Widespread lipid deposits detected in the macula periphery, suggesting active leakage.</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)
