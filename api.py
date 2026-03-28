from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from jose import JWTError, jwt

from model.inference import predict_dr
import uvicorn
import models, schemas, auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Retina Ai - Sight Decoded API", description="Diabetic Retinopathy Detection using EfficientNet-B3")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "Operational (99.1% Acc.)", "model": "EfficientNet-B3 (HF weights)"}

@app.post("/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email, 
        name=user.name, 
        hashed_password=hashed_password,
        role=user.role,
        age=user.age,
        diabetes_type=user.diabetes_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if user is None or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/screenings", response_model=list[schemas.ScreeningResponse])
def read_screenings(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        query = db.query(models.Screening).filter(models.Screening.doctor_id == current_user.id)
    else:
        query = db.query(models.Screening).filter(models.Screening.patient_user_id == current_user.id)
    
    screenings = query.order_by(models.Screening.id.desc()).offset(skip).limit(limit).all()
    return screenings

@app.post("/predict")
async def predict_endpoint(file: UploadFile = File(...), patient_name: str = Form(None), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Accepts an image file and returns prediction + base64 encoded XAI heatmaps.
    Saves to the database tied to the logged-in user.
    """
    try:
        image_bytes = await file.read()
        results = predict_dr(image_bytes)
        
        # Remove original_cv as we don't need to send the raw numpy array over REST
        del results['original_cv']
        
        # Save to DB
        is_patient = current_user.role == "patient"
        final_patient_name = patient_name if (patient_name and not is_patient) else (current_user.name if is_patient else "Anonymous Patient")
        
        new_screening = models.Screening(
            patient_id="SR-" + str(int(datetime.now().timestamp() % 10000)),
            patient_name=final_patient_name,
            severity=results["severity"],
            risk=results["risk"],
            confidence=results["confidence"],
            message=results["message"],
            doctor_id=None if is_patient else current_user.id,
            patient_user_id=current_user.id if is_patient else None
        )
        db.add(new_screening)
        db.commit()
        db.refresh(new_screening)
        
        return results
    except Exception as e:
        return {"error": str(e)}, 500

# Mount standard frontend static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
