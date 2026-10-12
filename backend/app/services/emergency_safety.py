"""
Emergency Safety Layer
Conservative, rule-based screening for life-threatening acute signs.
Operates completely independent of the statistical machine learning model.
Does not allow ML outputs to downgrade an identified medical emergency.
"""

from typing import List, Dict, Any, Optional
from backend.app.schemas.prediction import EmergencyCheckResult, HeartDiseaseInput

# Emergency keywords indicating acute critical conditions
CRITICAL_EMERGENCY_SYMPTOMS = {
    "crushing chest pain": "Crushing, squeezing, or heavy chest pain (potential acute coronary syndrome)",
    "chest pain radiating": "Chest pain radiating to left arm, neck, jaw, or back",
    "severe shortness of breath": "Acute severe shortness of breath or inability to speak in full sentences",
    "difficulty breathing at rest": "Severe dyspnea at rest",
    "loss of consciousness": "Syncope, fainting, or sudden collapse",
    "fainting": "Sudden loss of consciousness or severe blackouts",
    "stroke signs": "Signs of acute stroke (FAST: Facial drooping, Arm weakness, Slurred speech)",
    "facial drooping": "Sudden facial weakness or drooping",
    "slurred speech": "Acute slurring of speech or inability to express words",
    "coughing blood": "Hemoptysis (coughing up blood)",
    "sudden numbness": "Sudden unilateral paralysis or numbness of limbs"
}


def check_emergency_safety(
    clinical_input: HeartDiseaseInput,
    reported_symptoms: Optional[List[str]] = None
) -> EmergencyCheckResult:
    """
    Evaluate rule-based clinical emergency red flags.
    Returns EmergencyCheckResult with emergency flag, warning message, and action required.
    """
    flags = []
    reasons = []

    # 1. Symptom string scanning
    all_symptom_text = " ".join(reported_symptoms or []).lower()
    if clinical_input.additional_notes:
        all_symptom_text += " " + clinical_input.additional_notes.lower()

    for keyword, explanation in CRITICAL_EMERGENCY_SYMPTOMS.items():
        if keyword in all_symptom_text:
            flags.append(keyword)
            reasons.append(explanation)

    # 2. Objective Vital Sign Emergency Triggers
    # Severe Hypertensive Crisis (SBP >= 180 or DBP >= 120 equivalent resting pressure)
    if clinical_input.trestbps >= 180:
        flags.append("hypertensive_urgency_crisis")
        reasons.append(f"Severely elevated resting blood pressure ({clinical_input.trestbps:.0f} mm Hg) indicates possible hypertensive crisis.")

    # Severe Resting Tachycardia / Bradycardia
    if clinical_input.thalach > 190:
        flags.append("extreme_tachycardia")
        reasons.append(f"Extremely high heart rate recorded ({clinical_input.thalach:.0f} bpm).")

    # Acute ST depression with typical angina and exercise induction
    if clinical_input.oldpeak >= 3.5 and clinical_input.cp == 1 and clinical_input.exang == 1:
        flags.append("severe_ischemia_marker")
        reasons.append("Severe electrocardiographic ST depression (>= 3.5mm) accompanied by typical angina indicates high risk acute myocardial ischemia.")

    is_emergency = len(flags) > 0

    if is_emergency:
        warning_msg = (
            "CRITICAL EMERGENCY ALERT: One or more severe medical warning signs detected: "
            + "; ".join(reasons)
        )
        action_msg = (
            "DO NOT DELAY: Immediately contact national emergency medical services (dial 112 in India, 911 in US) "
            "or proceed to the nearest hospital Emergency Department immediately. Do not drive yourself."
        )
        return EmergencyCheckResult(
            is_emergency=True,
            urgent_warning=warning_msg,
            action_required=action_msg,
            emergency_contact="112",
            detected_flags=flags
        )

    return EmergencyCheckResult(
        is_emergency=False,
        urgent_warning=None,
        action_required=None,
        emergency_contact="112",
        detected_flags=[]
    )
