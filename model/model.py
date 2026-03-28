import torch
import torch.nn as nn
import timm
import os

def load_model():
    """
    Load the pretrained EfficientNet-B3 Diabetic Retinopathy prediction model.
    Configured for 5 classes (0: No DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative)
    """
    print("Loading EfficientNet-B3 Model ...")
    model = timm.create_model('efficientnet_b3', pretrained=True, num_classes=5)
    
    # In a real deployed environment, you would load the specific finetuned HF checkpoint here:
    # state_dict = torch.load('path_to_dr_weights.pth', map_location='cpu')
    # model.load_state_dict(state_dict)
    
    model.eval() # Set to inference mode
    return model
