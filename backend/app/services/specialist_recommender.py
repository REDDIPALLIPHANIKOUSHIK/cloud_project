"""
Specialist Recommendation Service
Deterministically maps model results, patient symptoms, and vital sign indicators
to appropriate medical specialists with structured reasoning and clinical disclaimers.
"""

from typing import List, Optional
from backend.app.schemas.prediction import SpecialistRecommendation, HeartDiseaseInput


def recommend_specialist(
    predicted_risk: bool,
    risk_category: str,
    probability: float,
    clinical_input: HeartDiseaseInput,
    reported_symptoms: Optional[List[str]] = None,
    is_emergency: bool = False
) -> SpecialistRecommendation:
    """
    Generate tailored medical specialty routing recommendation.
    """
    symptoms = [s.lower() for s in (reported_symptoms or [])]
    symptoms_text = " ".join(symptoms)
    if clinical_input.additional_notes:
        symptoms_text += " " + clinical_input.additional_notes.lower()

    based_on = ["trained_ml_model_prediction"]

    if is_emergency:
        return SpecialistRecommendation(
            specialty="Emergency Medicine / Acute Cardiac Care",
            reason="Acute red-flag clinical signs detected requiring immediate emergency medical evaluation.",
            basedOn=["acute_emergency_safety_check", "patient_reported_symptoms"],
            urgency="immediate",
            disclaimer="Emergency situation. Do not schedule an elective outpatient appointment; contact emergency services immediately."
        )

    # 1. Cardiovascular Risk detected by ML model or prominent cardiac markers
    if predicted_risk or risk_category in ["Elevated Risk", "High Risk"]:
        based_on.append("cardiovascular_risk_stratification")
        if clinical_input.cp in [1, 2]:
            based_on.append("reported_angina_symptoms")
        if clinical_input.trestbps >= 140:
            based_on.append("stage_2_hypertension")

        urgency_level = "priority" if risk_category == "High Risk" else "routine"
        reason = (
            f"The validated predictive model indicates an {risk_category.lower()} of cardiovascular disease "
            f"(calibrated risk factor index: {probability * 100:.1f}%). A cardiologist can perform comprehensive "
            "evaluations including echocardiogram, exercise stress testing, or coronary calcium scoring."
        )

        return SpecialistRecommendation(
            specialty="Cardiologist",
            reason=reason,
            basedOn=based_on,
            urgency=urgency_level,
            disclaimer="This is an informational referral suggestion based on structured statistical modeling, not a confirmed clinical diagnosis."
        )

    # 2. Check for Specific Symptom Clusters when Cardiovascular Risk is Low/Moderate
    # Respiratory Symptoms
    if any(k in symptoms_text for k in ["cough", "wheez", "shortness of breath", "asthma", "sputum", "phlegm"]):
        return SpecialistRecommendation(
            specialty="Pulmonologist",
            reason="Patient reported persistent respiratory symptoms (e.g., dyspnea, wheezing, cough) requiring lung function testing.",
            basedOn=["patient_reported_symptoms", "respiratory_evaluation"],
            urgency="routine",
            disclaimer="Informational referral recommendation. Please consult a physician for diagnostic confirmation."
        )

    # Metabolic / Endocrine (Elevated FBS or diabetic history)
    if clinical_input.fbs == 1.0 or any(k in symptoms_text for k in ["sugar", "diabet", "thirst", "frequent urination"]):
        return SpecialistRecommendation(
            specialty="Endocrinologist / Diabetologist",
            reason="Fasting blood sugar is elevated (> 120 mg/dl) or glycemic symptoms were noted, suggesting metabolic evaluation.",
            basedOn=["elevated_fasting_blood_glucose", "metabolic_profile"],
            urgency="routine",
            disclaimer="Informational referral recommendation. Requires standard HbA1c and glucose tolerance lab testing."
        )

    # Neurological Symptoms
    if any(k in symptoms_text for k in ["dizz", "vertigo", "headache", "migraine", "tremor", "seizure"]):
        return SpecialistRecommendation(
            specialty="Neurologist",
            reason="Patient reported neurological complaints (e.g., persistent dizziness, recurring headaches) requiring specialist review.",
            basedOn=["patient_reported_symptoms", "neurological_complaints"],
            urgency="routine",
            disclaimer="Informational referral recommendation. Please consult a physician for clinical examination."
        )

    # Musculoskeletal Symptoms
    if any(k in symptoms_text for k in ["joint", "knee", "back pain", "arthritis", "bone", "spine"]):
        return SpecialistRecommendation(
            specialty="Orthopedist",
            reason="Musculoskeletal symptoms reported requiring physical and radiographic bone/joint evaluation.",
            basedOn=["patient_reported_symptoms", "musculoskeletal_complaints"],
            urgency="routine",
            disclaimer="Informational referral recommendation."
        )

    # Gastrointestinal Symptoms
    if any(k in symptoms_text for k in ["stomach", "acid", "gastric", "reflux", "vomit", "nausea", "abdomen"]):
        return SpecialistRecommendation(
            specialty="Gastroenterologist",
            reason="Digestive and gastrointestinal symptoms noted requiring abdominal clinical workup.",
            basedOn=["patient_reported_symptoms", "gastrointestinal_complaints"],
            urgency="routine",
            disclaimer="Informational referral recommendation."
        )

    # Dermatology Symptoms
    if any(k in symptoms_text for k in ["rash", "itching", "eczema", "skin", "lesion", "psoriasis"]):
        return SpecialistRecommendation(
            specialty="Dermatologist",
            reason="Cutaneous complaints reported requiring dermatological inspection.",
            basedOn=["patient_reported_symptoms", "dermatological_complaints"],
            urgency="routine",
            disclaimer="Informational referral recommendation."
        )

    # Default / Preventive / Routine Primary Care
    return SpecialistRecommendation(
        specialty="General Physician / Primary Care Clinician",
        reason="Model screening indicates low immediate cardiovascular risk. A primary care physician is recommended for routine wellness checkups, lifestyle counseling, and holistic health monitoring.",
        basedOn=["low_risk_classification", "routine_clinical_evaluation"],
        urgency="routine",
        disclaimer="AI-generated results are intended for educational and clinical decision-support purposes only. They are not a medical diagnosis and must not replace consultation with a qualified healthcare professional."
    )
