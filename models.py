from sqlalchemy import Boolean, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="doctor") # doctor or patient
    age = Column(Integer, nullable=True)
    diabetes_type = Column(String, nullable=True) # Type 1, Type 2, None
    
    screenings = relationship("Screening", foreign_keys="Screening.doctor_id", back_populates="doctor")
    personal_screenings = relationship("Screening", foreign_keys="Screening.patient_user_id", back_populates="patient_user")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    patient_name = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    severity = Column(String)
    risk = Column(String)
    confidence = Column(Float)
    message = Column(String)
    
    doctor_id = Column(Integer, ForeignKey("users.id"))
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="screenings")
    
    patient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_user = relationship("User", foreign_keys=[patient_user_id], back_populates="personal_screenings")
