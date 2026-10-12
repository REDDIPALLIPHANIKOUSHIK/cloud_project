from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class VitalSigns(BaseModel):
    bloodPressureSystolic: Optional[float] = Field(None, ge=50, le=300)
    bloodPressureDiastolic: Optional[float] = Field(None, ge=30, le=200)
    heartRate: Optional[float] = Field(None, ge=30, le=250)
    temperature: Optional[float] = Field(None, ge=90, le=110)  # Fahrenheit
    respiratoryRate: Optional[float] = Field(None, ge=5, le=60)
    oxygenSaturation: Optional[float] = Field(None, ge=50, le=100)  # SpO2 %
    weightKg: Optional[float] = Field(None, ge=1, le=500)
    heightCm: Optional[float] = Field(None, ge=30, le=250)


class MedicalRecordCreate(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    medicalHistory: List[str] = Field(default_factory=list)
    familyHistory: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    medications: List[str] = Field(default_factory=list)
    vitalSigns: Optional[VitalSigns] = None
    notes: Optional[str] = Field("", max_length=2000)


class PatientProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    phone: Optional[str] = None
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
