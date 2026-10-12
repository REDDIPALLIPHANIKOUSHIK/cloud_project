export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weightKg?: number;
  heightCm?: number;
}

export interface MedicalRecord {
  recordId: string;
  patientId: string;
  createdBy: string;
  creatorRole: string;
  symptoms: string[];
  medicalHistory: string[];
  familyHistory: string[];
  allergies: string[];
  medications: string[];
  vitalSigns?: VitalSigns;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LabReport {
  reportId: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  description: string;
  uploadedBy: string;
  uploaderRole: string;
  uploadedAt: string;
}

export interface DoctorAccessGrant {
  accessId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  purpose?: string;
  status: 'active' | 'revoked';
  grantedBy: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface ClinicalNote {
  noteId: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  specialization?: string;
  content: string;
  diagnosis?: string;
  prescriptions?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  eventId: string;
  actorUid: string;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
