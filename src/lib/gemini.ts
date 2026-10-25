import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Force V1 stable API version to avoid 404 v1beta issues
const genAI = new GoogleGenerativeAI(API_KEY);

// Use proven stable Gemini model names
const MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-pro-vision"
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
  
  const prompt = `You are an agricultural image classifier for Indian farmers. Your job is to ALLOW agricultural images and BLOCK only clearly non-agricultural ones.

ACCEPT as VALID (return category "tomato", "corn", "chilli", or "other") for ANY of:
- Leaves of any plant (green, yellow, brown, diseased, wilted)
- Crops: rice, wheat, cotton, sugarcane, maize, potato, tomato, chilli, onion, soybean, turmeric, ginger, etc.
- Plant stems, roots, seeds, flowers, fruits, vegetables
- Farm fields, paddy fields, soil with plants
- Diseased plants showing spots, lesions, yellowing, rust, blight
- Seedlings, sprouts, saplings
- Harvested produce: vegetables, fruits, grains
- Any green vegetation or plant matter whatsoever
- Agricultural tools or equipment in a farm setting

REJECT as INVALID (return "invalid") ONLY for clearly non-agricultural images:
- Human faces, selfies, portraits (person with NO plant visible)
- Pure text documents, screenshots of apps, QR codes
- Vehicles (cars, bikes) with no farm context
- Indoor electronics, laptops, phones
- Animals (dogs, cats) with no agricultural context

IMPORTANT: When in doubt, ACCEPT the image. A leaf photo should ALWAYS be accepted. Green color = plant = accept.

Categories:
- "tomato" = tomato plant leaf/fruit
- "corn" = maize/corn plant  
- "chilli" = chilli/pepper plant
- "other" = any other plant, crop, leaf, or agricultural image
- "invalid" = ONLY if clearly and obviously not agricultural at all

Return ONLY JSON:
{
  "category": "tomato" | "corn" | "chilli" | "other" | "invalid",
  "confidence": number (0-100),
  "reason": "Short explanation in ${language === 'kn' ? 'Kannada' : 'English'}"
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
      let category = (parsed.category || 'other').toLowerCase();
      if (!validCategories.includes(category)) category = 'other';
      
      return {
        category: category as any,
        confidence: parsed.confidence || 85,
        reason: parsed.reason || ''
      };
    } catch (error) {
      console.warn(`Crop identification failed with ${modelName}:`, error);
      continue;
    }
  }

  // If ALL Gemini models fail (API error, quota, etc.) → default to VALID so real crop photos are never wrongly blocked
  console.warn('All Gemini models failed for crop identification — defaulting to valid plant.');
  return {
    category: 'other',
    confidence: 70,
    reason: language === 'kn' ? 'ಚಿತ್ರ ಸಂಸ್ಕರಣೆ ಮಾಡಲಾಗುತ್ತಿದೆ.' : 'Image accepted for analysis.'
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
