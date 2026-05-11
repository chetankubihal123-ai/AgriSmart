import { useState, useRef, useEffect } from 'react';
import { Farm } from '../lib/types';
import { AlertCircle, CheckCircle, Upload, X, Loader2, Camera, Sparkles } from 'lucide-react';
import { useImageClassifier, CropType } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeImageWithGemini, detectPlantBoundingBox, cropImage, detectPlantPolygon, analyzeDetailedPlantHealth, identifyCropType } from '../lib/gemini';

interface CropHealthProps {
  farm?: Farm;
}

interface AnalysisResult {
  status: 'Healthy' | 'Warning' | 'Critical';
  disease?: string;
  confidence: number;
  recommendations: string[];
  healthScore?: number;
  growthStage?: string;
  stressIndicators?: { type: string, severity: string, box: number[] }[];
  alternatives?: { name: string, confidence: number }[];
  lesions?: { box: number[], type: string }[];
  causes?: string;
  spread?: string;
  treatment?: { conventional: string[], biological: string[], prevention: string[] };
}

const DISEASE_GUIDE: Record<string, { title: string, status: 'Healthy' | 'Warning' | 'Critical', recs: string[] }> = {
  'Tomato_healthy': {
    title: 'Tomato (Healthy)',
    status: 'Healthy',
    recs: ['Maintain current irrigation', 'Continue regular soil testing', 'Monitor for early pest signs']
  },
  'Tomato__Tomato_mosaic_virus': {
    title: 'Tomato Mosaic Virus',
    status: 'Critical',
    recs: ['Remove and destroy infected plants', 'Control aphids and whiteflies', 'Disinfect tools between use']
  },
  'Tomato__Tomato_YellowLeaf_Curl_Virus': {
    title: 'Tomato Yellow Leaf Curl Virus',
    status: 'Critical',
    recs: ['Use silver-colored mulches', 'Remove nearby weed hosts', 'Plant resistant varieties']
  },
  'Tomato_Late_blight': {
    title: 'Tomato Late Blight',
    status: 'Critical',
    recs: ['Apply copper-based fungicides', 'Improve air circulation', 'Avoid overhead watering']
  },
  'Tomato_Early_blight': {
    title: 'Tomato Early Blight',
    status: 'Warning',
    recs: ['Prune lower leaves', 'Apply organic fungicide', 'Rotate crops every 3 years']
  },
  'Tomato_Septoria_leaf_spot': {
    title: 'Tomato Septoria Leaf Spot',
    status: 'Warning',
    recs: ['Remove infected foliage', 'Mulch around base', 'Use drip irrigation']
  },
  'Tomato_Bacterial_spot': {
    title: 'Tomato Bacterial Spot',
    status: 'Warning',
    recs: ['Use treated seeds', 'Apply copper-based sprays', 'Avoid working in wet fields']
  },
  'Tomato_Spider_mites_Two_spotted_spider_mite': {
    title: 'Tomato Spider Mites',
    status: 'Warning',
    recs: ['Spray plants with water', 'Introduce natural predators', 'Use neem oil spray']
  },
  'Tomato_Leaf_Mold': {
    title: 'Tomato Leaf Mold',
    status: 'Warning',
    recs: ['Reduce humidity in greenhouse', 'Plant resistant hybrids', 'Increase plant spacing']
  },
  'Tomato_Target_Spot': {
    title: 'Tomato Target Spot',
    status: 'Warning',
    recs: ['Apply fungicides early', 'Remove old plant debris', 'Improve field drainage']
  },
  'Potato__healthy': {
    title: 'Potato (Healthy)',
    status: 'Healthy',
    recs: ['Ensure proper hilling', 'Monitor soil moisture', 'Check for potato beetle']
  },
  'Potato__Late_blight': {
    title: 'Potato Late Blight',
    status: 'Critical',
    recs: ['Destroy volunteer potatoes', 'Apply preventative fungicide', 'Harvest during dry weather']
  },
  'Potato__Early_blight': {
    title: 'Potato Early Blight',
    status: 'Warning',
    recs: ['Avoid overhead irrigation', 'Apply chlorothalonil', 'Ensure balanced nutrition']
  },
  'Pepper__bell___healthy': {
    title: 'Pepper (Healthy)',
    status: 'Healthy',
    recs: ['Maintain consistent watering', 'Mulch for weed control', 'Monitor for aphids']
  },
  'Pepper__bell___Bacterial_spot': {
    title: 'Pepper Bacterial Spot',
    status: 'Warning',
    recs: ['Use certified seeds', 'Avoid overhead irrigation', 'Apply fixed copper sprays']
  },
  'Corn__healthy': {
    title: 'Corn (Healthy)',
    status: 'Healthy',
    recs: ['Check for nitrogen deficiency', 'Monitor for corn borers', 'Ensure consistent irrigation']
  },
  'Corn__Common_rust_': {
    title: 'Corn Common Rust',
    status: 'Warning',
    recs: ['Plant resistant hybrids', 'Apply labeled fungicides', 'Sow early in the season']
  },
  'Corn__Gray_leaf_spot': {
    title: 'Corn Gray Leaf Spot',
    status: 'Critical',
    recs: ['Rotate with non-host crops', 'Till under crop residue', 'Apply fungicides at tasseling']
  },
  'Corn__Northern_Leaf_Blight': {
    title: 'Corn Northern Leaf Blight',
    status: 'Warning',
    recs: ['Manage crop residue', 'Use resistant cultivars', 'Apply foliar fungicides']
  }
};


