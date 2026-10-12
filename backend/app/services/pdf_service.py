"""
Clinical Report Generation Service
Generates structured text/markdown and downloadable medical summaries
comprising patient details, vital signs, AI model decision support, and disclaimers.
"""

from typing import Dict, Any, List, Optional
import datetime


def generate_clinical_summary_text(
    patient: Dict[str, Any],
    records: List[Dict[str, Any]],
    predictions: List[Dict[str, Any]],
    requester_role: str = "patient"
) -> str:
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    lines = [
        "=" * 70,
        "   CLOUD-BASED HEALTHCARE DATA MANAGEMENT SYSTEM",
        "        CLINICAL DECISION-SUPPORT HEALTH SUMMARY",
        "=" * 70,
        f"Generated At: {now_str}",
        f"Generated For Role: {requester_role.upper()}",
        "",
        "--- PATIENT DEMOGRAPHICS ---",
        f"Patient ID:     {patient.get('patientId', patient.get('userId', 'Unknown'))}",
        f"Full Name:      {patient.get('fullName', 'Confidential Patient')}",
        f"Gender:         {patient.get('gender', 'Not Specified')}",
        f"Date of Birth:  {patient.get('dateOfBirth', 'Not Specified')}",
        f"Blood Group:    {patient.get('bloodGroup', 'Not Specified')}",
        "",
        "--- RECENT CLINICAL VITALS & MEDICAL RECORDS ---"
    ]

    if not records:
        lines.append("No recorded medical entries on file.")
    else:
        for idx, rec in enumerate(records[:3], 1):
            lines.append(f"Record #{idx} ({rec.get('createdAt', 'Unknown Date')}):")
            lines.append(f"  Symptoms:     {', '.join(rec.get('symptoms', [])) or 'None reported'}")
            lines.append(f"  Allergies:    {', '.join(rec.get('allergies', [])) or 'NKDA (None)'}")
            lines.append(f"  Medications:  {', '.join(rec.get('medications', [])) or 'None'}")
            vitals = rec.get("vitalSigns", {})
            if vitals:
                bp = f"{vitals.get('bloodPressureSystolic', '-')}/{vitals.get('bloodPressureDiastolic', '-')} mmHg"
                hr = f"{vitals.get('heartRate', '-')} bpm"
                spo2 = f"{vitals.get('oxygenSaturation', '-')}%"
                lines.append(f"  Vitals:       BP: {bp} | HR: {hr} | SpO2: {spo2}")
            lines.append("")

    lines.append("--- AI-POWERED CLINICAL PREDICTION HISTORY ---")
    if not predictions:
        lines.append("No machine learning predictions recorded.")
    else:
        for idx, pred in enumerate(predictions[:3], 1):
            recom = pred.get("specialistRecommendation", {})
            lines.append(f"Prediction #{idx} ({pred.get('createdAt', 'Unknown Date')}):")
            lines.append(f"  Model:                 {pred.get('modelName', 'Ensemble')} v{pred.get('modelVersion', '1.0')}")
            lines.append(f"  Evaluated Condition:   {pred.get('predictedCondition', 'Cardiovascular Risk')}")
            lines.append(f"  Assessed Risk Tier:    {pred.get('riskCategory', 'Unspecified')}")
            lines.append(f"  Risk Index:            {float(pred.get('probability', 0.0)) * 100:.1f}%")
            lines.append(f"  Recommended Specialty: {recom.get('specialty', 'General Physician')}")
            lines.append(f"  Clinical Rationale:    {recom.get('reason', 'Routine screening')}")
            lines.append(f"  Consultation Urgency:  {recom.get('urgency', 'routine').upper()}")
            lines.append("")

    lines.extend([
        "=" * 70,
        "IMPORTANT CLINICAL & LEGAL DISCLAIMER:",
        "AI-generated results are intended for educational and clinical decision-",
        "support purposes only. They are not a medical diagnosis and must not",
        "replace consultation with a qualified healthcare professional.",
        "Seek emergency medical care (Dial 112 / 911) for severe symptoms.",
        "=" * 70
    ])

    return "\n".join(lines)
