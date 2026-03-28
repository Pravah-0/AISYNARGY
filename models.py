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
    
    screenings = relationship("Screening", back_populates="doctor")

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
    doctor = relationship("User", back_populates="screenings")
