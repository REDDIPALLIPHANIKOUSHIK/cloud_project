const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getAuthToken(): string {
  return localStorage.getItem('hc_auth_token') || 'demo-patient';
}

export function setAuthToken(token: string) {
  localStorage.setItem('hc_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('hc_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    const errorMsg = errorData.message || errorData.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // System Health
  getHealth: () => request<any>('/health'),

  // Auth & Profile
  getMe: () => request<{ user: any; profile: any }>('/me'),
  syncUser: (data: any) => request<any>('/sync-user', { method: 'POST', body: JSON.stringify(data) }),

  // Patient Records
  getPatientProfile: () => request<any>('/patients/me'),
  updatePatientProfile: (data: any) => request<any>('/patients/me', { method: 'PUT', body: JSON.stringify(data) }),
  createMedicalRecord: (data: any) => request<any>('/medical-records', { method: 'POST', body: JSON.stringify(data) }),
  getMedicalRecords: (patientId?: string) => request<{ count: number; records: any[] }>(patientId ? `/medical-records?patientId=${patientId}` : '/medical-records'),

  // Machine Learning Prediction
  runPrediction: (data: any) => request<any>('/predict', { method: 'POST', body: JSON.stringify(data) }),
  getPredictions: (patientId?: string) => request<{ count: number; predictions: any[] }>(patientId ? `/predictions?patientId=${patientId}` : '/predictions'),
  getPredictionDetail: (id: string) => request<any>(`/predictions/${id}`),

  // Documents & Lab Reports
  createReportMetadata: (data: any) => request<any>('/reports/metadata', { method: 'POST', body: JSON.stringify(data) }),
  getReports: (patientId?: string) => request<{ count: number; reports: any[] }>(patientId ? `/reports?patientId=${patientId}` : '/reports'),
  deleteReport: (id: string) => request<any>(`/reports/${id}`, { method: 'DELETE' }),
  getDownloadSummaryUrl: (patientId?: string) => `${API_BASE_URL}/reports/summary/download${patientId ? `?patientId=${patientId}` : ''}`,

  // Doctor Access & Sharing
  getDoctorDirectory: () => request<{ count: number; doctors: any[] }>('/doctor/directory'),
  grantDoctorAccess: (doctorId: string, purpose?: string) =>
    request<any>('/doctor-access', { method: 'POST', body: JSON.stringify({ doctorId, purpose }) }),
  revokeDoctorAccess: (accessId: string) =>
    request<any>(`/doctor-access/${accessId}`, { method: 'DELETE' }),
  getMyDoctorGrants: () => request<{ grants: any[] }>('/patient/doctor-grants'),

  // Doctor Portal
  getAuthorizedPatients: () => request<{ count: number; patients: any[] }>('/doctor/patients'),
  getAuthorizedPatientDetail: (patientId: string) => request<any>(`/doctor/patients/${patientId}`),
  createClinicalNote: (data: any) => request<any>('/clinical-notes', { method: 'POST', body: JSON.stringify(data) }),
  getMyClinicalNotes: () => request<{ count: number; notes: any[] }>('/doctor/notes'),

  // Admin Portal
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: () => request<{ count: number; users: any[] }>('/admin/users'),
  updateUserRole: (uid: string, data: any) => request<any>(`/admin/users/${uid}/role`, { method: 'POST', body: JSON.stringify(data) }),
  getAdminAuditLogs: (limit = 100) => request<{ count: number; logs: any[] }>(`/admin/audit-logs?limit=${limit}`),
};
