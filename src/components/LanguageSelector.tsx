import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSelector({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 transition-all hover:bg-white/10 active:scale-95 shadow-sm group ${className} ${language === 'kn'
                ? 'bg-prodmast-accent/20 border-prodmast-accent/40 text-prodmast-dark'
                : 'bg-black/5 text-prodmast-dark/80'}`}
            title="Switch Language / ಭಾಷೆಯನ್ನು ಬದಲಿಸಿ"
        >
            <Globe className="w-4 h-4 text-prodmast-primary group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'en' ? 'KN' : 'EN'}
            </span>
        </button>
    );
}
