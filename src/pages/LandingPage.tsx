import { useNavigate } from 'react-router-dom';
import { Sprout, ArrowRight, Leaf, BarChart3, CheckCircle2, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useLanguage();

    // Splash Screen State
    const [showSplash, setShowSplash] = useState(() => {
        return !sessionStorage.getItem('splashShown');
    });
    const [isFading, setIsFading] = useState(false);

    // Typewriter State
    const fullText = "Welcome to AgriSmart";
    const [displayText, setDisplayText] = useState("");
    const [typingComplete, setTypingComplete] = useState(false);

    // Typewriter Effect Logic
    useEffect(() => {
        if (!showSplash) {
            document.body.style.overflow = 'auto';
            return;
        }

        document.body.style.overflow = 'hidden';

        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < fullText.length) {
                setDisplayText(fullText.substring(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
                setTypingComplete(true);
            }
        }, 100); // ms per character

        return () => clearInterval(typingInterval);
    }, [showSplash, fullText]);

    // Timed Fade Out Logic (waits 3 sec after typing finishes)
    useEffect(() => {
        if (typingComplete && showSplash) {
            const timer = setTimeout(() => {
                setIsFading(true);
                setTimeout(() => {
                    setShowSplash(false);
                    sessionStorage.setItem('splashShown', 'true');
                    document.body.style.overflow = 'auto';
                }, 1000); // 1s fade duration
            }, 3000); // wait 3s after typing completes

            return () => {
                clearTimeout(timer);
                document.body.style.overflow = 'auto';
            };
        }
    }, [typingComplete, showSplash]);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleGetStarted = () => {
        navigate('/dashboard');
    };

    return (
        <div className="bg-gradient-to-br from-[#f0fdf4] via-[#dcfce7] to-[#bbf7d0] min-h-screen font-sans selection:bg-prodmast-accent selection:text-prodmast-primary">

            {/* Full-Screen Splash Overlay */}
            {showSplash && (
                <div
                    className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${isFading ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
                >
                    <img
                        src="/assets/old_farmer_splash.png"
                        alt="Old Farmer background"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40"></div>

                    <div className="z-10 flex flex-col items-center max-w-4xl px-6 text-center">
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight h-32 flex items-center justify-center drop-shadow-2xl">
                            {displayText}
                            {!typingComplete && <span className="animate-pulse ml-2 text-prodmast-accent drop-shadow-md">|</span>}
                        </h1>

                        {typingComplete && (
                            <div className="mt-8 transition-opacity duration-500 opacity-100">
                                <div className="w-10 h-10 border-4 border-prodmast-accent/20 border-t-prodmast-accent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-md border-b border-gray-200/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        <div className="w-10 h-10 bg-prodmast-primary rounded-full flex items-center justify-center">
                            <Sprout className="w-5 h-5 text-prodmast-accent" />
                        </div>
                        <span className="text-xl font-bold text-prodmast-dark tracking-tight">AgriSmart</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-prodmast-muted">
                        <a href="#home" className="hover:text-prodmast-dark transition-colors">{t('landing.home')}</a>
                        <a href="#features" className="hover:text-prodmast-dark transition-colors">{t('landing.features')}</a>
                        <a href="#benefits" className="hover:text-prodmast-dark transition-colors">{t('landing.benefits')}</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSelector />
                        <button
                            onClick={() => navigate('/auth')}
                            className="bg-prodmast-dark text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-prodmast-primary transition-colors shadow-soft"
                        >
                            {t('landing.login')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="inline-block mb-6 px-4 py-1.5 rounded-full border border-green-300 bg-white text-xs font-semibold text-green-700 uppercase tracking-wider shadow-sm"
                >
                    {t('landing.smartAgriPlatform')}
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-5xl md:text-7xl font-bold text-prodmast-dark tracking-tight leading-[1.1] max-w-4xl drop-shadow-sm"
                >
                    {t('landing.heroTitleMain')}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-6 text-lg text-prodmast-dark/70 max-w-2xl font-medium"
                >
                    {t('landing.heroSubtitleMain')}
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-10 flex flex-col sm:flex-row items-center gap-4"
                >
                    <button
                        onClick={handleGetStarted}
                        className="bg-prodmast-primary text-white px-12 py-5 text-lg rounded-full font-bold hover:bg-[#0f2426] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 w-full sm:w-auto"
                    >
                        {t('landing.getStarted')} <ArrowRight className="w-5 h-5" />
                    </button>
                </motion.div>


            </section>

            {/* Features / Services Section (Dark) */}
            <section id="features" className="py-24 bg-prodmast-primary w-full relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, amount: 0.3 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-bold text-white tracking-tight">{t('landing.advancedSolutions')}</h2>
                        <p className="mt-4 text-white/70 max-w-xl mx-auto font-medium">{t('landing.advancedSolutionsDesc')}</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: t('landing.aiDiseaseDetection'), icon: <BrainCircuit className="w-6 h-6" />, desc: t('landing.aiDiseaseDetectionDesc'), link: '/disease-detection' },
                            { title: t('landing.yieldEstimator'), icon: <BarChart3 className="w-6 h-6" />, desc: t('landing.yieldEstimatorDesc'), link: '/yield-prediction' },
                            { title: t('landing.smartSensor'), icon: <Leaf className="w-6 h-6" />, desc: t('landing.smartSensorDesc'), link: '/dashboard' }
                        ].map((feature, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: false, amount: 0.2 }}
                                transition={{ duration: 0.6, delay: i * 0.15, type: "spring", stiffness: 100 }}
                                key={i}
                                onClick={() => navigate(feature.link)}
                                className="glass-card-dark p-8 group cursor-pointer hover:bg-[#1a3a3d] transition-colors duration-300"
                            >
                                <div className="w-14 h-14 rounded-[20px] bg-white/10 flex items-center justify-center text-prodmast-accent mb-6 inner-border group-hover:scale-110 group-hover:bg-prodmast-accent group-hover:text-prodmast-primary transition-all duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-prodmast-accent transition-colors">{feature.title}</h3>
                                <p className="text-sm text-white/60 leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Key Benefits (Light) */}
            <section id="benefits" className="py-24 bg-white w-full border-b border-gray-200 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">

                    {/* Left side mock UI */}
                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.3 }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                        className="w-full lg:w-1/2 rounded-[32px] bg-gray-50 p-8 border border-gray-100 shadow-soft"
                    >
                        <div className="bg-white rounded-[24px] p-6 mb-6 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-prodmast-dark">Active Land</span>
                                <span className="text-sm font-semibold text-prodmast-muted">240 Acres</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                                <div className="bg-prodmast-primary h-3 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            <div className="flex justify-between text-xs font-semibold text-prodmast-muted">
                                <span>Planted</span>
                                <span>Fallow</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-gray-100 bg-white rounded-[20px] p-5 shadow-sm">
                                <div className="text-sm text-prodmast-muted font-medium mb-1">Weekly Moisture</div>
                                <div className="text-2xl font-bold text-prodmast-dark">44%</div>
                            </div>
                            <div className="border border-green-100 rounded-[20px] p-5 bg-green-50 shadow-sm">
                                <div className="text-sm text-prodmast-primary font-medium mb-1">Health Score</div>
                                <div className="text-2xl font-bold text-prodmast-dark">A+</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right side text */}
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false, amount: 0.3 }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                        className="w-full lg:w-1/2"
                    >
                        <h2 className="text-4xl lg:text-5xl font-bold text-prodmast-dark tracking-tight leading-[1.1] mb-6">
                            {t('landing.keyBenefits')}
                        </h2>
                        <ul className="space-y-6 mt-8">
                            {[
                                t('landing.benefit1'),
                                t('landing.benefit2'),
                                t('landing.benefit3')
                            ].map((text, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="mt-1 min-w-6 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <span className="text-lg text-prodmast-dark font-medium">{text}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleGetStarted}
                            className="mt-10 bg-prodmast-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-prodmast-dark transition-colors shadow-md"
                        >
                            {t('landing.exploreFeatures')}
                        </button>
                    </motion.div>
                </div>
            </section>

            <footer className="bg-prodmast-dark py-12 text-center text-white/50 text-sm font-medium">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Sprout className="w-5 h-5 text-prodmast-accent/50" />
                    <span className="text-lg font-bold text-white/70">AgriSmart</span>
                </div>
                <p>© 2026 AgriSmart Agriculture. {t('landing.footerReserved')}</p>
            </footer>

        </div>
    );
}
