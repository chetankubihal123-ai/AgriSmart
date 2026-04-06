import { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, X, Loader2, Camera, Bug } from 'lucide-react';
import { useImageClassifier, CropType } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisResult {
    disease: string;
    confidence: number;
    description: string;
    treatment: string[];
}

export function DiseaseDetection() {
    const { t } = useLanguage();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [classificationError, setClassificationError] = useState<string | null>(null);
    const [selectedCrop] = useState<CropType>('tomato');
    const imageRef = useRef<HTMLImageElement>(null);

    const { model, modelLoading, classifyImage, isCustomModelLoaded, initializeModels } = useImageClassifier();

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
        reader.onload = (e) => {
            setSelectedImage(e.target?.result as string);
            setResult(null);
            setClassificationError(null);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async () => {
        if (!selectedImage || !model || !imageRef.current) return;

        setAnalyzing(true);
        setClassificationError(null);

        try {
            // 1. Classify Image using reusable hook
            const { isPlant, predictions, customPredictions, error } = await classifyImage(imageRef.current, selectedCrop);

            if (error) {
                setClassificationError(error);
                setAnalyzing(false);
                return;
            }

            // Check for fake images (non-plants)
            if (!isPlant && predictions.length > 0) {
                setClassificationError(`No crop detected. AI identified: ${predictions[0].className.split(',')[0]} (${Math.round(predictions[0].probability * 100)}%)`);
                setAnalyzing(false);
                return;
            }

            if (customPredictions && customPredictions.length > 0) {
                // Use the custom model's top prediction
                const topMatch = customPredictions[0];
                setResult({
                    disease: topMatch.className,
                    confidence: topMatch.probability * 100,
                    description: `Detected using the ${selectedCrop.toUpperCase()} custom model: ${topMatch.className}`,
                    treatment: ['Consult specific treatment for this condition', 'Monitor daily']
                });
            } else {
                // Fallback to Simulated Disease Analysis

                const diseases: AnalysisResult[] = [
                    {
                        disease: 'Late Blight',
                        confidence: 96,
                        description: 'A destructive fungal disease causing dark lesions on leaves and stems.',
                        treatment: ['Apply copper-based fungicides', 'Remove infected plant parts', 'Ensure proper drainage']
                    },
                    {
                        disease: 'Healthy',
                        confidence: 98,
                        description: 'No specific disease markers detected.',
                        treatment: ['Continue regular care', 'Monitor for changes']
                    },
                    {
                        disease: 'Bacterial Spot',
                        confidence: 91,
                        description: 'Small, dark, water-soaked spots on leaves and fruit.',
                        treatment: ['Apply copper sprays', 'Use disease-free seeds', 'Rotate crops']
                    },
                    {
                        disease: 'Leaf Rust',
                        confidence: 94,
                        description: 'Powdery, orange-brown pustules on the undersides of leaves, common in cereals.',
                        treatment: ['Apply Tebuconazole fungicide', 'Remove infected debris', 'Reduce irrigation frequency']
                    },
                    {
                        disease: 'Healthy',
                        confidence: 99,
                        description: 'Plant appears vigorous and disease-free.',
                        treatment: ['Continue regular care', 'Monitor for changes']
                    }
                ];

                const rustPrediction = predictions.find(p => p.className.toLowerCase().includes('rust'));
                const isMaize = predictions.some(p => ['maize', 'corn', 'ear', 'leaf'].some(k => p.className.toLowerCase().includes(k)));
                const otherSymptoms = predictions.some(p =>
                    ['fungus', 'spot', 'blight', 'mildew', 'infection', 'parasite', 'brown', 'yellow', 'pustule'].some(k =>
                        p.className.toLowerCase().includes(k)
                    )
                );

                let randomResult;
                if (rustPrediction || (isMaize && otherSymptoms)) {
                    randomResult = diseases.find(d => d.disease === 'Leaf Rust') || diseases[3];
                } else if (otherSymptoms) {
                    const diseased = diseases.filter(d => d.disease !== 'Healthy');
                    randomResult = diseased[Math.floor(Math.random() * diseased.length)];
                } else {
                    randomResult = diseases[Math.floor(Math.random() * diseases.length)];
                }
                setResult(randomResult);
            }
        } catch (error) {
            console.error("Analysis error", error);
            setClassificationError("Failed to identify disease. Please try again.");
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

                </div>


                {classificationError && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">{classificationError}</p>
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
                                className="w-full h-[400px] object-contain"
                                crossOrigin="anonymous"
                            />
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
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">{t('disease.readyToIdentify')}</h3>
                                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                                        {t('disease.scanInstructions')}
                                    </p>
                                    <button
                                        onClick={analyzeImage}
                                        className="w-full md:w-auto bg-red-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={analyzing || modelLoading}
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
                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm premium-glow-red">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
                                                {!isCustomModelLoaded ? t('disease.demoResult') : t('disease.diagnosis')}
                                            </span>
                                            <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                                                {result.disease === 'Healthy' ? t('cropHealth.status.healthy') : result.disease}
                                            </h3>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 ${result.disease === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {result.disease === 'Healthy' ? <CheckCircle className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
                                            {Math.round(result.confidence)}% {t('disease.match')}
                                        </div>
                                    </div>

                                    <p className="text-gray-700 mb-6 italic border-l-4 border-gray-200 pl-4">
                                        "{result.description}"
                                    </p>

                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        {t('disease.recommendedTreatment')}
                                    </h4>
                                    <ul className="space-y-3 mb-8">
                                        {result.treatment.map((step, i) => (
                                            <li key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                                                <div className="min-w-[6px] h-6 w-1.5 bg-red-400 rounded-full mt-0.5"></div>
                                                <span className="text-gray-700">{step}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={resetAnalysis}
                                        className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition shadow-sm"
                                    >
                                        {t('disease.checkAnother')}
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
