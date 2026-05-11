import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Force V1 stable API version to avoid 404 v1beta issues
const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

export async function analyzeImageWithGemini(base64Image: string, cropType: string = 'plant', language: string = 'en') {
  const base64Data = base64Image.split(',')[1];
  const langPrompt = language === 'kn' ? 'Return ONLY Kannada text for all fields.' : 'Return ONLY English text for all fields.';
  const prompt = `
    Analyze this image of a ${cropType}.
    ${langPrompt}
    Return ONLY JSON: {"disease": "Name", "status": "Healthy"|"Warning"|"Critical", "confidence": 0-100, "description": "...", "treatment": ["..."]}
  `;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.error(`Gemini model ${modelName} failed:`, error);
      if (modelName === MODELS[MODELS.length - 1]) throw error;
    }
  }
}

export async function analyzeDetailedPlantHealth(base64Image: string, cropType: string = 'plant', language: string = 'en') {
  const base64Data = base64Image.split(',')[1];
  const langPrompt = language === 'kn' ? 'IMPORTANT: Return ALL string values (names, descriptions, treatments, causes, spread) in KANNADA language. Use English for technical categories only if absolutely necessary.' : 'Return all values in English.';
  const prompt = `Analyze this ${cropType} image for health and disease. 
  ${langPrompt}
  Return ONLY a JSON object with:
  {
    "healthScore": number (0-100),
    "growthStage": "Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Maturity",
    "stressIndicators": [{"type": "string", "severity": "Low" | "Moderate" | "High", "box": [ymin, xmin, ymax, xmax]}],
    "topDiagnosis": {"name": "string", "confidence": number, "severity": "Low" | "Moderate" | "High"},
    "alternatives": [{"name": "string", "confidence": number}],
    "lesions": [{"box": [ymin, xmin, ymax, xmax], "type": "Spot" | "Blight" | "Mold"}],
    "causes": "string",
    "spread": "string",
    "treatment": {"conventional": ["string"], "biological": ["string"], "prevention": ["string"]}
  }`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.warn(`Detailed analysis failed with ${modelName}:`, error);
      continue;
    }
  }
  return null;
}

export async function detectPlantPolygon(base64Image: string, cropType: string = 'plant') {
  const base64Data = base64Image.split(',')[1];
  // Extremely strict prompt for high-precision tracing
  const prompt = `Task: High-precision boundary tracing of the ${cropType} leaf.
  1. Identify the primary leaf in the foreground.
  2. Ignore all background elements (hands, tables, soil).
  3. Output exactly 40 [y, x] coordinate pairs that trace the leaf perimeter perfectly.
  Scale: 0-1000.
  Format: {"polygon": [[y1, x1], [y2, x2], ...]}
  Return ONLY the JSON. No preamble.`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.1,
          topP: 0.8,
          topK: 40
        }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const text = result.response.text();
      // Robust JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data && data.polygon && Array.isArray(data.polygon) && data.polygon.length > 10) {
          return data;
        }
      }
    } catch (error) {
      console.warn(`Polygon failed with ${modelName}:`, error);
      continue;
    }
  }
  return null;
}

export async function detectPlantBoundingBox(base64Image: string) {
  const base64Data = base64Image.split(',')[1];
  const prompt = `Detect the plant area. Return ONLY JSON: {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}. Scale 0-1000.`;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) { continue; }
  }
  return null;
}

export interface CropValidationResult {
  category: 'tomato' | 'corn' | 'chilli' | 'other' | 'invalid';
  confidence: number;
  reason: string;
}

export async function identifyCropType(base64Image: string, language: string = 'en'): Promise<CropValidationResult> {
  const base64Data = base64Image.split(',')[1];
  const prompt = `CRITICAL TASK: Validate if this image is a CROP/PLANT for agricultural analysis.
  
  Categories:
  1. "tomato", "corn", "chilli" - if specifically identified.
  2. "other" - if it is a plant/crop/leaf/flower but NOT one of the above.
  3. "invalid" - if it is a HUMAN, FACE, SELFIE, CLOTHING, CAR, BUILDING, TEXT, or unrelated object.

  CRITICAL RULES:
  - If the image contains a leaf pattern, organic veins, or plant structure, it IS VALID.
  - Do NOT reject images just because they have a plain background or are zoomed in.
  - Diseased leaves (brown/spotted) are 100% VALID agricultural samples.
  - Only use "invalid" for clearly non-farming objects like people or machines.

  Validation Rules:
  - Macro/Close-up shots of leaves are VALID and should be categorized.
  - Diseased, brown, or spotted leaves are STILL VALID plants.
  - Plain, gray, or blue backgrounds are common in labs/offices; ignore the background and focus on the subject.
  - High confidence (>90%) if it's a clear leaf/plant part.
  - Medium confidence (50-80%) if blurry, highly diseased, or macro-zoomed.
  - Low confidence (<50%) ONLY if it's truly ambiguous.

  Return ONLY a JSON object in this format:
  {
    "category": "tomato" | "corn" | "chilli" | "other" | "invalid",
    "confidence": number (0-100),
    "reason": "Short explanation in ${language === 'kn' ? 'Kannada' : 'English'}"
  }`;

      const model = genAI.getGenerativeModel({ 
        model: MODELS[0], // Force Flash for speed
        generationConfig: { 
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
      
      return {
        category: parsed.category || 'invalid',
        confidence: parsed.confidence || 0,
        reason: parsed.reason || ''
      };
    } catch (error) {
      console.warn(`Crop identification failed:`, error);
    }

  return {
    category: 'invalid',
    confidence: 0,
    reason: language === 'kn' ? 'ಚಿತ್ರವನ್ನು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.' : 'Could not identify image.'
  };
}

export async function cropImage(base64Image: string, box: { ymin: number, xmin: number, ymax: number, xmax: number }): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const width = img.width;
      const height = img.height;
      const x = (box.xmin / 1000) * width;
      const y = (box.ymin / 1000) * height;
      const w = ((box.xmax - box.xmin) / 1000) * width;
      const h = ((box.ymax - box.ymin) / 1000) * height;
      canvas.width = w || width;
      canvas.height = h || height;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = base64Image;
  });
}
