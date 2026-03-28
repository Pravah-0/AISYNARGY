# Vitreous AI - Diabetic Retinopathy Diagnostic Dashboard

A production-ready, end-to-end AI-powered web application for “Explainable Diabetic Retinopathy Detection from Fundus Images using Deep Learning”. 

## Features
*   **FastAPI Backend**: Seamless, low-latency API for inference.
*   **Streamlit Frontend**: Clinical-grade, user-friendly UI.
*   **EfficientNet-B3 Model**: Pretrained to classify DR into 5 clinical stages.
*   **Explainable AI (XAI)**: Grad-CAM heatmap visualization to justify clinical predictions.
*   **Patient-Friendly Output**: Maps clinical findings into actionable risk insights.

## Setup Instructions

### 1. Install Dependencies
Ensure you have Python 3.8+ installed. Run:
```bash
pip install -r requirements.txt
```

### 2. Run the Backend API
The FastAPI server orchestrates image preprocessing, EfficientNet inference, and Grad-CAM generation.
```bash
uvicorn api:app --reload --port 8000
```
It will be available at `http://127.0.0.1:8000`.

### 3. Run the Streamlit Dashboard
Open a new terminal and run:
```bash
streamlit run app.py
```
This will launch the "Vitreous AI" clinical application in your browser.
