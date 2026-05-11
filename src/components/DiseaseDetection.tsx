import { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, X, Loader2, Camera, Bug, Sparkles } from 'lucide-react';
import { useImageClassifier, CropType } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';
import { analyzeImageWithGemini, detectPlantBoundingBox, cropImage, detectPlantPolygon, analyzeDetailedPlantHealth, identifyCropType } from '../lib/gemini';

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

const DISEASE_GUIDE: Record<string, { title: string, status: 'Healthy' | 'Warning' | 'Critical', recs: string[], bio: string[], prev: string[] }> = {
    'Tomato_healthy': {
        title: 'Tomato (Healthy)',
        status: 'Healthy',
        recs: ['Maintain current irrigation', 'Continue regular soil testing'],
        bio: ['Encourage beneficial insects', 'Use organic compost'],
        prev: ['Rotate crops annually', 'Monitor soil pH levels']
    },
    'Tomato__Tomato_mosaic_virus': {
        title: 'Tomato Mosaic Virus',
        status: 'Critical',
        recs: ['Remove and destroy infected plants', 'Control aphids and whiteflies'],
        bio: ['Use predatory mites', 'Apply neem oil sprays'],
        prev: ['Disinfect tools between use', 'Use certified virus-free seeds']
    },
    'Tomato__Tomato_YellowLeaf_Curl_Virus': {
        title: 'Tomato Yellow Leaf Curl Virus',
        status: 'Critical',
        recs: ['Use silver-colored mulches', 'Remove nearby weed hosts'],
        bio: ['Introduce parasitic wasps', 'Use microbial insecticides'],
        prev: ['Plant resistant varieties', 'Install fine mesh netting']
    },
    'Tomato_Late_blight': {
        title: 'Tomato Late Blight',
        status: 'Critical',
        recs: ['Apply copper-based fungicides', 'Avoid overhead watering'],
        bio: ['Apply Bacillus subtilis', 'Use seaweed extracts'],
        prev: ['Improve air circulation', 'Space plants properly']
    },
    'Tomato_Early_blight': {
        title: 'Tomato Early Blight',
        status: 'Warning',
        recs: ['Prune lower leaves', 'Apply organic fungicide'],
        bio: ['Use Trichoderma harzianum', 'Apply compost tea'],
        prev: ['Rotate crops every 3 years', 'Remove plant debris']
    },
    'Tomato_Septoria_leaf_spot': {
        title: 'Tomato Septoria Leaf Spot',
        status: 'Warning',
        recs: ['Remove infected foliage', 'Mulch around base'],
        bio: ['Use beneficial fungi sprays', 'Apply liquid kelp'],
        prev: ['Use drip irrigation only', 'Avoid working in wet fields']
    },
    'Tomato_Bacterial_spot': {
        title: 'Tomato Bacterial Spot',
        status: 'Warning',
        recs: ['Use treated seeds', 'Apply copper-based sprays'],
        bio: ['Apply bacteriophages', 'Use essential oil sprays'],
        prev: ['Avoid overhead irrigation', 'Manage weeds aggressively']
    },
    'Tomato_Spider_mites_Two_spotted_spider_mite': {
        title: 'Tomato Spider Mites',
        status: 'Warning',
        recs: ['Spray plants with water', 'Use neem oil spray'],
        bio: ['Introduce Phytoseiulus persimilis', 'Use lacewing larvae'],
        prev: ['Maintain high humidity', 'Control dust on leaves']
    },
    'Tomato_Leaf_Mold': {
        title: 'Tomato Leaf Mold',
        status: 'Warning',
        recs: ['Reduce humidity in greenhouse', 'Increase plant spacing'],
        bio: ['Apply Bacillus amyloliquefaciens', 'Use potassium bicarbonate'],
        prev: ['Plant resistant hybrids', 'Improve greenhouse ventilation']
    },
    'Tomato_Target_Spot': {
        title: 'Tomato Target Spot',
        status: 'Warning',
        recs: ['Apply fungicides early', 'Remove old plant debris'],
        bio: ['Apply Streptomyces lydicus', 'Use humic acid'],
        prev: ['Improve field drainage', 'Wider row spacing']
    },
    'Corn__healthy': {
        title: 'Corn (Healthy)',
        status: 'Healthy',
        recs: ['Maintain nitrogen levels', 'Monitor for borers'],
        bio: ['Use beneficial nematodes', 'Apply compost tea'],
        prev: ['Rotate with legumes', 'Ensure good drainage']
    },
    'Corn__Common_rust_': {
        title: 'Corn Common Rust',
        status: 'Warning',
        recs: ['Apply foliar fungicides', 'Plant resistant hybrids'],
        bio: ['Apply Bacillus subtilis', 'Use seaweed extract'],
        prev: ['Sow early in season', 'Remove crop residue']
    },
    'Corn__Gray_leaf_spot': {
        title: 'Corn Gray Leaf Spot',
        status: 'Critical',
        recs: ['Rotate with non-host crops', 'Apply fungicides at tasseling'],
        bio: ['Use Trichoderma species', 'Apply organic matter'],
        prev: ['Till under residue', 'Choose resistant varieties']
    },
    'Corn__Northern_Leaf_Blight': {
        title: 'Corn Northern Leaf Blight',
        status: 'Warning',
        recs: ['Apply labeled fungicides', 'Manage crop residue'],
        bio: ['Use microbial stimulants', 'Apply neem based products'],
        prev: ['Use 2-year crop rotation', 'Improve air flow']
    },
    'Chilli_healthy': {
        title: 'Chilli (Healthy)',
        status: 'Healthy',
        recs: ['Regular watering', 'Balanced fertilization'],
        bio: ['Use organic mulch', 'Encourage ladybugs'],
        prev: ['Regular soil testing', 'Monitor for thrips']
    },
    'Chilli_Anthracnose': {
        title: 'Chilli Anthracnose',
        status: 'Critical',
        recs: ['Apply copper fungicides', 'Remove infected fruits'],
        bio: ['Use Garlic extract', 'Apply Trichoderma'],
        prev: ['Use pathogen-free seeds', 'Avoid overhead irrigation']
    },
    'Chilli_Bacterial_Wilt': {
        title: 'Chilli Bacterial Wilt',
        status: 'Critical',
        recs: ['Remove and burn plants', 'Improve soil drainage'],
        bio: ['Apply Pseudomonas fluorescens', 'Use bio-fumigation'],
        prev: ['Long crop rotation', 'Maintain soil pH 6.5-7']
    },
    'Chilli_Leaf_Curl': {
        title: 'Chilli Leaf Curl Virus',
        status: 'Warning',
        recs: ['Control whitefly population', 'Remove viral hosts'],
        bio: ['Apply Neem oil', 'Use yellow sticky traps'],
        prev: ['Plant barrier crops', 'Use virus-resistant seeds']
    }
};

