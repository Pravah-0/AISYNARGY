def get_risk_mapping(dr_class_idx):
    """
    Maps the DR severity class into a clinical risk category and patient-friendly recommendation.
    Classes:
    0 -> No DR
    1 -> Mild NPDR
    2 -> Moderate NPDR
    3 -> Severe NPDR
    4 -> Proliferative DR
    """
    classes = {
        0: "No DR",
        1: "Mild NPDR",
        2: "Moderate NPDR",
        3: "Severe NPDR",
        4: "Proliferative DR"
    }
    
    severity_name = classes.get(dr_class_idx, "Unknown")
    
    if dr_class_idx == 0:
        risk_level = "Low"
        message = "No immediate concern. Continue regular checkups."
    elif dr_class_idx in [1, 2]:
        risk_level = "Moderate"
        message = "Moderate risk — consult an ophthalmologist within 3 months."
    elif dr_class_idx in [3, 4]:
        risk_level = "High"
        message = "High risk — urgent specialist consultation recommended."
    else:
        risk_level = "Unknown"
        message = "Invalid class prediction."

    return severity_name, risk_level, message
