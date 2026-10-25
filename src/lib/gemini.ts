import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || (typeof atob !== 'undefined' ? atob('QVEuQWI4Uk42TFVuVURWZVBhTjBFMlZVbHBtVEMybmZhNWJCa19qbmZZNmlNRDN6OGdFUmc=') : '');
const genAI = new GoogleGenerativeAI(API_KEY);

// Fast, stable, multimodal Gemini models available in Google AI Studio
const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash"
];

function getMimeAndData(base64Image: string): { mimeType: string; base64Data: string } {
  if (base64Image.includes(';base64,')) {
    const parts = base64Image.split(';base64,');
    const mime = parts[0].replace(/^data:/, '') || 'image/jpeg';
    return { mimeType: mime, base64Data: parts[1] };
  }
  return { mimeType: 'image/jpeg', base64Data: base64Image };
}

export async function analyzeImageWithGemini(base64Image: string, cropType: string = 'plant', language: string = 'en') {
  const { mimeType, base64Data } = getMimeAndData(base64Image);
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
        { inlineData: { data: base64Data, mimeType } },
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
  const { mimeType, base64Data } = getMimeAndData(base64Image);
  const langPrompt = language === 'kn' 
    ? 'IMPORTANT: Return ALL string values (names, descriptions, treatments, causes, spread) in KANNADA language. Use English for technical categories only if absolutely necessary.' 
    : 'Return all values in English.';

  const prompt = `You are a world-class agricultural plant pathologist and computer vision diagnostician.
Analyze this crop leaf / agricultural image with extreme precision and scientific rigor.
${langPrompt}

DIAGNOSTIC PROTOCOL:
1. INSPECT FOR PATHOGENS & ABNORMALITIES:
   - Carefully examine the leaf blade, veins, margins, and petiole for fungal lesions, rust pustules, cercospora spots, target spots, bacterial blight, downy/powdery mildew, mosaic viral mottling, anthracnose, leaf curl, nutrient chlorosis, wilting, or insect feeding.
   - CRITICAL ACCURACY RULE: If the leaf shows visible spots, lesions, rust, yellowing, blight, browning, necrosis, holes, or rot, DO NOT classify it as 'Healthy'. Accurately name the specific disease (e.g., "Soybean Target Spot", "Soybean Rust", "Cercospora Leaf Blight", "Tomato Early Blight", "Maize Common Rust", "Chilli Anthracnose", etc.).
   - Only classify as 'Healthy Plant' if the leaf has intact, uniform green foliage with zero signs of pathogen damage or necrosis.

2. HEALTH SCORE ESTIMATION (0 to 100):
   - 95-100: Completely pristine, healthy leaf with no lesions or pathogens.
   - 75-90: Very mild infection, minimal spotting (<5% area affected).
   - 45-74: Moderate infection, noticeable spots, chlorosis, or lesions (10-35% area affected).
   - 10-44: Severe infection, extensive necrotic lesions, blight, or spreading rust (>35% area affected).

3. LESION BOUNDING BOXES:
   - If diseased or spotted, return 1 to 4 precise bounding boxes [ymin, xmin, ymax, xmax] (normalized 0-1000 scale, where 0,0 is top-left and 1000,1000 is bottom-right) tightly enclosing the primary infected spots or pustules.
   - If 100% healthy, return empty array [].

4. CAUSES, SPREAD, & TREATMENT:
   - Explain what pathogen (fungus, bacterium, virus) caused the cellular breakdown and brown necrotic spots.
   - Explain how it spreads (airborne spores, splashing rain, humidity, insect vectors).
   - Provide concrete, actionable treatments: conventional chemical sprays (e.g. azoxystrobin, mancozeb, copper oxychloride), organic/biological remedies (neem oil, Trichoderma viride), and preventative farm practices.

Return ONLY a JSON object matching this schema:
{
  "healthScore": number,
  "growthStage": "Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Maturity",
  "stressIndicators": [{"type": "string", "severity": "Low" | "Moderate" | "High", "box": [ymin, xmin, ymax, xmax]}],
  "topDiagnosis": {"name": "Specific Crop & Disease Name", "confidence": number, "severity": "Low" | "Moderate" | "High"},
  "alternatives": [{"name": "string", "confidence": number}],
  "lesions": [{"box": [ymin, xmin, ymax, xmax], "type": "Rust Pustule" | "Blight Lesion" | "Necrotic Spot" | "Affected Area"}],
  "causes": "Detailed scientific explanation of pathogen and cellular breakdown causing these symptoms",
  "spread": "How this disease spreads in the field",
  "treatment": {
    "conventional": ["Specific fungicide/bactericide sprays with dosages"],
    "biological": ["Organic bio-control solutions (neem oil, Trichoderma)"],
    "prevention": ["Cultural practices: spacing, air circulation, crop rotation"]
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
        { inlineData: { data: base64Data, mimeType } },
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
  const { mimeType, base64Data } = getMimeAndData(base64Image);
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
        { inlineData: { data: base64Data, mimeType } },
        prompt
      ]);
      const text = result.response.text();
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
  const { mimeType, base64Data } = getMimeAndData(base64Image);
  const prompt = `Detect the plant area. Return ONLY JSON: {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}. Scale 0-1000.`;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType } },
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
  isAgricultural: boolean;
  cropName?: string;
}

export async function identifyCropType(base64Image: string, language: string = 'en'): Promise<CropValidationResult> {
  const { mimeType, base64Data } = getMimeAndData(base64Image);
  
  const langPrompt = language === 'kn' 
    ? 'Provide the reason strictly in KANNADA language.' 
    : 'Provide the reason strictly in ENGLISH.';

  const prompt = `You are a strict agricultural AI validator.
Your primary duty is to verify whether this image is agricultural and strictly block all non-agricultural images.
${langPrompt}

CLASSIFICATION RULES:
1. ACCEPT (isAgricultural: true) ONLY IF the image contains:
   - Any agricultural crop, plant, tree, shrub, seedling, sapling, or sprout.
   - Any plant leaf (healthy, diseased, spotted, yellowed, rusted, wilted, necrotic, or pest-damaged).
   - Agricultural fields, paddy fields, farmlands, crops growing in outdoor or greenhouse soil.
   - Harvested farm produce (vegetables, fruits, grains, pulses, seeds, tubers).
   
2. STRICTLY REJECT (isAgricultural: false, category: "invalid") FOR ALL NON-AGRICULTURAL IMAGES:
   - Humans (selfies, faces, portraits, people without crops/plants as main focus).
   - Domestic or wild animals (pets, dogs, cats, birds) where plants are not the main subject.
   - Vehicles (cars, motorcycles, trucks, bicycles, roads).
   - Indoor electronics (laptops, phones, monitors, keyboards, TVs, gadgets).
   - Furniture, home interiors, bedrooms, walls, clothing, footwear, random household objects.
   - Documents, screenshots, text, receipts, QR codes, icons, illustrations, digital drawings.

CATEGORIES:
- "tomato": Tomato leaf, plant, or fruit
- "corn": Corn / Maize leaf or plant
- "chilli": Chilli / Pepper leaf or plant
- "other": Any other agricultural crop, leaf, plant, vegetable, fruit, or farm scene
- "invalid": Non-agricultural image (people, selfies, electronics, cars, animals, screenshots, objects)

Return ONLY a JSON object:
{
  "isAgricultural": boolean,
  "category": "tomato" | "corn" | "chilli" | "other" | "invalid",
  "cropName": "Name of the crop/plant or 'Non-agricultural'",
  "confidence": number (50-100),
  "reason": "Clear explanation of what was detected in the image"
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
        { inlineData: { data: base64Data, mimeType } },
        prompt
      ]);
      const responseText = result.response.text();
      const match = responseText.match(/\{[\s\S]*\}/);
      if (!match) continue;
      
      const parsed = JSON.parse(match[0]);
      const isAgri = parsed.isAgricultural !== false && parsed.category !== 'invalid';
      let category = (parsed.category || 'other').toLowerCase();
      if (!isAgri || category === 'invalid') {
        category = 'invalid';
      } else if (!['tomato', 'corn', 'chilli', 'other'].includes(category)) {
        category = 'other';
      }
      
      return {
        category: category as any,
        isAgricultural: category !== 'invalid',
        cropName: parsed.cropName || (category !== 'invalid' ? 'Crop Plant' : 'Non-agricultural'),
        confidence: parsed.confidence || (category === 'invalid' ? 98 : 95),
        reason: parsed.reason || (category === 'invalid' 
          ? (language === 'kn' ? 'ಕೃಷಿಯೇತರ ಚಿತ್ರ ಪತ್ತೆಯಾಗಿದೆ. ಕೇವಲ ಬೆಳೆಯ ಅಥವಾ ಸಸ್ಯಗಳ ಚಿತ್ರಗಳನ್ನು ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' : 'Non-agricultural image detected. Only photos of crops, leaves, plants, or farm produce are accepted.')
          : (language === 'kn' ? 'ಬೆಳೆ ಯಶಸ್ವಿಯಾಗಿ ಪತ್ತೆಯಾಗಿದೆ.' : 'Crop detected successfully.'))
      };
    } catch (error) {
      console.warn(`Crop identification failed with ${modelName}:`, error);
      continue;
    }
  }

  // If ALL Gemini models fail due to network or quota, return invalid so non-plant images are not mistakenly permitted
  console.warn('All Gemini models failed for crop identification');
  return {
    category: 'invalid',
    isAgricultural: false,
    cropName: 'Unknown',
    confidence: 0,
    reason: language === 'kn' 
      ? 'ಚಿತ್ರವನ್ನು ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.' 
      : 'Unable to verify image. Please check your internet connection or try again.'
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
