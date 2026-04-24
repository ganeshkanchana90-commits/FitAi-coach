import os
from datetime import datetime, timedelta
from typing import Optional
import base64
import requests

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
import google.generativeai as genai

from passlib.context import CryptContext
from jose import jwt

from database import engine, get_db
import models

# =========================
# LOAD ENV & CONFIG
# =========================
load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "fitai_premium_secret_777")
ALGORITHM = "HS256"

# =========================
# DATABASE TABLES CREATE
# =========================
models.Base.metadata.create_all(bind=engine)

# =========================
# GEMINI API CONFIG
# =========================
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-3-flash-preview")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

# =========================
# FASTAPI APP
# =========================
app = FastAPI(title="FitAI Coach Premium Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# REQUEST MODELS
# =========================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    message: str


class RoutineProfile(BaseModel):
    user_id: str = "default_user"
    name: Optional[str] = "User"
    age: Optional[int] = 20
    weight: Optional[float] = 60
    height: Optional[float] = 170
    gender: Optional[str] = "Male"
    workout_place: Optional[str] = "Home Workout"
    goal: Optional[str] = "Muscle Gain"
    level: Optional[str] = "Beginner"
    workout_days: Optional[int] = 5
    language: Optional[str] = "English"
    injuries: Optional[str] = ""
    equipment: Optional[str] = ""


class ProgressUpdate(BaseModel):
    user_id: str
    day_index: int
    exercise_index: int
    completed: bool

class VoiceRequest(BaseModel):
    text: str


# =========================
# SECURITY UTILS
# =========================
def get_password_hash(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# =========================
# SIMPLE MEMORY STORE
# =========================
routine_progress_store = {}


# =========================
# ROUTES
# =========================
@app.get("/")
def home():
    return {
        "message": "FitAI backend running 🚀",
        "status": "online",
        "phase": 2
    }


@app.post("/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(user_data.password)

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"name": new_user.name}
    }


@app.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"name": user.name}
    }


@app.post("/chat")
def chat(data: ChatRequest):
    user_message = data.message.strip()

    if not user_message:
        return {"reply": "Please type a message."}

    try:
        response = model.generate_content(user_message)

        if not response or not getattr(response, "text", None):
            return {"reply": "🔥 Your workout plan is ready. Open the workout animation player and start training."}

        return {"reply": response.text}

    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "reply": "🔥 Your workout routine is ready. Open the workout animation player and start training."
        }