export function DiseaseDetection() {
    const { t, language } = useLanguage();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        status: 'success' | 'warning' | 'error' | null;
        category: string;
        confidence: number;
        reason: string;
    } | null>(null);
    const [selectedCrop, setSelectedCrop] = useState<CropType>('tomato');
    const [isCropping, setIsCropping] = useState(false);
    const [boundingBox, setBoundingBox] = useState<{ ymin: number, xmin: number, ymax: number, xmax: number } | null>(null);
    const [polygon, setPolygon] = useState<[number, number][] | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const { model, modelLoading, modelError, classifyImage, classifyAll, isCustomModelLoaded, initializeModels } = useImageClassifier();

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

            // 1. Identify & Validate Crop (Fastest Path)
            setIsCropping(true);
            try {
                const result = await identifyCropType(dataUrl, language);
                
                const status: 'success' | 'warning' | 'error' = result.category === 'invalid' ? 'error' : (result.confidence >= 80 ? 'success' : 'warning');

                setValidationResult({
                    status,
                    category: result.category,
                    confidence: result.confidence,
                    reason: result.reason
                });

                if (status === 'error') {
                    setIsCropping(false);
                    return;
                }

                if (result.category && ['tomato', 'corn', 'chilli'].includes(result.category)) {
                    setSelectedCrop(result.category as any);
                }

                // 2. Run cutout analysis in parallel only if valid
                const [boxResult, polyResult] = await Promise.all([
                    detectPlantBoundingBox(dataUrl),
                    detectPlantPolygon(dataUrl, (result.category && result.category !== 'other') ? (result.category as any) : selectedCrop)
                ]);

                if (polyResult && polyResult.polygon) setPolygon(polyResult.polygon);
                if (boxResult) setBoundingBox(boxResult);
            } catch (err) {
                console.warn("Processing failed:", err);
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

            // 1. Check for cached validation or run once
            let currentValidation = validationResult;
            if (!currentValidation || currentValidation.status === 'error') {
                const check = await identifyCropType(selectedImage, language);
                currentValidation = {
                    status: check.category === 'invalid' ? 'error' : (check.confidence >= 80 ? 'success' : 'warning'),
                    category: check.category,
                    confidence: check.confidence,
                    reason: check.reason
                };
                setValidationResult(currentValidation);
            }
            
            if (currentValidation.status === 'error' || currentValidation.confidence < 40) {
                setAnalyzing(false);
                return;
            }

            const classification = await classifyImage(imageRef.current!, selectedCrop);
            let currentCrop: CropType = selectedCrop;
            let useMultiScan = true;

            if (currentValidation.category && currentValidation.category !== 'invalid' && ['tomato', 'corn', 'chilli'].includes(currentValidation.category)) {
                currentCrop = currentValidation.category as CropType;
                setSelectedCrop(currentCrop);
                useMultiScan = false;
            }

            // 2. FOCUS: Teachable Machine (Priority #1)
            let predictions: { className: string; probability: number }[] = [];
            
            if (useMultiScan) {
                predictions = await classifyAll(imageRef.current!);
            } else {
                const result = await classifyImage(imageRef.current!, currentCrop);
                predictions = result.customPredictions || [];
            }
            
            if (predictions && predictions.length > 0) {
                const top = predictions[0];
                const dbKey = top.className;
                
                // Fuzzy matching for guide lookup
                let dbEntry = (DISEASE_GUIDE as any)[dbKey];
                if (!dbEntry) {
                    const similarKey = Object.keys(DISEASE_GUIDE).find(k => 
                        k.toLowerCase().replace(/_/g, '') === dbKey.toLowerCase().replace(/_/g, '') ||
                        dbKey.toLowerCase().includes(k.toLowerCase()) ||
                        k.toLowerCase().includes(dbKey.toLowerCase())
                    );
                    if (similarKey) dbEntry = (DISEASE_GUIDE as any)[similarKey];
                }

                // If TM is confident, we USE it
                if (top.probability > 0.3) {
                    const isHealthy = dbKey.toLowerCase().includes('healthy');
                    
                    setResult({
                        disease: dbEntry ? dbEntry.title.toUpperCase() : dbKey.replace(/_/g, ' ').toUpperCase(),
                        confidence: Math.round(top.probability * 100),
                        description: dbEntry 
                            ? `[Local Model] ${dbEntry.title} detected with high confidence.` 
                            : `[AI] ${dbKey.replace(/_/g, ' ')} detected. Analyzing specific details...`,
                        treatment: dbEntry ? dbEntry.recs : ['Monitor plant daily', 'Remove affected leaves'],
                        severity: dbEntry ? (dbEntry.status === 'Healthy' ? 'Low' : (dbEntry.status === 'Warning' ? 'Moderate' : 'High')) : (isHealthy ? 'Low' : 'Moderate'),
                        detailedTreatment: dbEntry ? {
                            conventional: dbEntry.recs,
                            biological: dbEntry.bio,
                            prevention: dbEntry.prev
                        } : {
                            conventional: ['Apply appropriate organic fungicide', 'Ensure proper spacing'],
                            biological: ['Apply neem oil spray'],
                            prevention: ['Rotate crops annually']
                        }
                    });

                    // Enrichment: Use Gemini ONLY to fill in the gaps in background
                    analyzeDetailedPlantHealth(imageToAnalyze, currentCrop, language).then(enriched => {
                        if (enriched) {
                            setResult(prev => prev ? {
                                ...prev,
                                description: enriched.causes || prev.description,
                                spread: enriched.spread || prev.spread,
                                detailedTreatment: enriched.treatment || prev.detailedTreatment,
                                disease: (dbEntry) ? prev.disease : (enriched.topDiagnosis?.name || prev.disease)
                            } : null);
                        }
                    });
                    
                    setAnalyzing(false);
                    return;
                }
            }

            // 2. Fallback to Gemini ONLY if Teachable Machine is not confident or fails
            const detailedResult = await analyzeDetailedPlantHealth(imageToAnalyze, selectedCrop, language);
            if (detailedResult) {
                setResult({
                    disease: detailedResult.topDiagnosis?.name || "Unknown Disease",
                    confidence: detailedResult.topDiagnosis?.confidence || 0,
                    description: detailedResult.causes || "Analysis complete. See treatment protocol below.",
                    treatment: detailedResult.treatment?.conventional || ["No specific treatment found"],
                    severity: detailedResult.topDiagnosis?.severity || "Moderate",
                    alternatives: detailedResult.alternatives || [],
                    lesions: detailedResult.lesions || [],
                    spread: detailedResult.spread || "N/A",
                    detailedTreatment: detailedResult.treatment
                });
                setAnalyzing(false);
                return;
            }

            // 3. Last Resort: Generic identification if everything else fails
            const genericResult = await analyzeImageWithGemini(imageToAnalyze, selectedCrop, language);
            if (genericResult) {
                setResult({
                    ...genericResult,
                    disease: genericResult.disease || "Plant Health Issue",
                    description: `[AI Analysis] ${genericResult.description}`
                });
                setAnalyzing(false);
                return;
            }

            // If we reach here, we truly failed
            throw new Error("All analysis paths failed");

        } catch (error: any) {
            console.error("General analysis error", error);
            setClassificationError("The analysis took too long or failed. Please ensure the image is clear and try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setSelectedImage(null);
        setResult(null);
        setValidationResult(null);
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


                </div>


                {validationResult && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${
                        validationResult.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                        validationResult.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        <div className={`mt-1 p-2 rounded-full ${
                            validationResult.status === 'success' ? 'bg-green-100 text-green-600' :
                            validationResult.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                        }`}>
                            {validationResult.status === 'success' ? <CheckCircle className="w-5 h-5" /> :
                             validationResult.status === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                             <X className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-lg">
                                    {validationResult.status === 'success' ? (language === 'kn' ? 'ಬೆಳೆ ಯಶಸ್ವಿಯಾಗಿ ಪತ್ತೆಯಾಗಿದೆ' : 'Crop Detected Successfully') :
                                     validationResult.status === 'warning' ? (language === 'kn' ? 'ಬೆಳೆಯನ್ನು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ' : 'Unable to Confirm Crop') :
                                     (language === 'kn' ? 'ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ' : 'No Crop Detected')}
                                </h4>
                                <span className="text-sm font-medium px-2 py-1 bg-white/50 rounded-lg border border-current/10">
                                    {validationResult.confidence}% {language === 'kn' ? 'ಖಚಿತತೆ' : 'Match'}
                                </span>
                            </div>
                            <p className="text-sm opacity-90">{validationResult.reason}</p>
                            {validationResult.status === 'warning' && (
                                <p className="mt-2 text-xs font-medium underline">
                                    {language === 'kn' ? 'ದಯವಿಟ್ಟು ಉತ್ತಮ ಬೆಳಕಿನಲ್ಲಿ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ.' : 'Please take a clearer photo in better lighting for better results.'}
                                </p>
                            )}
                        </div>
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
                                <div className="text-center md:text-left p-6 glass rounded-2xl relative overflow-hidden group">
                                    {validationResult?.status === 'success' && (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
                                        {validationResult?.status === 'success' ? (language === 'kn' ? 'ವಿಶ್ಲೇಷಣೆಗೆ ಸಿದ್ಧವಾಗಿದೆ' : 'READY TO ANALYZE') :
                                         validationResult?.status === 'warning' ? (language === 'kn' ? 'ಹೆಚ್ಚಿನ ಸ್ಪಷ್ಟತೆ ಅಗತ್ಯವಿದೆ' : 'NEEDS CLARITY') :
                                         (language === 'kn' ? 'ಅನೂರ್ಜಿತ ಚಿತ್ರ' : 'INVALID IMAGE')}
                                    </h3>
                                    
                                    <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                                        {validationResult?.status === 'success' 
                                            ? (language === 'kn' ? 'ಈ ಚಿತ್ರವು ವಿಶ್ಲೇಷಣೆಗೆ ಸೂಕ್ತವಾಗಿದೆ. ಮುಂದುವರಿಯಲು ಕೆಳಗಿನ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.' : 'This image looks great for analysis. Click the button below to start.')
                                            : (language === 'kn' ? 'ನಾವು ಕೃಷಿ ಸಂಬಂಧಿತ ವಸ್ತುಗಳನ್ನು ಮಾತ್ರ ವಿಶ್ಲೇಷಿಸುತ್ತೇವೆ. ದಯವಿಟ್ಟು ಬೆಳೆಯ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' : 'We only analyze farming-related content. Please upload a clear image of your crop.')}
                                    </p>

                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={analyzeImage}
                                            className={`w-full md:w-auto px-10 py-5 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 transform flex items-center justify-center gap-3 ${
                                                analyzing
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : validationResult?.status === 'warning'
                                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/50 hover:-translate-y-1'
                                                    : validationResult?.status === 'error'
                                                    ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200/50 hover:-translate-y-1'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200/50 hover:-translate-y-1'
                                            }`}
                                            disabled={analyzing}
                                        >
                                            {analyzing ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    {language === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' : 'ANALYZING...'}
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-6 h-6" />
                                                    {t('disease.identify')}
                                                </>
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={resetAnalysis}
                                            className="text-slate-500 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest pt-2 transition-colors flex items-center justify-center md:justify-start gap-2"
                                            disabled={analyzing}
                                        >
                                            <Upload className="w-3 h-3" />
                                            {t('disease.retake')}
                                        </button>
                                    </div>
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