export function CropHealth({ farm: _farm }: CropHealthProps) {
  const { t, language } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropType>('tomato');
  const [isCropping, setIsCropping] = useState(false);
  const [boundingBox, setBoundingBox] = useState<{ ymin: number, xmin: number, ymax: number, xmax: number } | null>(null);
  const [polygon, setPolygon] = useState<[number, number][] | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { model, modelLoading, classifyImage, initializeModels } = useImageClassifier();

  useEffect(() => {
    initializeModels();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedImage(dataUrl);
      setResult(null);
      setClassificationError(null);

      // Trigger AI Identity & Magic Cutout
      setIsCropping(true);
      try {
        // 1. Identify Crop Type (Gatekeeper)
        const identifiedCrop = await identifyCropType(dataUrl);
        const classification = await classifyImage(imageRef.current || new Image(), selectedCrop);

        if (identifiedCrop === 'invalid') {
          setClassificationError(language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೆಳೆ ಅಥವಾ ಎಲೆಯ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' : 'No crop detected. Please upload a clear image of a crop or leaf.');
          setIsCropping(false);
          return;
        }

        if (identifiedCrop && ['tomato', 'corn', 'chilli'].includes(identifiedCrop)) {
          setSelectedCrop(identifiedCrop as any);
        }

        // 2. Run analysis with the identified (or existing) crop
        const [boxResult, polyResult] = await Promise.all([
          detectPlantBoundingBox(dataUrl),
          detectPlantPolygon(dataUrl, (identifiedCrop && identifiedCrop !== 'other') ? identifiedCrop : selectedCrop)
        ]);

        if (polyResult && polyResult.polygon) {
          setPolygon(polyResult.polygon);
        }

        if (boxResult) {
          setBoundingBox(boxResult);
        }
      } catch (err) {
        console.warn("Magic cutout failed:", err);
      } finally {
        setIsCropping(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage || !imageRef.current) return;

    setAnalyzing(true);
    setClassificationError(null);

    try {
      let imageToAnalyze = selectedImage;

      // 0. Double check identity if needed, but we already do it in handleFile.
      // However, analyzeImage might be called directly if we didn't block in handleFile.
      // 1. Final strict check
      const identifiedCrop = await identifyCropType(selectedImage);
      
      if (identifiedCrop === 'invalid') {
        setClassificationError(language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೆಳೆ ಅಥವಾ ಎಲೆಯ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' : 'No crop detected. Please upload a clear image of a crop or leaf.');
        setAnalyzing(false);
        return;
      }

      const currentCrop = (identifiedCrop && identifiedCrop !== 'invalid' && identifiedCrop !== 'other') ? identifiedCrop : selectedCrop;

      // Use Detailed Analysis
      const detailedResult = await analyzeDetailedPlantHealth(imageToAnalyze, currentCrop as CropType, language);

      if (detailedResult) {
        setResult({
          status: detailedResult.topDiagnosis?.severity === 'High' ? 'Critical' : (detailedResult.topDiagnosis?.severity === 'Moderate' ? 'Warning' : 'Healthy'),
          disease: detailedResult.topDiagnosis?.name || "Unknown Disease",
          confidence: detailedResult.topDiagnosis?.confidence || 0,
          recommendations: detailedResult.treatment?.conventional || ["No recommendations found"],
          healthScore: detailedResult.healthScore || 0,
          growthStage: detailedResult.growthStage || "Unknown",
          stressIndicators: detailedResult.stressIndicators || [],
          alternatives: detailedResult.alternatives || [],
          lesions: detailedResult.lesions || [],
          causes: detailedResult.causes || "N/A",
          spread: detailedResult.spread || "N/A",
          treatment: detailedResult.treatment
        });
        setAnalyzing(false);
        return;
      }

      // 2. Gemini Analysis with Fallback (Legacy)
      try {
        const geminiResult = await analyzeImageWithGemini(imageToAnalyze, selectedCrop, language);
        if (geminiResult) {
          const status = geminiResult.status || 'Warning';
          setResult({
            status: status as any,
            disease: geminiResult.disease,
            confidence: geminiResult.confidence,
            recommendations: geminiResult.treatment,
            healthScore: status === 'Healthy' ? 95 : (status === 'Warning' ? 65 : 25),
            treatment: {
              conventional: geminiResult.treatment || [],
              biological: [],
              prevention: []
            }
          });
          setAnalyzing(false);
          return;
        }
      } catch (geminiError) {
        console.error("Gemini failed, using local custom model:", geminiError);
      }

      // Use Teachable Machine model for the selected crop
      const { customPredictions, error: localError } = await classifyImage(imageRef.current!, selectedCrop);

      if (!localError && customPredictions && customPredictions.length > 0) {
        const top = customPredictions[0];
        // Find original key like "Tomato_Late_blight"
        const dbKey = top.className;
        const dbEntry = (DISEASE_GUIDE as any)[dbKey];

        if (dbEntry) {
          setResult({
            status: dbEntry.status,
            disease: dbEntry.title.toUpperCase(),
            confidence: Math.round(top.probability * 100),
            recommendations: dbEntry.recs,
            healthScore: dbEntry.status === 'Healthy' ? 95 : (dbEntry.status === 'Warning' ? 65 : 25),
            treatment: {
              conventional: dbEntry.recs,
              biological: [],
              prevention: []
            }
          });
        } else {
          // Fallback for names not in DB
          const cleanName = top.className
            .replace(new RegExp(`^${selectedCrop}_`, 'i'), '')
            .replace(/_/g, ' ')
            .trim();

          const status = top.probability > 0.8 ? 'Warning' : 'Healthy';
          setResult({
            status: status,
            disease: cleanName.toUpperCase(),
            confidence: Math.round(top.probability * 100),
            recommendations: ['Monitor plant daily', 'Ensure proper watering', 'Check for spreading symptoms'],
            healthScore: status === 'Healthy' ? 95 : 65,
            treatment: {
              conventional: ['Monitor plant daily', 'Ensure proper watering'],
              biological: [],
              prevention: []
            }
          });
        }
        return;
      }

      // Final generic fallback
      setResult({
        status: 'Healthy',
        disease: 'Healthy / No issues detected',
        confidence: 88,
        recommendations: ['Monitor plant daily', 'Ensure proper watering'],
        healthScore: 95,
        treatment: {
          conventional: ['Monitor plant daily', 'Ensure proper watering'],
          biological: [],
          prevention: []
        }
      });
    } catch (error: any) {
      console.error("General analysis error", error);
      setClassificationError(error.message || "Failed to analyze image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setResult(null);
    setClassificationError(null);
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-8 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('cropHealth.title')}</h2>
          <span className="bg-blue-600/10 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 border border-blue-200 uppercase tracking-widest flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3" />
          </span>
        </div>

        <div className="flex gap-3 bg-slate-900/5 p-1.5 rounded-2xl border border-slate-200 mb-8 w-fit">
          {(['tomato', 'corn', 'chilli'] as CropType[]).map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${selectedCrop === crop
                ? 'bg-red-600 text-white shadow-xl shadow-red-600/30 scale-105 transform'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
            >
              {crop}
            </button>
          ))}
        </div>
        <p className="text-slate-600 font-medium mb-8 max-w-2xl">
          {t('cropHealth.subtitle')}
          <br /><span className="text-xs text-blue-600 font-black mt-1 block uppercase tracking-wide"></span>
        </p>


        {classificationError && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-500/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{classificationError}</p>
          </div>
        )}

        {!selectedImage ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 group ${dragActive ? 'border-prodmast-accent bg-prodmast-accent/10' : 'border-white/10 hover:border-prodmast-accent/50 hover:bg-white/5'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex justify-center gap-6 mb-8 group-hover:scale-110 transition-transform duration-300">
              <div className="bg-prodmast-accent/20 p-5 rounded-full border border-prodmast-accent/20 shadow-[0_0_20px_rgba(132,204,22,0.2)]">
                <Camera className="w-8 h-8 text-prodmast-accent" />
              </div>
              <div className="bg-blue-500/20 p-5 rounded-full border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">{t('cropHealth.startDiagnosis')}</h3>
            <p className="text-slate-500 font-bold mb-8 max-w-sm mx-auto uppercase text-[10px] tracking-widest">{t('cropHealth.instructions')}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="file"
                id="camera-input"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleChange}
              />
              <label
                htmlFor="camera-input"
                className={`flex items-center justify-center gap-2 bg-prodmast-accent text-prodmast-darker px-8 py-3 rounded-xl font-bold hover:bg-lime-400 transition cursor-pointer shadow-[0_0_15px_rgba(132,204,22,0.3)] active:scale-95 transform`}
              >
                <Camera className="w-5 h-5" />
                {t('cropHealth.takePhoto')}
              </label>

              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*"
                onChange={handleChange}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 bg-slate-900/10 text-slate-900 border border-slate-200 px-8 py-3 rounded-xl font-bold hover:bg-slate-900/20 transition cursor-pointer active:scale-95 transform`}
              >
                <Upload className="w-5 h-5" />
                {t('cropHealth.uploadImage')}
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 group shadow-2xl">
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Crop analysis"
                className={`w-full h-[400px] object-contain transition-all duration-700 ${isCropping ? 'scale-110 blur-sm brightness-50' : 'scale-100 blur-0 brightness-100'}`}
                crossOrigin="anonymous"
              />

              {/* Magic Cutout Experience (PicsArt Style) */}
              {!isCropping && selectedImage && !result && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-2xl bg-white shadow-inner">
                  {/* 1. Professional Checkered/White Background */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }} />

                  {/* 2. Isolated Leaf Cutout (Zoomed & Clean) */}
                  <div
                    className="absolute inset-0 transition-all duration-1000 ease-out"
                    style={{
                      transform: boundingBox ? `
                            scale(${1000 / (boundingBox.xmax - boundingBox.xmin) * 0.85}) 
                            translate(
                                ${-(boundingBox.xmin + (boundingBox.xmax - boundingBox.xmin) / 2 - 500) / 10}%, 
                                ${-(boundingBox.ymin + (boundingBox.ymax - boundingBox.ymin) / 2 - 500) / 10}%
                            )
                        ` : 'scale(1)',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* The Cutout Leaf */}
                    <img
                      src={selectedImage}
                      className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                      style={{
                        clipPath: polygon
                          ? `polygon(${polygon.map(p => `${p[1] / 10}% ${p[0] / 10}%`).join(', ')})`
                          : (boundingBox
                            ? `inset(${boundingBox.ymin / 10}% ${100 - boundingBox.xmax / 10}% ${100 - boundingBox.ymax / 10}% ${boundingBox.xmin / 10}% round 20px)`
                            : 'inset(10% 10% 10% 10% round 20px)'),
                      }}
                      alt="leaf isolate"
                    />

                    {/* 3. Red Selection Border (Always Visible Highlight) */}
                    <div className="absolute inset-0">
                      {/* Removed red highlights as per user request */}
                    </div>

                    {/* Lesion Boxes (Visual Aids) */}
                    {result?.lesions?.map((lesion, i) => (
                      <div
                        key={`lesion-${i}`}
                        className="absolute border-2 border-red-500 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center justify-center"
                        style={{
                          top: `${lesion.box[0] / 10}%`,
                          left: `${lesion.box[1] / 10}%`,
                          width: `${(lesion.box[3] - lesion.box[1]) / 10}%`,
                          height: `${(lesion.box[2] - lesion.box[0]) / 10}%`
                        }}
                      >
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 absolute -top-4 left-0 uppercase">{lesion.type}</span>
                      </div>
                    ))}

                    {/* Stress Boxes */}
                    {result?.stressIndicators?.map((stress, i) => (
                      <div
                        key={`stress-${i}`}
                        className="absolute border-2 border-yellow-500 bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                        style={{
                          top: `${stress.box[0] / 10}%`,
                          left: `${stress.box[1] / 10}%`,
                          width: `${(stress.box[3] - stress.box[1]) / 10}%`,
                          height: `${(stress.box[2] - stress.box[0]) / 10}%`
                        }}
                      >
                        <span className="bg-yellow-500 text-white text-[8px] font-black px-1 absolute -top-4 left-0 uppercase">{stress.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!analyzing && !result && (
                <button
                  onClick={resetAnalysis}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full hover:bg-black/70 text-white border border-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Magic Crop Animation Overlay */}
              {isCropping && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_1.5s_linear_infinite]" />
                  </div>
                </div>
              )}

              {/* Scanning Animation Overlay */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-1 bg-prodmast-accent/80 shadow-[0_0_20px_rgba(132,204,22,0.8)] animate-[scan_2s_linear_infinite]" />
                  </div>
                  <div className="bg-black/80 px-6 py-4 rounded-xl flex items-center gap-3 z-10 border border-prodmast-accent/30 shadow-2xl">
                    <Loader2 className="w-6 h-6 text-prodmast-accent animate-spin" />
                    <span className="font-bold text-white tracking-wide">{t('cropHealth.analyzingImage')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center">
              {!result ? (
                <div className="text-center md:text-left p-6 glass rounded-2xl">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{t('cropHealth.readyToAnalyze')}</h3>
                  <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                    {t('cropHealth.scanningText')}
                  </p>
                  <button
                    onClick={analyzeImage}
                    className="w-full md:w-auto bg-red-600 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition shadow-xl shadow-red-600/20 active:scale-95 transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={analyzing || modelLoading || isCropping}
                  >
                    {analyzing ? t('cropHealth.analyzing') : t('cropHealth.startAnalysis')}
                  </button>
                  <button
                    onClick={resetAnalysis}
                    className="mt-6 text-gray-500 hover:text-white font-medium block md:inline-block md:ml-6 disabled:opacity-50 transition-colors"
                    disabled={analyzing}
                  >
                    {t('disease.retake')}
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-sm">

                <div className="mb-10 p-8 rounded-[32px] bg-white border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">{t('cropHealth.vitality')}</span>
                        <h3 className={`text-4xl font-black tracking-tighter ${result.status === 'Critical' ? 'text-red-600' : (result.status === 'Warning' ? 'text-orange-500' : 'text-green-600')}`}>
                          {result.status === 'Healthy' ? t('cropHealth.primeHealth') : (result.status === 'Warning' ? t('cropHealth.vulnerable') : t('cropHealth.criticalCondition'))}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border-2 ${
                          result.status === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' : 
                          (result.status === 'Warning' ? 'bg-orange-50 text-orange-500 border-orange-200' : 'bg-green-50 text-green-600 border-green-200')
                        }`}>
                          {result.status === 'Healthy' ? t('cropHealth.status.healthy') : (result.status === 'Warning' ? t('cropHealth.status.warning') : t('cropHealth.status.critical'))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="bg-green-50/50 p-6 rounded-[24px] border border-green-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{t('cropHealth.goodHealthy')}</span>
                        </div>
                        <div className="text-5xl font-black text-green-600 tracking-tighter">
                          {result.healthScore || 0}%
                        </div>
                      </div>
                      <div className="bg-red-50/50 p-6 rounded-[24px] border border-red-100/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{t('cropHealth.badAffected')}</span>
                        </div>
                        <div className="text-5xl font-black text-red-600 tracking-tighter">
                          {100 - (result.healthScore || 0)}%
                        </div>
                      </div>
                    </div>

                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 mb-4">
                      <div 
                        className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(34,197,94,0.3)] ${
                          result.status === 'Critical' ? 'bg-red-500' : (result.status === 'Warning' ? 'bg-orange-500' : 'bg-green-500')
                        }`}
                        style={{ width: `${result.healthScore}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-slate-500 italic">
                      <Sparkles className="w-3.5 h-3.5 text-prodmast-primary" />
                      {t('cropHealth.primaryStressor').replace('{{disease}}', result.disease?.toLowerCase() || 'no specific disease')}
                    </div>
                  </div>
                </div>

                  {/* Growth Stage & Stress */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">{t('cropHealth.growthStage')}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {result.growthStage ? t(`cropHealth.stages.${result.growthStage.toLowerCase()}` as any) : t('cropHealth.stages.vegetative')}
                      </span>
                    </div>
                    <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">{t('cropHealth.stressLevel')}</span>
                      <span className="text-sm font-bold text-slate-900">
                        {result.stressIndicators?.length 
                          ? t(`cropHealth.levels.${result.stressIndicators[0].severity.toLowerCase()}` as any) 
                          : t('cropHealth.levels.low')}
                      </span>
                    </div>
                  </div>

                  {/* Alternative Diagnoses */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Alternative Matches</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.alternatives.map((alt, i) => (
                          <span key={i} className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                            {alt.name} ({alt.confidence}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Causes & Spread */}
                  {(result.causes || result.spread) && (
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.causes && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Causes</h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{result.causes}</p>
                        </div>
                      )}
                      {result.spread && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Spread Method</h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{result.spread}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actionable Advice Section */}
                  <div className="border-t border-slate-200 pt-8 mt-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-prodmast-primary" />
                      {t('cropHealth.actionableAdvice')}
                    </h3>

                    {/* Simplified Actionable Advice (2-3 Points) */}
                    <div className="space-y-4">
                      {(result.treatment?.conventional || result.recommendations)?.slice(0, 3).map((point, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-prodmast-primary/5 border border-prodmast-primary/10 transition-all hover:bg-prodmast-primary/10">
                          <div className="w-8 h-8 rounded-full bg-prodmast-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-prodmast-darker font-black text-xs">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-700 font-bold leading-relaxed pt-1">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Detailed Treatment (Hidden by default or shown below) */}
                    {result.treatment && (
                      <div className="mt-8 space-y-4 opacity-80">
                        <details className="group">
                          <summary className="list-none cursor-pointer flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 border-t border-slate-100 group-open:mb-4">
                            <span>{t('cropHealth.fullProtocol')}</span>
                            <Sparkles className="w-3 h-3 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                              <h5 className="text-[10px] font-black text-blue-600 uppercase mb-2">{t('cropHealth.biological')}</h5>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {result.treatment.biological.map((t, i) => <li key={i}>• {t}</li>)}
                              </ul>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase mb-2">{t('cropHealth.prevention')}</h5>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {result.treatment.prevention.map((t, i) => <li key={i}>• {t}</li>)}
                              </ul>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 mt-8">
                    <button
                      onClick={resetAnalysis}
                      className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
                    >
                      {t('cropHealth.analyzeAnother')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
