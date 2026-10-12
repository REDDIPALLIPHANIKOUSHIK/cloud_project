export type UserRole = 'patient' | 'doctor' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'pending';
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientProfile {
  patientId: string;
  userId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
}

export interface DoctorProfile {
  doctorId: string;
  userId: string;
  fullName: string;
  specialization: string;
  medicalLicenseNumber?: string;
  hospitalAffiliation?: string;
  verificationStatus: 'unverified' | 'verified' | 'rejected';
  yearsOfExperience?: number;
  bio?: string;
  phone?: string;
}
