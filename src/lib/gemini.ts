import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Force V1 stable API version to avoid 404 v1beta issues
const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest"
];

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
  const prompt = `You are an expert agricultural plant pathologist and computer vision model.
  Analyze this crop leaf image with 100% precision.
  ${langPrompt}

  Goals:
  1. Identify the exact crop plant species and any disease, fungus, bacteria, virus, or pest damage (or confirm if 100% healthy).
  2. Estimate healthScore (0 to 100): 100 is completely healthy, 80-90 is mild, 40-70 is moderate, 10-30 is severe.
  3. Detect growthStage ("Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Maturity").
  4. CRITICAL FOR LESIONS: Return 1 to 4 precise bounding boxes [ymin, xmin, ymax, xmax] (normalized on a 0-1000 scale, where 0 is top/left, 1000 is bottom/right) accurately outlining ONLY the visibly discolored, spotted, rusted, or infected areas on the leaf.
  5. Provide a detailed explanation of what happened to the plant, why the symptoms developed (causes), how it spreads, and clear treatments.

  Return ONLY a JSON object matching this schema:
  {
    "healthScore": number,
    "growthStage": "Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Maturity",
    "stressIndicators": [{"type": "string", "severity": "Low" | "Moderate" | "High", "box": [ymin, xmin, ymax, xmax]}],
    "topDiagnosis": {"name": "Specific Crop & Disease Name (e.g. Soybean Rust, Tomato Early Blight, Corn Common Rust, Healthy Plant)", "confidence": number, "severity": "Low" | "Moderate" | "High"},
    "alternatives": [{"name": "string", "confidence": number}],
    "lesions": [{"box": [ymin, xmin, ymax, xmax], "type": "Rust Pustule" | "Blight Lesion" | "Necrotic Spot" | "Affected Area"}],
    "causes": "2-3 comprehensive sentences explaining what pathogen (fungus, bacterium, virus, or pest) or stress caused these spots and what happened to the leaf cells/chlorophyll",
    "spread": "1-2 sentences on how the disease spreads in the field (wind, rain splash, soil)",
    "treatment": {
      "conventional": ["Specific fungicide/bactericide sprays with recommended usage"],
      "biological": ["Organic solutions such as neem oil, Trichoderma, biocontrol agents"],
      "prevention": ["Crop rotation, avoiding overhead watering, pruning infected lower leaves"]
    }
  }`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.2
        }
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
    } catch (_error) { continue; }
  }
  return null;
}

export interface CropValidationResult {
  category: 'tomato' | 'corn' | 'chilli' | 'other' | 'invalid';
  confidence: number;
  reason: string;
}

export async function identifyCropType(base64Image: string, language: string = 'en'): Promise<CropValidationResult> {
  const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];
  const base64Data = base64Image.split(',')[1];
  
  const prompt = `CRITICAL TASK: Strictly determine if this image depicts a REAL agricultural crop, plant, leaf, crop fruit, or farm vegetation.
  
  Categories:
  1. "tomato", "corn", "chilli" - if specifically identified as one of these crops/leaves.
  2. "other" - if it is a real plant, crop, leaf, flower, or agricultural produce, but not tomato/corn/chilli.
  3. "invalid" - STRICTLY assign "invalid" if the image shows:
     - Handwritten text, signatures, paper, documents, drawings, sketches
     - Humans, faces, hands, selfies, skin, clothing
     - Animals, pets
     - Vehicles, buildings, furniture, indoor items, screens, electronics
     - Blank, plain, or non-vegetative objects
     - Anything that is NOT a genuine living plant/leaf/crop.

  STRICT RULE:
  Do NOT hallucinate or guess a plant where none exists. If there is NO botanical plant leaf, stem, or crop in the image, you MUST return "invalid" with high confidence (95-100).
  
  Return ONLY JSON in this format:
  {
    "category": "tomato" | "corn" | "chilli" | "other" | "invalid",
    "confidence": number (0-100),
    "reason": "Short, clear explanation in ${language === 'kn' ? 'Kannada' : 'English'}"
  }`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { 
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: mimeType } },
        prompt
      ]);
      const responseText = result.response.text();
      const match = responseText.match(/\{[\s\S]*\}/);
      if (!match) continue;
      
      const parsed = JSON.parse(match[0]);
      const validCategories = ['tomato', 'corn', 'chilli', 'other', 'invalid'];
      let category = (parsed.category || 'invalid').toLowerCase();
      if (!validCategories.includes(category)) category = 'invalid';
      
      return {
        category: category as any,
        confidence: parsed.confidence || 0,
        reason: parsed.reason || ''
      };
    } catch (error) {
      console.warn(`Crop identification failed with ${modelName}:`, error);
      continue;
    }
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

export async function askGeminiText(prompt: string, language: string = 'en'): Promise<string | null> {
  const langPrompt = language === 'kn' 
    ? 'IMPORTANT: Return the response strictly in KANNADA language using Kannada script. Keep it warm, extremely concise (2-3 sentences max) and helpful for a farmer.' 
    : 'IMPORTANT: Return the response strictly in ENGLISH. Keep it warm, extremely concise (2-3 sentences max) and helpful for a farmer.';
  
  const finalPrompt = `${langPrompt}\n\nQuestion: ${prompt}`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(finalPrompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (error) {
      console.warn(`Text model ${modelName} failed:`, error);
      continue;
    }
  }
  return null;
}
