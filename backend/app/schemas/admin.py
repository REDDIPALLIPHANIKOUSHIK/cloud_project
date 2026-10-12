from typing import Optional
from pydantic import BaseModel, Field


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(patient|doctor|admin)$")
    accountStatus: Optional[str] = Field("active", pattern="^(active|suspended|pending)$")
    verificationStatus: Optional[str] = Field(None, pattern="^(unverified|verified|rejected)$")
