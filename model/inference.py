import base64
import cv2
import numpy as np
from .model import load_model
from .preprocess import preprocess_image
from .xai import GradCAM, overlay_heatmap
from utils.risk_mapper import get_risk_mapping
import torch

# Singleton model loading to avoid reloading on every request
_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model

def get_base64_img(img_array):
    """Convert numpy array to base64 string for API delivery"""
    # RGB to BGR for cv2 encoding
    if img_array.ndim == 3 and img_array.shape[2] == 3:
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    else:
        img_bgr = img_array
        
    _, buffer = cv2.imencode('.png', img_bgr)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{b64_str}"

def predict_dr(image_bytes):
    # 1. Preprocess
    orig_img_resized, tensor = preprocess_image(image_bytes)
    
    # 2. Model & XAI setup
    model = get_model()
    cam_extractor = GradCAM(model)
    
    # 3. Generate CAM and Prediction
    heatmap, pred_class, probs = cam_extractor.generate(tensor)
    confidence = torch.max(probs).item() * 100
    
    # Since we are using an untrained top layer for the hackathon template, 
    # to demonstrate the UI effectively we can mock a more varied confidence. 
    # Real weights would provide real probabilities.
    
    # 4. Generate visual outputs
    heatmap_colored, overlay = overlay_heatmap(orig_img_resized, heatmap)
    
    # 5. Risk mapping
    severity, risk_level, message = get_risk_mapping(pred_class)
    
    # Convert images to base64
    return {
        "class": pred_class,
        "severity": severity,
        "confidence": confidence,
        "risk": risk_level,
        "message": message,
        "original_cv": orig_img_resized,
        "heatmap": get_base64_img(heatmap_colored),
        "overlay": get_base64_img(overlay)
    }
