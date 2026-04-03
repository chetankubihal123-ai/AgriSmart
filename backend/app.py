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

@app.get("/")
def read_root():
    return {"message": "Plant Disease Detection API is running. Send POST requests to /predict."}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None or not class_names:
        return JSONResponse(
            status_code=500, 
            content={"error": "Model is not trained yet. Please run the training script first."}
        )
        
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
