import torch
import torch.nn.functional as F
import numpy as np
import cv2

class GradCAM:
    def __init__(self, model, target_layer_name='conv_head'):
        """
        Grad-CAM implementation for EfficientNet using PyTorch
        """
        self.model = model
        self.target_layer_name = target_layer_name
        self.gradients = None
        self.activations = None
        
        # Register hooks for the target layer
        self._register_hooks()

    def _register_hooks(self):
        # Find the target layer dynamically. For timm's efficientnet, it's typically 'conv_head' or earlier blocks.
        target_layer = dict([*self.model.named_modules()]).get(self.target_layer_name)
        if target_layer is None:
            # Fallback to the last feature extraction layer before the classifier
            target_layer = list(self.model.children())[-3] # Usually the last conv block

        target_layer.register_forward_hook(self.save_activation)
        target_layer.register_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        # grad_output is a tuple containing the gradients
        self.gradients = grad_output[0]

    def generate(self, input_tensor, target_class=None):
        self.model.zero_grad()
        
        output = self.model(input_tensor)
        
        if target_class is None:
            target_class = output.argmax(dim=1).item()
            
        # Target the score of the predicted class
        score = output[0, target_class]
        score.backward(retain_graph=True)
        
        gradients = self.gradients[0].cpu().data.numpy()
        activations = self.activations[0].cpu().data.numpy()
        
        # Global average pooling on the gradients
        weights = np.mean(gradients, axis=(1, 2))
        
        # Multiply activations by weights
        cam = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * activations[i]
            
        # Apply ReLU to cam
        cam = np.maximum(cam, 0)
        
        # Normalize between 0 and 1
        cam = cam - np.min(cam)
        cam = cam / (np.max(cam) + 1e-8)
        
        return cam, target_class, F.softmax(output, dim=1).detach()

def overlay_heatmap(img_cv, heatmap_np, alpha=0.5, colormap=cv2.COLORMAP_JET):
    """
    Overlays Grad-CAM heatmap on the original image.
    """
    heatmap_resized = cv2.resize(heatmap_np, (img_cv.shape[1], img_cv.shape[0]))
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap_resized), colormap)
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    
    overlay = cv2.addWeighted(img_cv, 1 - alpha, heatmap_colored, alpha, 0)
    return heatmap_colored, overlay
