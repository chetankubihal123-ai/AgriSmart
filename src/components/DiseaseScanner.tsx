import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Play, Scan, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImageClassifier, CropType } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function DiseaseScanner() {
  const [selectedCrop, setSelectedCrop] = useState<CropType>('tomato');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ disease: string; confidence: number; raw_class: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { classifyImage, isCustomModelLoaded, initializeModels } = useImageClassifier();
  const { language } = useLanguage();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  useEffect(() => {
    if (result) {
      let start = 0;
      const target = result.confidence;
      const duration = 1500;
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
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
      setError(null);
      setDisplayConfidence(0);
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
      if (!isCustomModelLoaded) {
        throw new Error(language === 'kn'
          ? 'ಎಐ ಮಾದರಿಗಳನ್ನು ಇನ್ನೂ ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಕೆಲವು ಸೆಕೆಂಡುಗಳ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'
          : 'AI models are still initializing in the background. Please wait a few seconds and try again.');
      }
      
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 2. Query MobileNet predictions and Teachable Machine predictions
      const validation = await classifyImage(img, selectedCrop);
      const mobileNetPredictions = validation.predictions || [];
      const predictions = validation.customPredictions;

      // 3. Intelligent Non-Crop/Artificial Blocker
      const artificialKeywords = [
        'comic', 'cartoon', 'book', 'illustration', 'toy', 'doll', 'action figure', 'poster', 'screen', 'monitor',
        'jigsaw', 'puzzle', 'art', 'sketch', 'drawing', 'painting', 'graffiti', 'diagram', 'chart', 'website', 'web site',
        'menu', 'page', 'document', 'envelope', 'text', 'paper', 'notebook', 'slate', 'binder', 'crossword'
      ];

      const rejectKeywords = [
        'person', 'human', 'face', 'selfie', 'man', 'woman', 'child', 'guy', 'lady', 'boy', 'girl',
        'groom', 'jersey', 't-shirt', 'sweatshirt', 'cardigan', 'suit', 'coat', 'jacket', 'dress', 'clothing',
        'cellular telephone', 'handheld computer', 'smartphone', 'phone', 'computer', 'laptop',
        'hand', 'finger', 'arm', 'leg', 'body', 'skin', 'mirror'
      ];

      const topPredictions = mobileNetPredictions.slice(0, 5);
      const isArtificial = topPredictions.some(p =>
        artificialKeywords.some(keyword => p.className.toLowerCase().includes(keyword))
      );

      const hasRejectKeyword = mobileNetPredictions.slice(0, 3).some(p =>
        rejectKeywords.some(keyword => p.className.toLowerCase().includes(keyword)) && p.probability > 0.2
      );

      if (isArtificial || hasRejectKeyword) {
        throw new Error(language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ.' : 'No crop detected in this image.');
      }

      if (!predictions || predictions.length === 0) {
        throw new Error(language === 'kn' ? 'ರೋಗವನ್ನು ಪತ್ತೆಹಚ್ಚಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.' : 'Could not identify a specific disease. Please try a clearer photo.');
      }

      // 4. Take the top prediction
      const top = predictions[0];
      
      // Clean up the name (remove crop prefix)
      const cleanName = top.className
        .replace(/^(tomato|corn|chilli)_/i, '')
        .replace(/_/g, ' ')
        .trim();

      setResult({
        disease: cleanName,
        confidence: top.probability * 100,
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
            {language === 'kn' ? 'ಎಐ ಬೆಳೆ ರೋಗ ಸ್ಕ್ಯಾನರ್' : 'AI Crop Disease Scanner'}
          </h3>
          <p className="text-slate-500 font-semibold text-sm mt-3 ml-0 md:ml-16">
            {language === 'kn' 
              ? 'ತಜ್ಞರ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ಎಲೆ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' 
              : 'Upload a leaf image for instant expert diagnosis.'}
          </p>
          {!isCustomModelLoaded && (
            <div className="flex items-center gap-2 mt-3 ml-0 md:ml-16 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 w-fit animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>
                {language === 'kn' 
                  ? 'ಆಫ್‌ಲೈನ್ ಎಐ ಮಾದರಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ (ದಯವಿಟ್ಟು ಕಾಯಿರಿ)...' 
                  : 'Initializing offline AI models (please wait)...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Crop Selector Pills */}
      <div className="flex flex-col gap-2 mb-8 animate-in fade-in duration-300">
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-1">
          {language === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲು ಬೆಳೆಯನ್ನು ಆರಿಸಿ' : 'SELECT CROP TO ANALYZE'}
        </span>
        <div className="flex gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
          {(['tomato', 'corn', 'chilli'] as CropType[]).map((crop) => (
            <button
              key={crop}
              onClick={() => {
                setSelectedCrop(crop);
                // Clear previous scanner result if crop type changes to avoid mismatch display
                setResult(null);
                setError(null);
              }}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${selectedCrop === crop
                ? 'bg-lime-500 text-slate-900 shadow-md shadow-lime-500/20 scale-105 transform'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="flex flex-col h-full">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-lime-500 rounded-3xl p-10 bg-slate-50/50 hover:bg-lime-50/10 cursor-pointer transition-all duration-300 min-h-[320px] group/upload"
            >
              <div className="w-16 h-16 rounded-full bg-lime-50 flex items-center justify-center mb-4 group-hover/upload:scale-110 group-hover/upload:bg-lime-100 transition-all">
                <UploadCloud className="w-8 h-8 text-lime-600" />
              </div>
              <p className="text-slate-800 font-black uppercase text-xs tracking-wider mb-2">Click to Upload or Drag & Drop</p>
              <p className="text-slate-400 text-xs font-bold">PNG, JPG up to 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="flex-1 rounded-3xl overflow-hidden relative border border-slate-200 bg-slate-50 min-h-[320px] flex items-center justify-center p-4 shadow-inner">
              {/* HUD Reticles */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-lime-600 opacity-60"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-lime-600 opacity-60"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-lime-600 opacity-60"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-lime-600 opacity-60"></div>

              <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain rounded-2xl relative z-0" />
              
              {!loading && !result && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-4 z-10">
                  <button 
                    onClick={scanImage}
                    className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-slate-905 rounded-xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-[0_0_20px_rgba(132,204,22,0.4)]"
                  >
                    <Play className="w-5 h-5 animate-pulse" fill="currentColor" /> 
                    {!isOnline 
                      ? (language === 'kn' ? 'ಸ್ಥಳೀಯ ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ' : 'INITIATE LOCAL SCAN') 
                      : (language === 'kn' ? 'ಸ್ಕ್ಯಾನ್ ಪ್ರಾರಂಭಿಸಿ' : 'INITIATE SCAN')
                    }
                  </button>
                  
                  {!isOnline && (
                    <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full uppercase tracking-widest font-black shadow-sm animate-pulse">
                      {language === 'kn' ? 'ಆಫ್‌ಲೈನ್ ಎಐ ಸ್ಕ್ಯಾನ್ ಸಿದ್ಧವಾಗಿದೆ' : 'Offline AI Scan Ready'}
                    </span>
                  )}
                  <button 
                    onClick={clearSelection}
                    className="text-xs text-white hover:bg-white/10 text-white border border-white/20 px-4 py-2 rounded-lg font-black uppercase tracking-wider transition-all"
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
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-full h-[3px] bg-lime-400 shadow-[0_0_30px_#a3e635] z-20 left-0 right-0"
                  ></motion.div>
                  
                  <div className="absolute z-30 inset-0 flex flex-col items-center justify-center">
                    <Scan className="w-16 h-16 text-lime-400 animate-pulse mb-6 opacity-90 shadow-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.8)]" />
                    <div className="px-6 py-2 border border-lime-400/50 bg-black/50 backdrop-blur-md rounded-full font-mono text-lime-400 font-bold tracking-[0.4em] text-xs shadow-inner">
                      ANALYZING BIO-DATA...
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
            <div className="flex-1 rounded-3xl border border-slate-100 bg-slate-50/50 flex flex-col justify-center items-center p-8 text-center min-h-[320px]">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
                <CheckCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-800 font-black uppercase text-xs tracking-wider mb-1">Awaiting Leaf Diagnosis</p>
              <p className="text-slate-500 font-semibold text-sm max-w-[240px] leading-relaxed">Upload a crop leaf picture to retrieve expert AI diagnostic insights.</p>
            </div>
          ) : error ? (
            <div className="flex-1 rounded-3xl border border-red-100 bg-red-50 flex flex-col justify-center items-center p-8 text-center min-h-[320px] animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 border border-red-200 animate-pulse">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-red-950 font-black text-xl mb-2">
                {error.includes('No crop') ? (language === 'kn' ? 'ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ' : 'No Crop Detected') : 'Analysis Blocked'}
              </h4>
              <p className="text-red-700 text-sm font-semibold max-w-[280px] leading-relaxed">{error}</p>
              <button 
                onClick={clearSelection} 
                className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs uppercase tracking-widest font-black transition-colors shadow-lg shadow-red-200"
              >
                Try Again
              </button>
            </div>
          ) : result && (
            <div className={`flex-1 rounded-3xl border p-8 flex flex-col justify-between min-h-[320px] animate-in fade-in slide-in-from-bottom-4 duration-500 ${
              isHealthy 
                ? 'border-green-150 bg-green-50/50 shadow-sm' 
                : 'border-red-150 bg-red-50/50 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                    isHealthy ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {isHealthy ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-1 ${
                      isHealthy ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        isHealthy ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                      } animate-pulse`}></span>
                      {isHealthy 
                        ? (language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ ಪತ್ತೆಯಾಗಿದೆ' : 'Healthy Plant Detected') 
                        : (language === 'kn' ? 'ಬೆದರಿಕೆ ಪತ್ತೆಯಾಗಿದೆ' : 'Disease Detected')}
                    </span>
                    <h4 className="text-slate-850 font-black text-2xl tracking-tight leading-none uppercase">
                      {result.disease}
                    </h4>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                        <Scan className="w-3.5 h-3.5" /> AI Confidence Match
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

                  {!isHealthy ? (
                    <div className="bg-red-500/10 border border-red-100 rounded-2xl p-4 mt-4 relative overflow-hidden">
                      <p className="text-red-900 text-xs font-semibold leading-relaxed relative z-10">
                        Immediate action is recommended. Apply appropriate agricultural treatments tailored to this strain. Check our Shop for recommended fungicides or bio-inputs.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-100 rounded-2xl p-4 mt-4 relative overflow-hidden">
                      <p className="text-green-900 text-xs font-semibold leading-relaxed relative z-10">
                        This crop leaf is vibrant and shows optimal nutrient uptake. Maintain your current watering and fertilizer schedule!
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
