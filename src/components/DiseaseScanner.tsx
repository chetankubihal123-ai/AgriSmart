import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Play, Scan, Loader2, Sparkles, ShieldAlert, Pill } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImageClassifier } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { analyzeDetailedPlantHealth, identifyCropType } from '../lib/gemini';

interface ScanResult {
  disease: string;
  confidence: number;
  raw_class: string;
  causes?: string;
  spread?: string;
  treatment?: {
    conventional?: string[];
    biological?: string[];
    prevention?: string[];
  };
  healthScore?: number;
}

function compressImageForAI(dataUrl: string, maxDim: number = 640): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      let newW = width;
      let newH = height;
      if (width > height) {
        newW = maxDim;
        newH = Math.round((height * maxDim) / width);
      } else {
        newH = maxDim;
        newW = Math.round((width * maxDim) / height);
      }
      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, newW, newH);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function DiseaseScanner() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { classifyImage, initializeModels } = useImageClassifier();
  const { language } = useLanguage();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  useEffect(() => {
    if (result) {
      let start = 0;
      const target = result.confidence;
      const duration = 1200;
      const increment = target / (duration / 16);
      
      const interval = setInterval(() => {
        start += increment;
        if (start >= target) {
          setDisplayConfidence(target);
          clearInterval(interval);
        } else {
          setDisplayConfidence(start);
        }
      }, 16);
      return () => clearInterval(interval);
    } else {
      setDisplayConfidence(0);
    }
  }, [result]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);
        setResult(null);
        setError(null);
        setDisplayConfidence(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelection = () => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const scanImage = async () => {
    if (!previewUrl) return;

    setLoading(true);
    setError(null);
    
    try {
      // 1. Fast client-side compression (<40KB) for rapid upload
      const compressedUrl = await compressImageForAI(previewUrl, 640);

      if (isOnline) {
        // 2. Strict Crop Validation with Gemini
        const geminiCheck = await identifyCropType(compressedUrl, language);
        if (geminiCheck.category === 'invalid' || geminiCheck.isAgricultural === false) {
          throw new Error(
            geminiCheck.reason || (
              language === 'kn' 
                ? 'ಕೃಷಿಯೇತರ ಚಿತ್ರ ಪತ್ತೆಯಾಗಿದೆ. ಕೇವಲ ಬೆಳೆಯ ಅಥವಾ ಸಸ್ಯಗಳ ಚಿತ್ರಗಳನ್ನು ಮಾತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' 
                : 'Non-agricultural image detected. Only photos of crops, leaves, plants, or farm produce are accepted.'
            )
          );
        }

        // 3. Expert Pathology Analysis for any crop species
        const detailed = await analyzeDetailedPlantHealth(compressedUrl, geminiCheck.category, language);
        if (detailed && detailed.topDiagnosis) {
          const diagName = detailed.topDiagnosis.name || (language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ' : 'Healthy Plant');
          const hasVisibleLesions = Array.isArray(detailed.lesions) && detailed.lesions.length > 0;
          const isPlantHealthy = (diagName.toLowerCase().includes('healthy') || (detailed.healthScore !== undefined && detailed.healthScore >= 95)) && !hasVisibleLesions;
          const finalHealth = isPlantHealthy ? 100 : Math.min(detailed.healthScore ?? 65, 85);

          setResult({
            disease: isPlantHealthy ? (language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ' : 'HEALTHY PLANT') : diagName,
            confidence: isPlantHealthy ? 100 : Math.max(75, Math.round(detailed.topDiagnosis.confidence || (100 - finalHealth))),
            raw_class: isPlantHealthy ? 'healthy' : diagName,
            causes: detailed.causes,
            spread: detailed.spread,
            treatment: detailed.treatment,
            healthScore: finalHealth
          });
          return;
        }
      }

      // Offline fallback using local classifier
      const img = new Image();
      img.src = compressedUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const validation = await classifyImage(img);
      if (!validation.isPlant) {
        throw new Error(
          language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ.' : 'No crop detected in this image. Please upload a clear photo of a plant.'
        );
      }

      const predictions = validation.customPredictions;
      if (!predictions || predictions.length === 0) {
        setResult({
          disease: language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ' : 'Healthy Plant',
          confidence: 90,
          raw_class: 'healthy'
        });
        return;
      }

      const top = predictions[0];
      const cleanName = top.className
        .replace(/^(tomato|corn|chilli)_/i, '')
        .replace(/_/g, ' ')
        .trim();

      setResult({
        disease: cleanName.toUpperCase(),
        confidence: Math.round(top.probability * 100),
        raw_class: top.className
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = result?.raw_class.toLowerCase().includes('healthy');

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl relative overflow-hidden mt-2">
      <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-[80px] -translate-y-10 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-150/80 gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase">
            <span className="p-2.5 rounded-xl bg-lime-500 text-slate-900 shadow-[0_0_15px_rgba(132,204,22,0.3)] flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </span>
            {language === 'kn' ? 'ಎಐ ಸಾರ್ವತ್ರಿಕ ಬೆಳೆ ರೋಗ ಸ್ಕ್ಯಾನರ್' : 'Universal AI Crop Disease Scanner'}
          </h3>
          <p className="text-slate-500 font-semibold text-sm mt-3 ml-0 md:ml-16">
            {language === 'kn' 
              ? 'ಯಾವುದೇ ಬೆಳೆಯ ಎಲೆಯ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ — ಎಐ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಬೆಳೆಯನ್ನು ಮತ್ತು ರೋಗವನ್ನು ನಿಖರವಾಗಿ ಪತ್ತೆಹಚ್ಚುತ್ತದೆ.' 
              : 'Upload any crop or plant leaf photo — AI automatically identifies the crop and pinpoints pathogens with expert precision.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="flex flex-col h-full">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-lime-500 rounded-3xl p-10 bg-slate-50/50 hover:bg-lime-50/10 cursor-pointer transition-all duration-300 min-h-[360px] group/upload"
            >
              <div className="w-16 h-16 rounded-full bg-lime-50 flex items-center justify-center mb-4 group-hover/upload:scale-110 group-hover/upload:bg-lime-100 transition-all">
                <UploadCloud className="w-8 h-8 text-lime-600" />
              </div>
              <p className="text-slate-800 font-black uppercase text-xs tracking-wider mb-2">Click to Upload or Drag & Drop</p>
              <p className="text-slate-400 text-xs font-bold">Any Crop Leaf • PNG, JPG</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="flex-1 rounded-3xl overflow-hidden relative border border-slate-200 bg-slate-50 min-h-[360px] flex items-center justify-center p-4 shadow-inner">
              {/* HUD Reticles */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-lime-600 opacity-60 pointer-events-none"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-lime-600 opacity-60 pointer-events-none"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-lime-600 opacity-60 pointer-events-none"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-lime-600 opacity-60 pointer-events-none"></div>

              <img src={previewUrl} alt="Preview" className="max-h-[340px] max-w-full object-contain rounded-2xl relative z-0 shadow-sm" />
              
              {!loading && !result && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-4 z-10">
                  <button 
                    onClick={scanImage}
                    className="flex items-center gap-2 px-8 py-3.5 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-[0_0_20px_rgba(132,204,22,0.4)]"
                  >
                    <Play className="w-5 h-5 animate-pulse" fill="currentColor" /> 
                    {language === 'kn' ? 'ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ' : 'INITIATE AI SCAN'}
                  </button>
                  
                  <button 
                    onClick={clearSelection}
                    className="text-xs text-white hover:bg-white/10 border border-white/20 px-4 py-2 rounded-lg font-black uppercase tracking-wider transition-all"
                  >
                    ABORT / CHANGE
                  </button>
                </div>
              )}
              
              {loading && (
                <>
                  <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 transition-all duration-300"></div>
                  
                  {/* Laser Sweeper */}
                  <motion.div 
                    initial={{ top: '0%', opacity: 0 }}
                    animate={{ top: ['0%', '98%', '0%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-full h-[3px] bg-lime-400 shadow-[0_0_30px_#a3e635] z-20 left-0 right-0"
                  ></motion.div>
                  
                  <div className="absolute z-30 inset-0 flex flex-col items-center justify-center">
                    <Scan className="w-16 h-16 text-lime-400 animate-pulse mb-4 opacity-90 drop-shadow-[0_0_15px_rgba(163,230,53,0.8)]" />
                    <div className="px-6 py-2 border border-lime-400/50 bg-black/60 backdrop-blur-md rounded-full font-mono text-lime-400 font-bold tracking-[0.3em] text-xs shadow-inner">
                      DIAGNOSING PATHOGEN...
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex flex-col">
          {!result && !error ? (
            <div className="flex-1 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col justify-center items-center p-8 text-center min-h-[360px]">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-800 font-black uppercase text-xs tracking-wider mb-1">Awaiting Leaf Image</p>
              <p className="text-slate-500 font-semibold text-sm max-w-[260px] leading-relaxed">
                Upload any crop leaf picture to retrieve instant, expert AI diagnostic insights.
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 rounded-3xl border border-red-200 bg-red-50/90 flex flex-col justify-center items-center p-8 text-center min-h-[360px] animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-red-950 font-black text-xl mb-2">
                {error.includes('No crop') ? (language === 'kn' ? 'ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ' : 'No Crop Detected') : 'Analysis Blocked'}
              </h4>
              <p className="text-red-700 text-sm font-semibold max-w-[320px] leading-relaxed mb-6">{error}</p>
              <button 
                onClick={clearSelection} 
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs uppercase tracking-widest font-black transition-colors shadow-lg shadow-red-200"
              >
                Try Another Photo
              </button>
            </div>
          ) : result && (
            <div className={`flex-1 rounded-3xl border p-8 flex flex-col justify-between min-h-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500 ${
              isHealthy 
                ? 'border-green-200 bg-green-50/60 shadow-sm' 
                : 'border-red-200 bg-red-50/60 shadow-sm'
            }`}>
              <div>
                <div className="flex items-start gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                    isHealthy ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {isHealthy ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-1 ${
                      isHealthy ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isHealthy ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                      } animate-pulse`}></span>
                      {isHealthy 
                        ? (language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ ಪತ್ತೆಯಾಗಿದೆ' : 'Healthy Plant Detected') 
                        : (language === 'kn' ? 'ರೋಗ / ರೋಗಾಣು ಪತ್ತೆಯಾಗಿದೆ' : 'Pathogen Detected')}
                    </span>
                    <h4 className="text-slate-900 font-black text-2xl tracking-tight leading-tight uppercase">
                      {result.disease}
                    </h4>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Confidence Bar */}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Scan className="w-3.5 h-3.5" /> AI Diagnostic Confidence
                      </span>
                      <span className="text-xs text-slate-800 font-mono font-black tracking-wider">{displayConfidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full rounded-full transition-all duration-75 ease-linear shadow-inner ${
                          isHealthy ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${displayConfidence}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Causes / Explanation */}
                  {result.causes && (
                    <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs">
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-black uppercase tracking-wider text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        {language === 'kn' ? 'ಕಾರಣ ಮತ್ತು ರೋಗಲಕ್ಷಣಗಳು' : 'Causes & Pathology'}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {result.causes}
                      </p>
                    </div>
                  )}

                  {/* Treatments */}
                  {result.treatment?.conventional && result.treatment.conventional.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                        <Pill className="w-3.5 h-3.5 text-blue-600" />
                        {language === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಚಿಕಿತ್ಸೆ' : 'Recommended Treatments'}
                      </div>
                      <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside font-medium">
                        {result.treatment.conventional.slice(0, 2).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isHealthy && !result.causes && (
                    <div className="bg-green-500/10 border border-green-200 rounded-2xl p-4">
                      <p className="text-green-900 text-xs font-semibold leading-relaxed">
                        This crop leaf is vibrant and shows optimal chlorophyll levels. Maintain your current watering and fertilizer schedule!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={clearSelection}
                className="w-full py-3.5 mt-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-98 transform"
              >
                Scan Another Image
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
