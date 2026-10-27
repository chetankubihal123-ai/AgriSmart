from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import io
import os

app = FastAPI(title="Plant Disease Detection API", version="1.0.0")

# Setup CORS for the React frontend (Vite defaults to port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local dev, restrict in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model globally lazily to speed up startup, but for simplicity let's load it here if exists.
MODEL_PATH = "plant_disease_model.keras"
CLASS_NAMES_PATH = "class_names.txt"

model = None
class_names = []

@app.on_event("startup")
async def load_model():
    global model, class_names
    print("Initializing Model and Class Names...")
    
    if os.path.exists(MODEL_PATH):
        try:
            model = keras.models.load_model(MODEL_PATH)
            print("Successfully loaded the AI Model.")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print(f"Warning: Model file '{MODEL_PATH}' not found. Did you run train_model.py?")
        
    if os.path.exists(CLASS_NAMES_PATH):
        with open(CLASS_NAMES_PATH, "r") as f:
            class_names = [line.strip() for line in f.readlines()]
            print(f"Loaded {len(class_names)} classes.")
    else:
        print("Warning: class_names.txt not found. Did you run train_model.py?")

from pydantic import BaseModel
import urllib.request
import json

class EmailOtpRequest(BaseModel):
    email: str
    otp: str
    subject: str = None

@app.post("/api/send-email-otp")
async def send_email_otp(req_data: EmailOtpRequest):
    api_key = os.getenv("VITE_RESEND_API_KEY", "")
    subject = req_data.subject or f"🌿 AgriSmart Login OTP: {req_data.otp}"
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px 20px; background: #dcfce7; border-radius: 9999px; margin-bottom: 12px;">
                <span style="font-size: 24px;">🌿</span>
                <strong style="color: #15803d; font-size: 18px; margin-left: 8px;">AgriSmart AI</strong>
            </div>
            <h2 style="color: #0f172a; margin: 8px 0 4px 0; font-size: 22px; font-weight: 800;">Your Verification Code</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Please use the OTP below to complete your login</p>
        </div>
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed #86efac; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">One-Time Password</span>
            <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #16a34a; font-family: 'Courier New', monospace; margin: 4px 0;">
                {req_data.otp}
            </div>
            <span style="font-size: 12px; color: #15803d; font-weight: 600; display: block; margin-top: 8px;">⏱️ Expires in 10 minutes</span>
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
            If you didn't request this verification code, please ignore this email. Never share your password or OTP with anyone.
        </p>
    </div>
    """
    
    payload = {
        "from": "AgriSmart Admin <onboarding@resend.dev>",
        "reply_to": "chetankubihal123@gmail.com",
        "to": [req_data.email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        return JSONResponse(status_code=e.code, content={"error": err_content})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/")
def read_root():
    return {"message": "Plant Disease Detection API is running. Send POST requests to /predict."}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Fallback to simulated prediction if model is missing to allow testing the connection
    if model is None or not class_names:
        import random
        simulated_diseases = ["Tomato Bacterial Spot", "Potato Late Blight", "Pepper Bell Healthy", "Corn Common Rust"]
        return {
            "disease": random.choice(simulated_diseases),
            "raw_class": "simulated_mode",
            "confidence": float(random.uniform(85, 99))
        }
        
    try:
        # Read file into bytes
        contents = await file.read()
        
        # Load image via Pillow
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((224, 224)) # Must match IMG_SIZE in training
        
        # Preprocess for the model
        img_array = keras.preprocessing.image.img_to_array(image)
        # MobileNet expects expanding dimensions
        img_array = tf.expand_dims(img_array, 0)
        
        # Make the prediction
        predictions = model.predict(img_array)
        score = tf.nn.softmax(predictions[0]) # Since the model outputs softmax, we just take predictions[0] directly. Wait, the model ends in softmax. So the output IS the softmax probabilities.
        probabilities = predictions[0]

        predicted_class_idx = np.argmax(probabilities)
        confidence = probabilities[predicted_class_idx] * 100
        
        # Prettify the class name (e.g. "Pepper__bell___Bacterial_spot" -> "Pepper Bell - Bacterial Spot")
        predicted_class_name = class_names[predicted_class_idx]
        formatted_name = " ".join(predicted_class_name.replace("__", " ").replace("_", " ").split())
        
        return {
            "disease": formatted_name,
            "raw_class": predicted_class_name,
            "confidence": float(confidence)
        }
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to parse image: {str(e)}"})
