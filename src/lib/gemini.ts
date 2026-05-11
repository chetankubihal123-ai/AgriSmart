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

export async function identifyCropType(base64Image: string): Promise<string> {
  const base64Data = base64Image.split(',')[1];
  const prompt = `Task: Identify the crop or object in the image.
  1. If the image is NOT a plant, leaf, crop, or farming-related subject (e.g., a person, a notebook, furniture, a screen, etc.), return "invalid".
  2. If it is a plant, identify if it is "tomato", "corn", or "chilli".
  3. If it is a plant but not one of those three, return "other".
  Return ONLY the single word answer: "tomato", "corn", "chilli", "other", or "invalid".`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { temperature: 0.1 }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        prompt
      ]);
      const response = result.response.text().trim().toLowerCase();
      if (['tomato', 'corn', 'chilli', 'other', 'invalid'].some(word => response.includes(word))) {
        if (response.includes('tomato')) return 'tomato';
        if (response.includes('corn')) return 'corn';
        if (response.includes('chilli')) return 'chilli';
        if (response.includes('invalid')) return 'invalid';
        return 'other';
      }
    } catch (error) {
      console.warn(`Crop identification failed with ${modelName}:`, error);
      continue;
    }
  }
  return 'invalid';
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
