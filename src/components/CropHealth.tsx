import { useState, useRef, useEffect } from 'react';
import { Farm } from '../lib/types';
import { AlertCircle, CheckCircle, Upload, X, Loader2, Camera } from 'lucide-react';
import { useImageClassifier } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';

interface CropHealthProps {
  farm?: Farm;
}

interface AnalysisResult {
  status: 'Healthy' | 'Warning' | 'Critical';
  disease?: string;
  confidence: number;
  recommendations: string[];
}


export function CropHealth({ farm: _farm }: CropHealthProps) {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
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
      const { isPlant, predictions, error } = await classifyImage(imageRef.current);

      if (error) {
        setClassificationError(error);
        setAnalyzing(false);
        return;
      }

      // Strict Mode: If it's not detected as a plant, reject it.
      if (!isPlant && predictions.length > 0) {
        setClassificationError(`No crop detected. AI identified: ${predictions[0].className.split(',')[0]} (${Math.round(predictions[0].probability * 100)}%)`);
        setAnalyzing(false);
        return;
      }

      // 2. Proceed to Disease Analysis (Simulated)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const scenarios: AnalysisResult[] = [
        {
          status: 'Healthy',
          confidence: 94,
          recommendations: ['Continue current irrigation schedule', 'Monitor for pest activity']
        },
        {
          status: 'Warning',
          disease: 'Early Blight',
          confidence: 82,
          recommendations: ['Apply organic fungicide', 'Improve air circulation', 'Reduce leaf wetness']
        },
        {
          status: 'Critical',
          disease: 'Leaf Rust',
          confidence: 89,
          recommendations: ['Isolate affected plants', 'Apply sulfur-based fungicide', 'Adjust nitrogen levels']
        }
      ];

      // 3. Smart Simulation: Check for rust/disease keywords in predictions
      const rustPrediction = predictions.find(p => p.className.toLowerCase().includes('rust'));
      const isMaize = predictions.some(p => ['maize', 'corn', 'ear', 'leaf'].some(k => p.className.toLowerCase().includes(k)));
      const otherSymptoms = predictions.some(p =>
        ['fungus', 'spot', 'blight', 'mildew', 'infection', 'parasite', 'brown', 'yellow', 'pustule'].some(k =>
          p.className.toLowerCase().includes(k)
        )
      );

      let finalResult;
      if (rustPrediction || (isMaize && otherSymptoms)) {
        // High priority for Rust if detected by MobileNet or if it's a maize leaf with symptoms
        finalResult = scenarios.find(s => s.disease === 'Leaf Rust') || scenarios[2];
      } else if (otherSymptoms) {
        const diseases = scenarios.filter(s => s.status !== 'Healthy');
        finalResult = diseases[Math.floor(Math.random() * diseases.length)];
      } else {
        finalResult = scenarios[Math.floor(Math.random() * scenarios.length)];
      }

      setResult(finalResult);
    } catch (error) {
      console.error("Classification error", error);
      setClassificationError("Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }

    if (_farm) {
      // In a real app, we would save to DB here
      console.log("Saving to farm:", _farm.name);
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
          <span className="bg-slate-900/5 px-3 py-1 rounded-full text-[10px] font-black text-prodmast-primary border border-prodmast-primary/20 uppercase tracking-widest">
            Powered by AI (Simulated)
          </span>
        </div>
        <p className="text-slate-600 font-medium mb-8 max-w-2xl">
          {t('cropHealth.subtitle')}
          <br /><span className="text-xs text-amber-600 font-black mt-1 block uppercase tracking-wide">{t('cropHealth.note')}</span>
        </p>

        {modelLoading && (
          <div className="bg-blue-500/10 text-blue-400 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm border border-blue-500/20">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('cropHealth.initializing')}
          </div>
        )}

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
                className={`flex items-center justify-center gap-2 bg-prodmast-accent text-prodmast-darker px-8 py-3 rounded-xl font-bold hover:bg-lime-400 transition cursor-pointer shadow-[0_0_15px_rgba(132,204,22,0.3)] active:scale-95 transform ${modelLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
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
                className={`flex items-center justify-center gap-2 bg-slate-900/10 text-slate-900 border border-slate-200 px-8 py-3 rounded-xl font-bold hover:bg-slate-900/20 transition cursor-pointer active:scale-95 transform ${modelLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
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
                className="w-full h-[400px] object-contain"
                crossOrigin="anonymous"
              />
              {!analyzing && !result && (
                <button
                  onClick={resetAnalysis}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full hover:bg-black/70 text-white border border-white/20 transition"
                >
                  <X className="w-5 h-5" />
                </button>
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
                    className="w-full md:w-auto bg-prodmast-accent text-prodmast-darker px-8 py-4 rounded-xl font-bold text-lg hover:bg-lime-400 transition shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)] transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={analyzing || modelLoading}
                  >
                    {t('cropHealth.startAnalysis')}
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
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{t('cropHealth.analysisResult')}</span>
                      <h3 className="text-3xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                        {result.disease === 'Healthy' ? t('cropHealth.status.healthy') : result.disease || t('cropHealth.status.healthy')}
                      </h3>
                    </div>
                    <div className={`
                      px-5 py-2 rounded-xl font-bold flex items-center gap-2 border shadow-lg
                      ${result.status === 'Healthy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        result.status === 'Warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'}
                    `}>
                      {result.status === 'Healthy' ? <CheckCircle className="w-5 h-5" /> :
                        <AlertCircle className="w-5 h-5" />}
                      {result.status === 'Healthy' ? t('cropHealth.status.healthy') :
                        result.status === 'Warning' ? t('cropHealth.status.warning') : t('cropHealth.status.critical')}
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex justify-between text-sm text-slate-600 mb-2 font-black uppercase tracking-widest">
                      <span>{t('cropHealth.aiConfidence')}</span>
                      <span className="text-slate-900">{result.confidence}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-3 border border-white/5">
                      <div
                        className={`h-full rounded-full shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out ${result.confidence > 90 ? 'bg-prodmast-accent text-prodmast-accent' : 'bg-green-500 text-green-500'
                          }`}
                        style={{ width: `${result.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <CheckCircle className="w-5 h-5 text-prodmast-primary" />
                    {t('cropHealth.recommendations')}
                  </h4>
                  <ul className="space-y-3 mb-8">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-4 bg-slate-900/5 p-4 rounded-xl border border-slate-200/50 hover:bg-slate-900/10 transition">
                        <div className="min-w-[6px] h-6 w-1.5 bg-prodmast-primary rounded-full mt-0.5 shadow-[0_0_10px_rgba(132,204,22,0.5)]"></div>
                        <span className="text-slate-700 font-medium leading-relaxed">{rec}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={resetAnalysis}
                      className="w-full bg-slate-900/10 text-slate-900 border border-slate-200 px-6 py-4 rounded-xl font-bold hover:bg-slate-900/20 transition shadow-sm"
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
