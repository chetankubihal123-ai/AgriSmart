import { DiseaseScanner } from './DiseaseScanner';
import { useLanguage } from '../contexts/LanguageContext';
import { BrainCircuit } from 'lucide-react';

export function DiseaseDetection() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 bg-prodmast-primary rounded-xl text-prodmast-accent shadow-lg shadow-prodmast-primary/20">
                <BrainCircuit className="w-8 h-8" />
              </div>
              {t('disease.title')}
            </h1>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl">
              {t('disease.subtitle')}
            </p>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/20 shadow-2xl overflow-hidden p-1">
           <DiseaseScanner />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border border-white/10">
            <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-widest">How it works</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our advanced machine learning models are trained on over 50,000 images of various crop diseases to provide you with a high-confidence diagnosis.
            </p>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10">
            <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-widest">Accuracy</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The AI achieves 94% accuracy in laboratory conditions. For best results, ensure your photo is well-lit and the leaf is centered.
            </p>
          </div>
          <div className="glass p-6 rounded-2xl border border-white/10">
            <h3 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-widest">Privacy</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your images are processed securely. We use anonymized data to improve the model's accuracy for farmers worldwide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
