from typing import Optional
from pydantic import BaseModel, Field


class DoctorAccessGrantRequest(BaseModel):
    doctorId: str = Field(..., description="Doctor UID to grant access to")
    purpose: Optional[str] = Field("Clinical evaluation", max_length=200)


class ClinicalNoteCreate(BaseModel):
    patientId: str = Field(..., description="Patient UID")
    content: str = Field(..., min_length=5, max_length=5000, description="Clinical diagnosis/observation notes")
    diagnosis: Optional[str] = Field(None, max_length=200)
    prescriptions: Optional[str] = Field(None, max_length=2000)
    followUpDate: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    specialization: Optional[str] = None
    medicalLicenseNumber: Optional[str] = None
    hospitalAffiliation: Optional[str] = None
    yearsOfExperience: Optional[int] = Field(None, ge=0, le=70)
    bio: Optional[str] = None
    phone: Optional[str] = None
