import cv2
import numpy as np
from PIL import Image
from torchvision import transforms

def crop_image_from_gray(img, tol=7):
    """
    Crop the black borders of fundus images to optimize visibility.
    """
    if img.ndim == 2:
        mask = img > tol
        return img[np.ix_(mask.any(1), mask.any(0))]
    elif img.ndim == 3:
        gray_img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        mask = gray_img > tol
        check_shape = img[:,:,0][np.ix_(mask.any(1), mask.any(0))].shape[0]
        if check_shape == 0:
            return img
        else:
            img1 = img[:,:,0][np.ix_(mask.any(1), mask.any(0))]
            img2 = img[:,:,1][np.ix_(mask.any(1), mask.any(0))]
            img3 = img[:,:,2][np.ix_(mask.any(1), mask.any(0))]
            img = np.stack([img1, img2, img3], axis=-1)
        return img
    return img

def apply_clahe(img):
    """
    Apply Contrast Limited Adaptive Histogram Equalization (CLAHE).
    """
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    if img.ndim == 3:
        lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        l2 = clahe.apply(l)
        lab = cv2.merge((l2, a, b))
        img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    return img

def preprocess_image(image_bytes):
    """
    Preprocess image bytes into an RGB image array and a PyTorch tensor ready for EfficientNet.
    Requirements: 300x300, ImageNet mean/std.
    Returns:
       numpy arrays for original and processed image display
       tensor for model inference
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
    
    # 1. Crop black borders
    cropped_img = crop_image_from_gray(image_rgb)
    
    # 2. CLAHE (optional but requested)
    enhanced_img = apply_clahe(cropped_img)
    
    # 3. Resize to 300x300 for EfficientNet-B3
    resized_img = cv2.resize(enhanced_img, (300, 300))
    
    # 4. Torch transforms (Normalization)
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    img_pil = Image.fromarray(resized_img)
    tensor = transform(img_pil).unsqueeze(0) # [1, 3, 300, 300]
    
    return resized_img, tensor
