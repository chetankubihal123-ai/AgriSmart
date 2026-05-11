import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Play, Scan, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImageClassifier } from '../hooks/useImageClassifier';
import { useLanguage } from '../contexts/LanguageContext';

export function DiseaseScanner() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ disease: string; confidence: number; raw_class: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { classifyImage, classifyAll, isCustomModelLoaded, initializeModels } = useImageClassifier();
  const { t, language } = useLanguage();

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
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
      setError(null);
      setDisplayConfidence(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
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
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 2. Perform validation (Is it a plant?)
      const validation = await classifyImage(img);
      
      if (!validation.isPlant) {
        throw new Error(language === 'kn' ? 'ಯಾವುದೇ ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ.' : 'No crop detected in this image.');
      }

      // 3. Perform local classification using ALL Teachable Machine models
      const predictions = await classifyAll(img);

      if (predictions.length === 0 || predictions[0].probability < 0.1) {
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
    <div className="glass-card p-8 group relative overflow-hidden mt-8 border-prodmast-accent/20 hover:border-prodmast-accent/40 transition-all duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-prodmast-accent/5 rounded-full blur-[80px] -translate-y-10 group-hover:bg-prodmast-accent/10 transition-colors pointer-events-none"></div>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-sans font-bold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-prodmast-primary border border-white/10 text-prodmast-accent shadow-[0_0_15px_rgba(163,230,53,0.2)]">
              <UploadCloud className="w-6 h-6" />
            </span>
            AI Disease Scanner
          </h3>
          <p className="text-slate-400 text-sm mt-2 ml-14">
            {language === 'kn' 
              ? 'ತಜ್ಞರ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ಎಲೆ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.' 
              : 'Upload a leaf image for instant expert diagnosis.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="flex flex-col h-full">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-2xl p-10 bg-black/20 hover:bg-white/5 hover:border-prodmast-accent/50 cursor-pointer transition-all duration-300 min-h-[250px] group/upload"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover/upload:scale-110 group-hover/upload:bg-prodmast-accent/20 transition-all">
                <UploadCloud className="w-8 h-8 text-slate-400 group-hover/upload:text-prodmast-accent transition-colors" />
              </div>
              <p className="text-white font-semibold mb-2">Click to Upload or Drag & Drop</p>
              <p className="text-slate-500 text-sm">PNG, JPG up to 10MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="flex-1 rounded-2xl overflow-hidden relative border border-white/10 bg-black/40 min-h-[250px] flex items-center justify-center p-4">
              {/* HUD Reticles */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-prodmast-accent opacity-60"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-prodmast-accent opacity-60"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-prodmast-accent opacity-60"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-prodmast-accent opacity-60"></div>

              <img src={previewUrl} alt="Preview" className="max-h-[300px] object-cover relative z-0" />
              
              {!loading && !result && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-4 z-10">
                  <button 
                    onClick={scanImage}
                    className="flex items-center gap-2 px-6 py-3 bg-prodmast-accent hover:bg-prodmast-accent/90 text-prodmast-dark rounded-xl font-bold uppercase tracking-wider transition-transform hover:scale-105 shadow-[0_0_20px_rgba(163,230,53,0.4)]"
                  >
                    <Play className="w-5 h-5" fill="currentColor" /> INITIATE SCAN
                  </button>
                  <button 
                    onClick={clearSelection}
                    className="text-xs text-white/70 hover:text-white font-medium uppercase tracking-widest border border-transparent hover:border-white/30 px-4 py-2 rounded-lg transition-all"
                  >
                    ABORT / CHANGE IMAGE
                  </button>
                </div>
              )}
              
              {loading && (
                <>
                  <div className="absolute inset-0 bg-prodmast-dark/70 backdrop-blur-sm z-10 transition-all duration-300"></div>
                  
                  {/* Laser Sweeper */}
                  <motion.div 
                    initial={{ top: '0%', opacity: 0 }}
                    animate={{ top: ['0%', '98%', '0%'], opacity: [0, 1, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-full h-[3px] bg-prodmast-accent shadow-[0_0_30px_#a3e635] z-20 left-0 right-0"
                  ></motion.div>
                  
                  <div className="absolute z-30 inset-0 flex flex-col items-center justify-center">
                    <Scan className="w-16 h-16 text-prodmast-accent animate-pulse mb-6 opacity-90 shadow-prodmast-accent drop-shadow-[0_0_15px_rgba(163,230,53,0.8)]" />
                    <div className="px-6 py-2 border border-prodmast-accent/50 bg-black/50 backdrop-blur-md rounded-full font-mono text-prodmast-accent font-bold tracking-[0.4em] text-xs shadow-inner">
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
           <div className={`flex-1 rounded-2xl border flex flex-col justify-center p-8 transition-all duration-700 ${result ? (isHealthy ? 'border-green-500/30 bg-green-500/10 shadow-[inset_0_0_50px_rgba(34,197,94,0.1)]' : 'border-red-500/30 bg-red-500/10 shadow-[inset_0_0_50px_rgba(239,68,68,0.1)]') : error ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-black/20'}`}>
            
            {!result && !error ? (
              <div className="text-center opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-white font-medium">Awaiting image scan...</p>
                <p className="text-slate-500 text-sm mt-2">Upload a picture to receive insights.</p>
              </div>
            ) : error ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30 animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h4 className="text-white font-bold text-xl mb-2">
                  {error.includes('No crop') ? (language === 'kn' ? 'ಬೆಳೆ ಪತ್ತೆಯಾಗಿಲ್ಲ' : 'No Crop Detected') : 'Analysis Error'}
                </h4>
                <p className="text-red-400 text-sm font-medium">{error}</p>
                <button onClick={clearSelection} className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase tracking-widest font-bold transition-colors">Try Again</button>
              </div>
            ) : result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isHealthy ? 'bg-green-500 shadow-green-500/40 text-white' : 'bg-red-500 shadow-red-500/40 text-white'}`}>
                    {isHealthy ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-1 ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-400 shadow-[0_0_8px_#f87171]'} animate-pulse`}></span>
                      {isHealthy 
                        ? (language === 'kn' ? 'ಆರೋಗ್ಯಕರ ಸಸ್ಯ ಪತ್ತೆಯಾಗಿದೆ' : 'Healthy Plant Detected') 
                        : (language === 'kn' ? 'ಬೆದರಿಕೆ ಪತ್ತೆಯಾಗಿದೆ' : 'Threat Detected')}
                    </span>
                    <h4 className="text-white font-bold text-2xl tracking-tight leading-none">
                      {language === 'kn' ? result.disease : result.disease}
                    </h4>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Scan className="w-3 h-3" /> AI Confidence Match
                      </span>
                      <span className="text-xs text-white font-mono font-bold tracking-wider">{displayConfidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-75 ease-linear ${isHealthy ? 'bg-green-500 shadow-[0_0_15px_#4ade80]' : 'bg-red-500 shadow-[0_0_15px_#f87171]'}`}
                        style={{ width: `${displayConfidence}%` }}
                      ></div>
                    </div>
                  </div>

                  {!isHealthy && (
                     <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-4 relative overflow-hidden">
                       <p className="text-red-300 text-sm leading-relaxed relative z-10 font-medium">
                         Immediate action is recommended. Apply the appropriate fungicidal or bacterial treatments tailored to this strain.
                       </p>
                     </div>
                  )}

                  <button 
                    onClick={clearSelection}
                    className="w-full py-3 mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all hover:border-white/30"
                  >
                    Scan Another Image
                  </button>
                </div>
              </div>
            )}
           </div>
        </div>
      </div>
    </div>
  );
}
