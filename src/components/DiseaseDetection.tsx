import { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, X, Loader2, Camera, Bug, Sparkles } from 'lucide-react';
import { useImageClassifier, CropType } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeImageWithGemini, detectPlantBoundingBox, cropImage, detectPlantPolygon } from '../lib/gemini';

interface AnalysisResult {
    disease: string;
    confidence: number;
    description: string;
    treatment: string[];
    severity?: string;
    alternatives?: { name: string, confidence: number }[];
    lesions?: { box: number[], type: string }[];
    spread?: string;
    detailedTreatment?: { conventional: string[], biological: string[], prevention: string[] };
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
    }
};

export function DiseaseDetection() {
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

    const { model, modelLoading, modelError, classifyImage, isCustomModelLoaded, initializeModels } = useImageClassifier();

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

            // Trigger Instant Magic Crop & Cutout
            setIsCropping(true);
            try {
                const [boxResult, polyResult] = await Promise.all([
                    detectPlantBoundingBox(dataUrl),
                    detectPlantPolygon(dataUrl, selectedCrop)
                ]);

                if (polyResult && polyResult.polygon) {
                    setPolygon(polyResult.polygon);
                }

                if (boxResult) {
                    setBoundingBox(boxResult);
                    // No physical crop, we use CSS zoom now
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

            // 1. FOCUS: Teachable Machine Local Analysis First
            const { customPredictions, error: localError } = await classifyImage(imageRef.current!, selectedCrop);
            
            if (!localError && customPredictions && customPredictions.length > 0) {
                const top = customPredictions[0];
                const dbKey = top.className;
                const dbEntry = (DISEASE_GUIDE as any)[dbKey];

                if (dbEntry && top.probability > 0.4) {
                    // Use Local Data primarily
                    setResult({
                        disease: dbEntry.title.toUpperCase(),
                        confidence: Math.round(top.probability * 100),
                        description: `[Local Model] ${dbEntry.title} detected with high confidence.`,
                        treatment: dbEntry.recs,
                        severity: dbEntry.status === 'Healthy' ? 'Low' : (dbEntry.status === 'Warning' ? 'Moderate' : 'High'),
                        detailedTreatment: {
                            conventional: dbEntry.recs,
                            biological: [],
                            prevention: []
                        }
                    });

                    // Optional: Try to enrich with Gemini in background if possible
                    analyzeDetailedPlantHealth(imageToAnalyze, selectedCrop, language).then(enriched => {
                        if (enriched) {
                            setResult(prev => prev ? {
                                ...prev,
                                description: enriched.causes || prev.description,
                                spread: enriched.spread || prev.spread,
                                detailedTreatment: enriched.treatment || prev.detailedTreatment
                            } : null);
                        }
                    });
                    
                    setAnalyzing(false);
                    return;
                }
            }

            // 2. Fallback to Gemini Detailed Analysis
            const detailedResult = await analyzeDetailedPlantHealth(imageToAnalyze, selectedCrop, language);
            
            if (detailedResult) {
                setResult({
                    disease: detailedResult.topDiagnosis?.name || "Unknown Disease",
                    confidence: detailedResult.topDiagnosis?.confidence || 0,
                    description: detailedResult.causes || "No description available",
                    treatment: detailedResult.treatment?.conventional || ["No treatment data found"],
                    severity: detailedResult.topDiagnosis?.severity || "Moderate",
                    alternatives: detailedResult.alternatives || [],
                    lesions: detailedResult.lesions || [],
                    spread: detailedResult.spread || "N/A",
                    detailedTreatment: detailedResult.treatment
                });
                setAnalyzing(false);
                return;
            }

            // 3. Last Resort: Generic Gemini
            const geminiResult = await analyzeImageWithGemini(imageToAnalyze, selectedCrop, language);
            if (geminiResult) {
                setResult({
                    ...geminiResult,
                    description: `[AI] ${geminiResult.description}`
                });
                setAnalyzing(false);
                return;
            }

        } catch (error: any) {
            console.error("General analysis error", error);
            setClassificationError(t('cropHealth.failedToIdentify'));
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 premium-glow-red">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 flex items-center gap-3">
                            <Bug className="w-8 h-8 text-red-600" />
                            {t('disease.title')}
                        </h2>
                        <p className="text-slate-600 font-medium">{t('disease.subtitle')}</p>
                    </div>

                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {(['tomato', 'corn', 'chilli'] as CropType[]).map((crop) => (
                            <button
                                key={crop}
                                onClick={() => setSelectedCrop(crop)}
                                className={`px-4 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${selectedCrop === crop
                                    ? 'bg-red-600 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                {crop}
                            </button>
                        ))}
                    </div>
                </div>


                {(classificationError || modelError) && !result && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">{classificationError || modelError}</p>
                    </div>
                )}

                {!selectedImage ? (
                    <div
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-red-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="flex justify-center gap-4 mb-6">
                            <div className="bg-red-100 p-4 rounded-full">
                                <Camera className="w-8 h-8 text-red-600" />
                            </div>
                            <div className="bg-blue-100 p-4 rounded-full">
                                <Upload className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{t('disease.identify')}</h3>
                        <p className="text-slate-500 font-bold mb-8 max-w-sm mx-auto uppercase text-[10px] tracking-widest">{t('disease.instructions')}</p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <input
                                type="file"
                                id="disease-camera"
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={handleChange}
                            />
                            <label
                                htmlFor="disease-camera"
                                className={`flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition cursor-pointer shadow-md active:scale-95 transform`}
                            >
                                <Camera className="w-5 h-5" />
                                {t('disease.capture')}
                            </label>

                            <input
                                type="file"
                                id="disease-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleChange}
                            />
                            <label
                                htmlFor="disease-upload"
                                className={`flex items-center justify-center gap-2 bg-slate-100 text-slate-900 border border-slate-200 px-6 py-3 rounded-lg font-bold hover:bg-slate-200 transition cursor-pointer shadow-sm active:scale-95 transform`}
                            >
                                <Upload className="w-5 h-5" />
                                {t('disease.upload')}
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black group">
                            <img
                                ref={imageRef}
                                src={selectedImage}
                                alt="Disease analysis"
                                className={`w-full h-[400px] object-contain transition-all duration-700 ${isCropping ? 'scale-110 blur-sm brightness-50' : 'scale-100 blur-0 brightness-100'}`}
                                crossOrigin="anonymous"
                            />

                            {/* Magic Cutout Experience (PicsArt Style) */}
                            {!isCropping && selectedImage && !result && (
                                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl bg-white shadow-inner">
                                    {/* 1. Professional Checkered Background */}
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
                                                    ${-(boundingBox.xmin + (boundingBox.xmax - boundingBox.xmin)/2 - 500) / 10}%, 
                                                    ${-(boundingBox.ymin + (boundingBox.ymax - boundingBox.ymin)/2 - 500) / 10}%
                                                )
                                            ` : 'scale(1)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        <img 
                                            src={selectedImage} 
                                            className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
                                            style={{
                                                clipPath: polygon 
                                                    ? `polygon(${polygon.map(p => `${p[1]/10}% ${p[0]/10}%`).join(', ')})`
                                                    : (boundingBox 
                                                        ? `inset(${boundingBox.ymin/10}% ${100 - boundingBox.xmax/10}% ${100 - boundingBox.ymax/10}% ${boundingBox.xmin/10}% round 20px)`
                                                        : 'inset(10% 10% 10% 10% round 20px)'),
                                            }}
                                            alt="leaf focus"
                                        />
                                        
                                        {/* Visual Aids: Lesion Boxes */}
                                        {result?.lesions?.map((lesion, i) => (
                                            <div 
                                                key={`lesion-${i}`}
                                                className="absolute border-2 border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                                style={{
                                                    top: `${lesion.box[0]/10}%`,
                                                    left: `${lesion.box[1]/10}%`,
                                                    width: `${(lesion.box[3] - lesion.box[1])/10}%`,
                                                    height: `${(lesion.box[2] - lesion.box[0])/10}%`
                                                }}
                                            >
                                                <div className="absolute -top-5 left-0 bg-red-500 text-white text-[8px] font-black px-1 uppercase whitespace-nowrap">
                                                    {lesion.type} DETECTED
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!analyzing && !result && (
                                <button
                                    onClick={resetAnalysis}
                                    className="absolute top-4 right-4 bg-white/90 p-2 rounded-full hover:bg-white text-gray-800 shadow-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {isCropping && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 backdrop-blur-[2px]">
                                    <div className="absolute inset-0 overflow-hidden">
                                        <div className="w-full h-1 bg-red-400/80 shadow-[0_0_15px_rgba(248,113,113,0.8)] animate-[scan_1.5s_linear_infinite]" />
                                    </div>
                                    <div className="bg-white/90 px-6 py-3 rounded-lg flex items-center gap-3 z-10">
                                        <Sparkles className="w-5 h-5 text-red-600 animate-pulse" />
                                        <span className="font-bold text-gray-800 uppercase text-xs tracking-widest">
                                          {language === 'kn' ? 'ಮ್ಯಾಜಿಕ್ ಕ್ರಾಪ್ ಅನ್ವಯಿಸಲಾಗುತ್ತಿದೆ...' : 'Applying Magic Crop...'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {analyzing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="absolute inset-0 overflow-hidden">
                                        <div className="w-full h-1 bg-red-400/80 shadow-[0_0_15px_rgba(248,113,113,0.8)] animate-[scan_2s_linear_infinite]" />
                                    </div>
                                    <div className="bg-white/90 px-6 py-3 rounded-lg flex items-center gap-3 z-10">
                                        <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                                        <span className="font-semibold text-gray-800">{t('disease.identifying')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col justify-center">
                            {!result ? (
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{t('disease.readyToIdentify')}</h3>
                                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                                        {t('disease.scanInstructions')}
                                    </p>
                                    <button
                                        onClick={analyzeImage}
                                        className="w-full md:w-auto bg-red-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={analyzing || modelLoading || isCropping}
                                    >
                                        {t('disease.identify')}
                                    </button>
                                    <button
                                        onClick={resetAnalysis}
                                        className="mt-4 text-gray-500 hover:text-gray-700 font-medium block md:inline-block md:ml-6 disabled:opacity-50"
                                        disabled={analyzing}
                                    >
                                        {t('disease.retake')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                            {result.disease}
                                        </h3>
                                        <div className={`
                                            px-4 py-1.5 rounded-full text-sm font-black border-2 shadow-sm
                                            ${result.severity === 'High' ? 'bg-red-600 text-white border-red-700' :
                                                result.severity === 'Moderate' ? 'bg-orange-500 text-white border-orange-600' :
                                                    'bg-green-500 text-white border-green-600'}
                                        `}>
                                            {result.severity === 'High' ? t('cropHealth.levels.high') : 
                                             result.severity === 'Moderate' ? t('cropHealth.levels.moderate') : 
                                             t('cropHealth.levels.low')} {language === 'kn' ? 'ತೀವ್ರತೆ' : 'Severity'}
                                        </div>
                                    </div>

                                    {/* Alternative Diagnoses */}
                                    {result.alternatives && result.alternatives.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full">
                                              {language === 'kn' ? 'ಪರ್ಯಾಯ ರೋಗನಿರ್ಣಯಗಳು' : 'Alternative Diagnoses'}
                                            </span>
                                            {result.alternatives.map((alt, i) => (
                                                <span key={i} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">
                                                    {alt.name} ({alt.confidence}%)
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-slate-700 text-lg leading-relaxed font-bold">
                                        {result.description}
                                    </p>

                                    {/* Causes & Spread */}
                                    {result.spread && (
                                        <div className="p-5 bg-slate-900/5 rounded-2xl border-2 border-slate-200/50">
                                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                                              {language === 'kn' ? 'ಹರಡುವಿಕೆ ಮತ್ತು ಮಾದರಿ' : 'Spread & Pattern'}
                                            </h5>
                                            <p className="text-sm text-slate-800 font-bold leading-relaxed">{result.spread}</p>
                                        </div>
                                    )}

                                    {/* Detailed Treatment Section */}
                                    <div className="space-y-6">
                                        <h4 className="font-black text-slate-900 flex items-center gap-3 uppercase text-sm tracking-widest border-b-2 border-slate-100 pb-2">
                                            <CheckCircle className="w-6 h-6 text-prodmast-primary" />
                                            {t('disease.treatment')}
                                        </h4>
                                        
                                        {result.detailedTreatment ? (
                                            <div className="space-y-3">
                                                <div className="bg-emerald-500/5 p-6 rounded-2xl border-2 border-emerald-500/20 shadow-sm">
                                                    <span className="text-xs font-black text-emerald-700 uppercase tracking-widest block mb-4 border-b border-emerald-500/20 pb-2">
                                                      {language === 'kn' ? 'ಸಾಂಪ್ರದಾಯಿಕ ಪರಿಹಾರ' : 'Conventional Remediation'}
                                                    </span>
                                                    <ul className="space-y-3">
                                                        {result.detailedTreatment.conventional.map((step, i) => (
                                                            <li key={i} className="text-sm text-emerald-900 font-bold flex items-start gap-3">
                                                                <div className="min-w-[8px] h-5 w-2 bg-emerald-500 rounded-full mt-0.5 shadow-sm" />
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-blue-500/5 p-6 rounded-2xl border-2 border-blue-500/20 shadow-sm">
                                                    <span className="text-xs font-black text-blue-700 uppercase tracking-widest block mb-4 border-b border-blue-500/20 pb-2">
                                                      {language === 'kn' ? 'ಜೈವಿಕ ನಿಯಂತ್ರಣ' : 'Biological Control'}
                                                    </span>
                                                    <ul className="space-y-3">
                                                        {result.detailedTreatment.biological.map((step, i) => (
                                                            <li key={i} className="text-sm text-blue-900 font-bold flex items-start gap-3">
                                                                <div className="min-w-[8px] h-5 w-2 bg-blue-500 rounded-full mt-0.5 shadow-sm" />
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="bg-slate-500/5 p-6 rounded-2xl border-2 border-slate-500/20 shadow-sm">
                                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest block mb-4 border-b border-slate-500/20 pb-2">
                                                      {language === 'kn' ? 'ತಡೆಗಟ್ಟುವ ಸಲಹೆ' : 'Prevention Advice'}
                                                    </span>
                                                    <ul className="space-y-3">
                                                        {result.detailedTreatment.prevention.map((step, i) => (
                                                            <li key={i} className="text-sm text-slate-800 font-bold flex items-start gap-3">
                                                                <div className="min-w-[8px] h-5 w-2 bg-slate-400 rounded-full mt-0.5 shadow-sm" />
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : (
                                            <ul className="space-y-2">
                                                {result.treatment.map((step, i) => (
                                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-3">
                                                        <div className="min-w-[6px] h-6 w-1.5 bg-prodmast-primary rounded-full mt-0.5"></div>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <button
                                        onClick={resetAnalysis}
                                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition shadow-md"
                                    >
                                        {language === 'kn' ? 'ಇನ್ನೊಂದನ್ನು ವಿಶ್ಲೇಷಿಸಿ' : 'Analyze Another'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
