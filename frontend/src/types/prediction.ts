export interface HeartDiseaseInputForm {
  age: number;
  sex: number; // 1 = Male, 0 = Female
  cp: number; // 1 = Typical, 2 = Atypical, 3 = Non-anginal, 4 = Asymptomatic
  trestbps: number; // Resting BP (mm Hg)
  chol: number; // Serum cholesterol (mg/dl)
  fbs: number; // 1 = >120mg/dl, 0 = <=120mg/dl
  restecg: number; // 0 = Normal, 1 = ST-T wave, 2 = LVH
  thalach: number; // Max heart rate
  exang: number; // Exercise angina (1 = Yes, 0 = No)
  oldpeak: number; // ST depression
  slope: number; // 1 = Upsloping, 2 = Flat, 3 = Downsloping
  ca: number; // 0 - 3 major vessels
  thal: number; // 3 = Normal, 6 = Fixed defect, 7 = Reversible defect
  reported_symptoms?: string[];
  additional_notes?: string;
  patientId?: string;
}

export interface EmergencyCheckResult {
  is_emergency: boolean;
  urgent_warning?: string | null;
  action_required?: string | null;
  emergency_contact: string;
  detected_flags: string[];
}

export interface SpecialistRecommendation {
  specialty: string;
  reason: string;
  basedOn: string[];
  urgency: 'routine' | 'priority' | 'immediate';
  disclaimer: string;
}

export interface PredictionResponse {
  predictionId: string;
  patientId: string;
  modelName: string;
  modelVersion: string;
  inputFeatureSummary: Record<string, number>;
  predictedCondition: string;
  hasDiseaseRisk: boolean;
  riskCategory: 'Low Risk' | 'Moderate Risk' | 'Elevated Risk' | 'High Risk';
  probability: number;
  specialistRecommendation: SpecialistRecommendation;
  emergencyAlert?: EmergencyCheckResult;
  warnings: string[];
  disclaimer: string;
  createdAt: string;
}