@app.post("/generate-routine")
def generate_routine(profile: RoutineProfile):
    workout_place = (profile.workout_place or "Home Workout").lower()

    if "gym" in workout_place:
        routine = {
            "routine_name": "Routine A1",
            "summary": f"{profile.name} සඳහා gym-based workout routine.",
            "days": [
                {
                    "day": "Day 1",
                    "focus": "Chest + Triceps",
                    "exercises": [
                        {
                            "name": "Bench Press",
                            "sets": 3,
                            "reps": 12,
                            "rest_seconds": 45,
                            "animation_key": "bench_press_live",
                            "notes": "Press smoothly and control the weight."
                        },
                        {
                            "name": "Pushup",
                            "sets": 3,
                            "reps": 15,
                            "rest_seconds": 30,
                            "animation_key": "pushup_live",
                            "notes": "Keep body straight."
                        },
                        {
                            "name": "Bench Dips",
                            "sets": 3,
                            "reps": 12,
                            "rest_seconds": 30,
                            "animation_key": "bench_dips_live",
                            "notes": "Slow and controlled."
                        }
                    ]
                },
                {
                    "day": "Day 2",
                    "focus": "Legs",
                    "exercises": [
                        {
                            "name": "Squat",
                            "sets": 4,
                            "reps": 12,
                            "rest_seconds": 45,
                            "animation_key": "squat_live",
                            "notes": "Chest up and knees stable."
                        },
                        {
                            "name": "Lunges",
                            "sets": 3,
                            "reps": 10,
                            "rest_seconds": 30,
                            "animation_key": "lunges_live",
                            "notes": "Step with balance."
                        }
                    ]
                },
                {
                    "day": "Day 3",
                    "focus": "Core + Cardio",
                    "exercises": [
                        {
                            "name": "Bike Crunch",
                            "sets": 3,
                            "reps": 20,
                            "rest_seconds": 30,
                            "animation_key": "bike_crunch_live",
                            "notes": "Twist from the core."
                        },
                        {
                            "name": "Mountain Climber",
                            "sets": 3,
                            "reps": 20,
                            "rest_seconds": 30,
                            "animation_key": "mountain_climber_live",
                            "notes": "Fast but controlled."
                        }
                    ]
                }
            ]
        }
    else:
        routine = {
            "routine_name": "Routine A1",
            "summary": f"{profile.name} සඳහා home workout animation routine.",
            "days": [
                {
                    "day": "Day 1",
                    "focus": "Chest + Core",
                    "exercises": [
                        {
                            "name": "Pushup",
                            "sets": 4,
                            "reps": 12,
                            "rest_seconds": 30,
                            "animation_key": "pushup_live",
                            "notes": "Keep your body straight and lower slowly."
                        },
                        {
                            "name": "Plank",
                            "sets": 3,
                            "reps": 30,
                            "rest_seconds": 30,
                            "animation_key": "plank_live",
                            "notes": "Hold your core tight."
                        }
                    ]
                },
                {
                    "day": "Day 2",
                    "focus": "Legs",
                    "exercises": [
                        {
                            "name": "Squat",
                            "sets": 4,
                            "reps": 15,
                            "rest_seconds": 30,
                            "animation_key": "squat_live",
                            "notes": "Push hips back and keep chest high."
                        },
                        {
                            "name": "Lunges",
                            "sets": 3,
                            "reps": 10,
                            "rest_seconds": 30,
                            "animation_key": "lunges_live",
                            "notes": "Step forward with balance."
                        }
                    ]
                },
                {
                    "day": "Day 3",
                    "focus": "Cardio + Abs",
                    "exercises": [
                        {
                            "name": "Jumping Jack",
                            "sets": 3,
                            "reps": 20,
                            "rest_seconds": 20,
                            "animation_key": "jumping_jack_live",
                            "notes": "Warm up the full body."
                        },
                        {
                            "name": "Bike Crunch",
                            "sets": 3,
                            "reps": 20,
                            "rest_seconds": 20,
                            "animation_key": "bike_crunch_live",
                            "notes": "Controlled twisting movement."
                        }
                    ]
                }
            ]
        }

    return {
        "success": True,
        "data": {
            "user_id": profile.user_id,
            "profile": profile.dict(),
            "routine": routine
        }
    }


@app.post("/save-routine-progress")
def save_routine_progress(progress: ProgressUpdate):
    user_id = progress.user_id
    if user_id not in routine_progress_store:
        routine_progress_store[user_id] = []

    routine_progress_store[user_id].append({
        "day_index": progress.day_index,
        "exercise_index": progress.exercise_index,
        "completed": progress.completed
    })

    return {"success": True, "message": "Progress saved."}


@app.post("/speak-coach")
def speak_coach(data: VoiceRequest):
    text = (data.text or "").strip()

    if not text:
        return {"success": False, "message": "Text is empty."}

    if not ELEVENLABS_API_KEY:
        return {"success": False, "message": "ELEVENLABS_API_KEY missing."}

    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"

        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }

        payload = {
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.8
            }
        }

        response = requests.post(url, json=payload, headers=headers, timeout=60)

        if response.status_code != 200:
            return {
                "success": False,
                "message": "ElevenLabs voice unavailable right now.",
                "details": response.text
            }

        audio_base64 = base64.b64encode(response.content).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_base64,
            "mime_type": "audio/mpeg"
        }

    except Exception as e:
        print(f"ElevenLabs Error: {e}")
        return {
            "success": False,
            "message": "Voice generation failed."
        }