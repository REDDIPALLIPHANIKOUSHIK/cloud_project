import { HeartDiseaseInputForm, PredictionResponse } from '../types/prediction';
import { UserProfile, UserRole } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('hc_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('hc_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('hc_auth_token');
}

// -------------------------------------------------------------
// CORE REQUEST DISPATCHER (STRICT REAL API - NO FAKE FALLBACKS)
// -------------------------------------------------------------

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    throw new Error(
      `Unable to reach the healthcare backend at ${url}. Please ensure the Python API server is running.`
    );
  }

  if (response.ok) {
    if (response.status === 204) return {} as T;
    return await response.json();
  }

  if (response.status === 405) {
    throw new Error(
      'Backend connection error (405 Method Not Allowed): The API request reached a static host instead of the Flask API. If running locally, please start the backend with "python backend/run.py" on port 5000. If deployed on Vercel, set VITE_API_BASE_URL to your deployed Python backend URL.'
    );
  }

  // Parse server error response
  let errorMsg = `Server error (${response.status})`;
  try {
    const errorJson = await response.json();
    errorMsg = errorJson.message || errorJson.error || errorMsg;
    if (errorJson.details && Array.isArray(errorJson.details)) {
      const fieldErrors = errorJson.details
        .map((d: any) => `${d.loc ? d.loc.join('.') : 'field'}: ${d.msg}`)
        .join('; ');
      errorMsg += ` (${fieldErrors})`;
    }
  } catch {
    errorMsg = response.statusText || errorMsg;
  }

  throw new Error(errorMsg);
}

// -------------------------------------------------------------
// API CLIENT SERVICE
// -------------------------------------------------------------

export const api = {
  // System Health
  async getHealth(): Promise<any> {
    return request('/health');
  },

  // Authentication & Session
  async loginUser(email: string, password: string): Promise<{ token: string; user: UserProfile; profile?: any }> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async registerUser(payload: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    phone?: string;
    specialization?: string;
    medicalLicenseNumber?: string;
    hospitalAffiliation?: string;
    yearsOfExperience?: number;
    bio?: string;
  }): Promise<{ token: string; user: UserProfile; profile?: any }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getMe(): Promise<{ user: UserProfile; profile: any }> {
    return request('/me');
  },

  async syncUser(payload: any): Promise<{ user: UserProfile }> {
    return request('/sync-user', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Patient Profile
  async getPatientProfile(patientId?: string): Promise<any> {
    return request('/patients/me');
  },

  async updatePatientProfile(data: any): Promise<any> {
    return request('/patients/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Doctor Profile
  async getDoctorProfile(): Promise<any> {
    return request('/doctor/profile/me');
  },

  async updateDoctorProfile(data: any): Promise<any> {
    return request('/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Medical Records
  async createMedicalRecord(record: any): Promise<any> {
    return request('/medical-records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  async getMedicalRecords(patientId?: string): Promise<{ count: number; records: any[] }> {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return request(`/medical-records${query}`);
  },

  async deleteMedicalRecord(recordId: string): Promise<{ message: string }> {
    return request(`/medical-records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
    });
  },

  // Machine Learning Disease Prediction
  async predictHeartDisease(input: HeartDiseaseInputForm, patientId?: string): Promise<PredictionResponse> {
    return request<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        patientId,
      }),
    });
  },

  async runPrediction(input: HeartDiseaseInputForm, patientId?: string): Promise<PredictionResponse> {
    return this.predictHeartDisease(input, patientId);
  },

  async getPredictionHistory(patientId?: string): Promise<{ count: number; predictions: PredictionResponse[] }> {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return request(`/predictions${query}`);
  },

  async getPredictions(patientId?: string): Promise<{ count: number; predictions: PredictionResponse[] }> {
    return this.getPredictionHistory(patientId);
  },

  async getPredictionDetail(predictionId: string): Promise<PredictionResponse> {
    return request(`/predictions/${encodeURIComponent(predictionId)}`);
  },

  // Document Management & Uploads
  async listReports(patientId?: string): Promise<{ count: number; reports: any[] }> {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return request(`/reports${query}`);
  },

  async getReports(patientId?: string): Promise<{ count: number; reports: any[] }> {
    return this.listReports(patientId);
  },

  async uploadReportFile(file: File, description: string, patientId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    if (patientId) formData.append('patientId', patientId);

    return request('/reports/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async createReportMetadata(payload: any): Promise<any> {
    return request('/reports/metadata', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteReport(reportId: string): Promise<{ message: string }> {
    return request(`/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
    });
  },

  async downloadReportFile(reportId: string, fileName: string): Promise<void> {
    const url = `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/download`;
    const token = getAuthToken();

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Failed to download report (${response.status}: ${response.statusText})`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || `Medical_Report_${reportId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  getDownloadSummaryUrl(patientId?: string): string {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return `${API_BASE_URL}/reports/summary/download${query}`;
  },

  async downloadClinicalSummary(patientId?: string): Promise<void> {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    const url = `${API_BASE_URL}/reports/summary/download${query}`;
    const token = getAuthToken();

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Failed to generate clinical summary (${response.status})`);
    }

    const text = await response.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Health_Summary_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  // Doctor Access Management
  async getDoctorDirectory(): Promise<{ count: number; doctors: any[] }> {
    return request('/doctor/directory');
  },

  async grantDoctorAccess(doctorId: string, purpose: string = 'Clinical evaluation'): Promise<any> {
    return request('/doctor-access', {
      method: 'POST',
      body: JSON.stringify({ doctorId, purpose }),
    });
  },

  async revokeDoctorAccess(accessId: string): Promise<{ message: string }> {
    return request(`/doctor-access/${encodeURIComponent(accessId)}`, {
      method: 'DELETE',
    });
  },

  async getMyDoctorGrants(): Promise<{ grants: any[] }> {
    return request('/patient/doctor-grants');
  },

  // Doctor Patient Management
  async getAuthorizedPatients(): Promise<{ count: number; patients: any[] }> {
    return request('/doctor/patients');
  },

  async getAuthorizedPatientDetail(patientId: string): Promise<any> {
    return request(`/doctor/patients/${encodeURIComponent(patientId)}`);
  },

  async createClinicalNote(payload: {
    patientId: string;
    content: string;
    diagnosis?: string;
    prescriptions?: string;
    followUpDate?: string;
  }): Promise<any> {
    return request('/clinical-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyClinicalNotes(): Promise<{ count: number; notes: any[] }> {
    return request('/doctor/notes');
  },

  // Administrator Operations
  async getAdminStats(): Promise<any> {
    return request('/admin/stats');
  },

  async getAdminUsers(): Promise<{ count: number; users: any[] }> {
    return request('/admin/users');
  },

  async updateUserRole(
    uid: string,
    payload: {
      role: UserRole;
      verificationStatus?: string;
      accountStatus?: string;
    }
  ): Promise<any> {
    return request(`/admin/users/${encodeURIComponent(uid)}/role`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminAuditLogs(limit: number = 100): Promise<{ count: number; logs: any[] }> {
    return request(`/admin/audit-logs?limit=${encodeURIComponent(limit)}`);
  },

  async getAuditLogs(limit: number = 100): Promise<{ count: number; logs: any[] }> {
    return this.getAdminAuditLogs(limit);
  },
};
