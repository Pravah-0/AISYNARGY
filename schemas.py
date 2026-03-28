from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ScreeningBase(BaseModel):
    patient_id: str
    patient_name: str
    severity: str
    risk: str
    confidence: float
    message: str

class ScreeningCreate(ScreeningBase):
    pass

class ScreeningResponse(ScreeningBase):
    id: int
    date: datetime
    doctor_id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None
