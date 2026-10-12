from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class HeartDiseaseInput(BaseModel):
    age: float = Field(..., ge=18.0, le=120.0, description="Age in years (18-120)")
    sex: float = Field(..., ge=0.0, le=1.0, description="Sex (1 = male, 0 = female)")
    cp: float = Field(..., ge=1.0, le=4.0, description="Chest pain type (1 = typical angina, 2 = atypical angina, 3 = non-anginal pain, 4 = asymptomatic)")
    trestbps: float = Field(..., ge=70.0, le=260.0, description="Resting blood pressure in mm Hg (70-260)")
    chol: float = Field(..., ge=100.0, le=600.0, description="Serum cholesterol in mg/dl (100-600)")
    fbs: float = Field(..., ge=0.0, le=1.0, description="Fasting blood sugar > 120 mg/dl (1 = true, 0 = false)")
    restecg: float = Field(..., ge=0.0, le=2.0, description="Resting ECG results (0 = normal, 1 = ST-T wave abnormality, 2 = LVH)")
    thalach: float = Field(..., ge=50.0, le=240.0, description="Maximum heart rate achieved (50-240)")
    exang: float = Field(..., ge=0.0, le=1.0, description="Exercise induced angina (1 = yes, 0 = no)")
    oldpeak: float = Field(..., ge=0.0, le=10.0, description="ST depression induced by exercise (0.0 - 10.0)")
    slope: float = Field(..., ge=1.0, le=3.0, description="Peak exercise ST slope (1 = upsloping, 2 = flat, 3 = downsloping)")
    ca: float = Field(..., ge=0.0, le=3.0, description="Major vessels colored by fluoroscopy (0-3)")
    thal: float = Field(..., ge=1.0, le=7.0, description="Thallium test (3 = normal, 6 = fixed defect, 7 = reversible defect)")

    # Optional clinical context
    reported_symptoms: Optional[List[str]] = Field(default_factory=list, description="Self-reported clinical symptoms")
    additional_notes: Optional[str] = Field(default="", max_length=500)


class EmergencyCheckResult(BaseModel):
    is_emergency: bool
    urgent_warning: Optional[str] = None
    action_required: Optional[str] = None
    emergency_contact: str = "112"
    detected_flags: List[str] = Field(default_factory=list)


class SpecialistRecommendation(BaseModel):
    specialty: str
    reason: str
    basedOn: List[str]
    urgency: str  # "routine" | "priority" | "immediate"
    disclaimer: str


class PredictionResponse(BaseModel):
    predictionId: str
    patientId: str
    modelName: str
    modelVersion: str
    inputFeatureSummary: Dict[str, Any]
    predictedCondition: str
    hasDiseaseRisk: bool
    riskCategory: str  # "Low Risk", "Moderate Risk", "Elevated Risk", "High Risk"
    probability: float
    specialistRecommendation: SpecialistRecommendation
    emergencyAlert: Optional[EmergencyCheckResult] = None
    warnings: List[str] = Field(default_factory=list)
    disclaimer: str
    createdAt: str
