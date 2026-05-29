
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { findBestMatch } from '../lib/knowledgeBase';
import { useLanguage } from '../contexts/LanguageContext';
import { askGeminiText } from '../lib/gemini';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

interface ChatbotProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

// Offline Kannada translation map for local database query fallback
const KANNADA_OFFLINE_RESPONSES: Record<string, string> = {
    "Wheat is a Rabi crop sown in winter (Oct-Dec) and harvested in spring (March-May). It requires cool weather for growth and warm weather for ripening. Ideal temperature: 10°C-15°C (sowing), 21°C-26°C (harvesting).": 
    "ಗೋಧಿ ಒಂದು ರಬಿ ಬೆಳೆಯಾಗಿದ್ದು, ಚಳಿಗಾಲದಲ್ಲಿ (ಅಕ್ಟೋಬರ್-ಡಿಸೆಂಬರ್) ಬಿತ್ತನೆ ಮಾಡಿ ವಸಂತಕಾಲದಲ್ಲಿ (ಮಾರ್ಚ್-ಮೇ) ಕೊಯ್ಲು ಮಾಡಲಾಗುತ್ತದೆ. ಇದರ ಬೆಳವಣಿಗೆಗೆ ತಂಪಾದ ಹವಾಮಾನ ಮತ್ತು ಹಣ್ಣಾಗಲು ಬೆಚ್ಚಗಿನ ಹವಾಮಾನದ ಅಗತ್ಯವಿದೆ. ಬಿತ್ತನೆಗೆ 10°C-15°C ಮತ್ತು ಕೊಯ್ಲಿಗೆ 21°C-26°C ತಾಪಮಾನ ಸೂಕ್ತವಾಗಿದೆ.",

    "Rice (Paddy) is a Kharif crop that requires high temperature (25°C+) and heavy rainfall (100cm+). It grows best in clayey loam soil that can retain water.": 
    "ಭತ್ತ (ನೆಲ್ಲು) ಒಂದು ಖಾರಿಫ್ ಬೆಳೆಯಾಗಿದ್ದು, ಇದಕ್ಕೆ ಹೆಚ್ಚಿನ ತಾಪಮಾನ (25°C+) ಮತ್ತು ಭಾರಿ ಮಳೆಯ (100cm+) ಅಗತ್ಯವಿರುತ್ತದೆ. ನೀರನ್ನು ಹಿಡಿದಿಟ್ಟುಕೊಳ್ಳುವ ಜೇಡಿಮಣ್ಣಿನಿಂದ ಕೂಡಿದ ಲೋಮ್ ಮಣ್ಣಿನಲ್ಲಿ ಇದು ಚೆನ್ನಾಗಿ ಬೆಳೆಯುತ್ತದೆ.",

    "Corn (Maize) needs well-drained, fertile soil. It is a heavy feeder, so apply Nitrogen-rich fertilizer (Urea) at knee-high stage. Water deeply but avoid waterlogging.": 
    "ಮೆಕ್ಕೆಜೋಳಕ್ಕೆ ಉತ್ತಮ ನೀರು ಬಸಿಯುವ ಮತ್ತು ಫಲವತ್ತಾದ ಮಣ್ಣಿನ ಅಗತ್ಯವಿದೆ. ಇದು ಹೆಚ್ಚು ಪೋಷಕಾಂಶಗಳನ್ನು ಹೀರಿಕೊಳ್ಳುವುದರಿಂದ, ಮೊಣಕಾಲು ಎತ್ತರದ ಹಂತದಲ್ಲಿ ಸಾರಜನಕ ಭರಿತ ರಸಗೊಬ್ಬರವನ್ನು (ಯೂರಿಯಾ) ಅನ್ವಯಿಸಿ. ಆಳವಾಗಿ ನೀರುಣಿಸಿ ಆದರೆ ನೀರು ನಿಲ್ಲದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.",

    "Tomatoes love sun! They need at least 6-8 hours of sunlight. Support plants with stakes to keep fruit off the ground. Watch out for Early Blight (brown spots on leaves).": 
    "ಟೊಮೆಟೊಗಳಿಗೆ ಸೂರ್ಯನ ಬೆಳಕು ತುಂಬಾ ಇಷ್ಟ! ಇವುಗಳಿಗೆ ಕನಿಷ್ಠ 6-8 ಗಂಟೆಗಳ ನೇರ ಸೂರ್ಯನ ಬೆಳಕು ಬೇಕು. ಕಾಯಿಗಳು ನೆಲಕ್ಕೆ ತಾಗದಂತೆ ತಡೆಯಲು ಗಿಡಗಳಿಗೆ ಆಸರೆ ಕೋಲುಗಳನ್ನು ನೀಡಿ. ಆರಂಭಿಕ ಕೊಳೆ ರೋಗದ (ಎಲೆಗಳ ಮೇಲೆ ಕಂದು ಕಲೆಗಳು) ಬಗ್ಗೆ ಜಾಗರೂಕರಾಗಿರಿ.",

    "Potatoes grow best in loose, well-drained sandy loam soil. Hill soil around the base of the plant as it grows to protect tubers from sunlight (green potatoes are toxic!).": 
    "ಆಲೂಗಡ್ಡೆ ಸಡಿಲವಾದ, ಉತ್ತಮ ನೀರು ಬಸಿಯುವ ಮರಳು ಮಿಶ್ರಿತ ಜೇಡಿಮಣ್ಣಿನಲ್ಲಿ ಚೆನ್ನಾಗಿ ಬೆಳೆಯುತ್ತದೆ. ಗೆಡ್ಡೆಗಳನ್ನು ಸೂರ್ಯನ ಬೆಳಕಿನಿಂದ ರಕ್ಷಿಸಲು ಗಿಡ ಬೆಳೆದಂತೆ ಬುಡಕ್ಕೆ ಮಣ್ಣು ಏರಿಸಿ (ಹಸಿರು ಬಣ್ಣಕ್ಕೆ ತಿರುಗಿದ ಆಲೂಗಡ್ಡೆಗಳು ವಿಷಕಾರಿಯಾಗಿರುತ್ತವೆ!).",

    "A crop is a plant or animal product that can be grown and harvested extensively for profit or subsistence. In agriculture, crops are typically divided into food crops (wheat, rice), feed crops, fiber crops (cotton), and oil crops.": 
    "ಬೆಳೆಯು ಲಾಭ ಅಥವಾ ಜೀವನಾಧಾರಕ್ಕಾಗಿ ವ್ಯಾಪಕವಾಗಿ ಬೆಳೆದು ಕೊಯ್ಲು ಮಾಡಬಹುದಾದ ಸಸ್ಯ ಅಥವಾ ಪ್ರಾಣಿ ಉತ್ಪನ್ನವಾಗಿದೆ. ಕೃಷಿಯಲ್ಲಿ, ಬೆಳೆಗಳನ್ನು ಸಾಮಾನ್ಯವಾಗಿ ಆಹಾರ ಬೆಳೆಗಳು (ಗೋಧಿ, ಭತ್ತ), ಮೇವಿನ ಬೆಳೆಗಳು, ನಾರಿನ ಬೆಳೆಗಳು (ಹತ್ತಿ) ಮತ್ತು ಎಣ್ಣೆಕಾಳು ಬೆಳೆಗಳಾಗಿ ವಿಂಗಡಿಸಲಾಗುತ್ತದೆ.",

    "Early Blight appears as concentric 'target board' brown spots on leaves. Control it by rotating crops, keeping leaves dry while watering, and using copper-based fungicides if severe.": 
    "ಆರಂಭಿಕ ಕೊಳೆ ರೋಗವು ಎಲೆಗಳ ಮೇಲೆ ವೃತ್ತಾಕಾರದ ಕಂದು ಬಣ್ಣದ ಕಲೆಗಳಾಗಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ. ಬೆಳೆ ಸರದಿಯನ್ನು ಅನುಸರಿಸುವ ಮೂಲಕ, ನೀರುಣಿಸುವಾಗ ಎಲೆಗಳನ್ನು ಒಣದಾಗಿಡುವ ಮೂಲಕ ಮತ್ತು ತೀವ್ರವಾಗಿದ್ದರೆ ತಾಮ್ರ ಆಧಾರಿತ ಶಿಲೀಂಧ್ರನಾಶಕಗಳನ್ನು ಬಳಸುವ ಮೂಲಕ ಇದನ್ನು ನಿಯಂತ್ರಿಸಿ.",

    "Leaf Rust appears as orange/reddish powdery pustules on leaves (common in Wheat). planted resistant varieties. If infected, apply sulfur or propiconazole fungicides immediately.": 
    "ಎಲೆ ತುಕ್ಕು ರೋಗವು ಎಲೆಗಳ ಮೇಲೆ ಕಿತ್ತಳೆ ಅಥವಾ ಕೆಂಪು ಬಣ್ಣದ ಪುಡಿಯಂತಹ ಗುಳ್ಳೆಗಳಾಗಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ (ಗೋಧಿಯಲ್ಲಿ ಸಾಮಾನ್ಯ). ರೋಗ ನಿರೋಧಕ ತಳಿಗಳನ್ನು ಬಿತ್ತನೆ ಮಾಡಿ. ಸೋಂಕು ತಗುಲಿದರೆ ತಕ್ಷಣ ಸಲ್ಫರ್ ಅಥವಾ ಪ್ರೊಪಿಕೊನಜೋಲ್ ಶಿಲೀಂಧ್ರನಾಶಕಗಳನ್ನು ಸಿಂಪಡಿಸಿ.",

    "Yellowing leaves (Chlorosis) often indicate Nitrogen deficiency or over-watering. Check if the soil is too soggy. If dry, apply a nitrogen-rich fertilizer like Urea or Compost.": 
    "ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದು (ಕ್ಲೋರೋಸಿಸ್) ಸಾಮಾನ್ಯವಾಗಿ ಸಾರಜನಕದ ಕೊರತೆ ಅಥವಾ ಅತಿಯಾದ ನೀರುಣಿಸುವಿಕೆಯನ್ನು ಸೂಚಿಸುತ್ತದೆ. ಮಣ್ಣು ಹೆಚ್ಚು ಜವಳಾಗಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ. ಒಣಗಿದ್ದರೆ, ಯೂರಿಯಾ ಅಥವಾ ಕಾಂಪೋಸ್ಟ್ ನಂತಹ ಸಾರಜನಕ ಭರಿತ ರಸಗೊಬ್ಬರವನ್ನು ಅನ್ವಯಿಸಿ.",

    "For common pests like Aphids, try spraying a Neem Oil solution (organic) first. For caterpillars or borers, you may need specific pesticides like Emamectin benzoate, but always check safety periods.": 
    "ಅಫಿಡ್ಸ್‌ನಂತಹ ಸಾಮಾನ್ಯ ಕೀಟಗಳಿಗಾಗಿ, ಮೊದಲು ಬೇವಿನ ಎಣ್ಣೆ ದ್ರಾವಣವನ್ನು (ಸಾವಯವ) ಸಿಂಪಡಿಸಲು ಪ್ರಯತ್ನಿಸಿ. ಕೀಟಗಳು ಅಥವಾ ಕೊರಕಗಳಿಗಾಗಿ, ನಿಮಗೆ ಇಮಾಮೆಕ್ಟಿನ್ ಬೆಂಜೊಯೇಟ್ ನಂತಹ ನಿರ್ದಿಷ್ಟ ಕೀಟನಾಶಕಗಳು ಬೇಕಾಗಬಹುದು, ಆದರೆ ಯಾವಾಗಲೂ ಸುರಕ್ಷಿತ ಅವಧಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",

    "The standard fertilizer ratio is N-P-K (Nitrogen, Phosphorus, Potassium). Leafy crops need more N, fruiting crops need more P and K. Always do a soil test before applying heavy chemicals.": 
    "ಪ್ರಮಾಣಿತ ರಸಗೊಬ್ಬರ ಅನುಪಾತವು N-P-K (ಸಾರಜನಕ, ರಂಜಕ, ಪೊಟ್ಯಾಸಿಯಮ್) ಆಗಿದೆ. ಎಲೆಗಳ ಬೆಳೆಗಳಿಗೆ ಹೆಚ್ಚಿನ N ಅಗತ್ಯವಿರುತ್ತದೆ, ಕಾಯಿ ಬಿಡುವ ಬೆಳೆಗಳಿಗೆ ಹೆಚ್ಚಿನ P ಮತ್ತು K ಅಗತ್ಯವಿರುತ್ತದೆ. ರಾಸಾಯನಿಕಗಳನ್ನು ಬಳಸುವ ಮುನ್ನ ಯಾವಾಗಲೂ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ ಮಾಡಿ.",

    "Most crops prefer deep, infrequent watering rather than daily shallow sprinkling. Drip irrigation is the most water-efficient method, saving up to 50% water compared to flood irrigation.": 
    "ಹೆಚ್ಚಿನ ಬೆಳೆಗಳು ಪ್ರತಿದಿನ ಮೇಲ್ಮೈಗೆ ನೀರು ಚಿಮುಕಿಸುವುದಕ್ಕಿಂತ ಆಳವಾಗಿ ನೀರುಣಿಸುವುದನ್ನು ಇಷ್ಟಪಡುತ್ತವೆ. ಹನಿ ನೀರಾವರಿಯು ಅತ್ಯಂತ ದಕ್ಷ ವಿಧಾನವಾಗಿದ್ದು, ಪ್ರವಾಹ ನೀರಾವರಿಗೆ ಹೋಲಿಸಿದರೆ ಶೇಕಡಾ 50 ರಷ್ಟು ನೀರನ್ನು ಉಳಿಸುತ್ತದೆ.",

    "Organic farming improves soil health long-term. Vermicompost and cow manure are excellent natural fertilizers. Crop rotation is also key to preventing soil depletion.": 
    "ಸಾವಯವ ಕೃಷಿಯು ದೀರ್ಘಕಾಲದವರೆಗೆ ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ಸುಧಾರಿಸುತ್ತದೆ. ಎರೆಹುಳು ಗೊಬ್ಬರ ಮತ್ತು ಕೊಟ್ಟಿಗೆ ಗೊಬ್ಬರಗಳು ಅತ್ಯುತ್ತಮ ನೈಸರ್ಗಿಕ ರಸಗೊಬ್ಬರಗಳಾಗಿವೆ. ಮಣ್ಣಿನ ಸತ್ವ ಕಡಿಮೆಯಾಗುವುದನ್ನು ತಡೆಯಲು ಬೆಳೆ ಸರದಿ ಕೂಡ ಪ್ರಮುಖವಾಗಿದೆ.",

    "You can check the specific 'Weather' tab in this dashboard for a 5-day forecast tailored to your farm's location.": 
    "ನಿಮ್ಮ ತೋಟದ ಸ್ಥಳಕ್ಕೆ ಅನುಗುಣವಾಗಿ 5 ದಿನಗಳ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆಯನ್ನು ವೀಕ್ಷಿಸಲು ಈ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿರುವ ನಿರ್ದಿಷ್ಟ 'ಹವಾಮಾನ' (Weather) ಟ್ಯಾಬ್ ಅನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.",

    "Government schemes vary by region. Common ones include PM-KISAN (income support) and Soil Health Card scheme. Contact your local Krishi Vigyan Kendra (KVK) for current details.": 
    "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಪ್ರದೇಶಕ್ಕೆ ಅನುಗುಣವಾಗಿ ಬದಲಾಗುತ್ತವೆ. ಸಾಮಾನ್ಯ ಯೋಜನೆಗಳಲ್ಲಿ ಪಿಎಂ-ಕಿಸಾನ್ (ಆದಾಯ ಬೆಂಬಲ) ಮತ್ತು ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಯೋಜನೆ ಸೇರಿವೆ. ಹೆಚ್ಚಿನ ವಿವರಗಳಿಗಾಗಿ ನಿಮ್ಮ ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರವನ್ನು (KVK) ಸಂಪರ್ಕಿಸಿ.",

    "Hello! I am AgriBot. Ask me about growing crops (wheat, rice), treating diseases (blight, rust), or general farming tips!": 
    "ನಮಸ್ಕಾರ! ನಾನು ಅಗ್ರಿ-ಬಡ್ಡಿ. ಬೆಳೆಗಳನ್ನು ಬೆಳೆಯುವುದು (ಗೋಧಿ, ಭತ್ತ), ರೋಗಗಳಿಗೆ ಚಿಕಿತ್ಸೆ ನೀಡುವುದು (ತುಕ್ಕು ರೋಗ) ಅಥವಾ ಸಾಮಾನ್ಯ ಕೃಷಿ ಸಲಹೆಗಳ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ!"
};

// Offline Kannada input-to-English keywords map
const KANNADA_KEYWORD_MAP: Record<string, string> = {
    'ಗೋಧಿ': 'wheat',
    'ರಬಿ': 'wheat',
    'ಭತ್ತ': 'rice',
    'ಅಕ್ಕಿ': 'rice',
    'ನೆಲ್ಲು': 'rice',
    'ಖಾರಿಫ್': 'rice',
    'ಮೆಕ್ಕೆಜೋಳ': 'corn',
    'ಜೋಳ': 'corn',
    'ಟೊಮೆಟೊ': 'tomato',
    'ಟೊಮ್ಯಾಟೊ': 'tomato',
    'ಆಲೂಗಡ್ಡೆ': 'potato',
    'ಆಲೂ': 'potato',
    'ಕೊಳೆ': 'blight',
    'ಕಲೆ': 'blight',
    'ತುಕ್ಕು': 'rust',
    'ಹಳದಿ': 'yellowing',
    'ಕೀಟ': 'pest',
    'ಹುಳು': 'pest',
    'ಗೊಬ್ಬರ': 'fertilizer',
    'ರಸಗೊಬ್ಬರ': 'fertilizer',
    'ನೀರು': 'water',
    'ನೀರಾವರಿ': 'water',
    'ಸಾವಯವ': 'organic',
    'ಹವಾಮಾನ': 'weather',
    'ಮಳೆ': 'weather',
    'ಯೋಜನೆ': 'scheme',
    'ಸಾಲ': 'scheme',
    'ನಮಸ್ಕಾರ': 'hello',
    'ಹಲೋ': 'hello'
};

export function Chatbot({ isOpen, setIsOpen }: ChatbotProps) {
    const { t, translations, language } = useLanguage();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: t('chatbot.greeting'),
            sender: 'ai',
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // Voice-Enabled Assistant (STT & TTS)
    const [isListening, setIsListening] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const recognitionRef = useRef<any>(null);

    // Sync language selection live with Speech Recognition locale
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            
            // Set dynamic audio-capture language!
            recognitionRef.current.lang = language === 'kn' ? 'kn-IN' : 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, [language]);

    // Live update the greeting if user changes dashboard language
    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && prev[0].id === '1') {
                return [{
                    id: '1',
                    text: t('chatbot.greeting'),
                    sender: 'ai',
                    timestamp: prev[0].timestamp
                }];
            }
            return prev;
        });
    }, [language, t]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setIsListening(true);
            recognitionRef.current?.start();
        }
    };

    const speak = (text: string) => {
        if (!isVoiceEnabled) return;
        window.speechSynthesis.cancel(); // Stop current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'kn' ? 'kn-IN' : 'en-US';
        window.speechSynthesis.speak(utterance);
    };
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const queryText = inputText;
        setInputText('');
        setIsTyping(true);

        // Dynamic multi-lingual response generator (Live Gemini API -> offline local translated fallback)
        (async () => {
            let responseText = "";

            try {
                // 1. Try Live Gemini model first!
                const geminiResp = await askGeminiText(queryText, language);
                if (geminiResp) {
                    responseText = geminiResp;
                }
            } catch (err) {
                console.warn("Gemini chatbot service unavailable, shifting to offline database:", err);
            }

            // 2. Offline fallback if Gemini fails
            if (!responseText) {
                let mappedQuery = queryText;
                if (language === 'kn') {
                    // Extract Kannada keywords and map to English targets for ripgrep keywords matching
                    const lowerQuery = queryText.toLowerCase();
                    Object.entries(KANNADA_KEYWORD_MAP).forEach(([knKey, enKey]) => {
                        if (lowerQuery.includes(knKey)) {
                            mappedQuery += " " + enKey;
                        }
                    });
                }

                const bestMatch = findBestMatch(mappedQuery);
                if (bestMatch) {
                    if (language === 'kn') {
                        responseText = KANNADA_OFFLINE_RESPONSES[bestMatch] || bestMatch;
                    } else {
                        responseText = bestMatch;
                    }
                } else {
                    const fallbacks = translations.chatbot.fallbacks;
                    responseText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                }
            }

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            setIsTyping(false);
            speak(responseText);
        })();
    };

    // Dynamic dashboard summary card action in user's active language
    const triggerSummarize = () => {
        const userQuery = language === 'kn' ? "ದಯವಿಟ್ಟು ಫಾರ್ಮ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಅನ್ನು ಸಾರಾಂಶಗೊಳಿಸಿ." : "Please summarize the farm dashboard.";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: userQuery, sender: 'user', timestamp: new Date() }]);
        setIsTyping(true);

        (async () => {
            let responseText = "";
            try {
                const prompt = `Summarize the current farm state. Context: 1. Location: Karnataka. 2. Live Market: Chilli is up (+4.2%), while Tomato is down. 3. Alerts: High risk of Leaf Blight detected in Sector 4. 4. ROI is tracking at 28.4%. Provide a high-quality summary in ${language === 'kn' ? 'Kannada language' : 'English language'}.`;
                const geminiResp = await askGeminiText(prompt, language);
                if (geminiResp) {
                    responseText = geminiResp;
                }
            } catch (err) {
                console.warn("Gemini dashboard summary failed:", err);
            }

            if (!responseText) {
                responseText = language === 'kn' 
                    ? "ನಿಮ್ಮ ತೋಟದ ಸಾರಾಂಶ ಇಲ್ಲಿದೆ:\n1. ಪ್ರಾಥಮಿಕ ಸ್ಥಳ: ಕರ್ನಾಟಕ\n2. ಮಾರುಕಟ್ಟೆ ದರಗಳು: ಮೆಣಸಿನಕಾಯಿ ದರ ಹೆಚ್ಚಾಗಿದೆ (+4.2%), ಟೊಮೆಟೊ ಕಡಿಮೆಯಾಗಿದೆ.\n3. ಎಚ್ಚರಿಕೆಗಳು: ಸೆಕ್ಟರ್ 4 ರಲ್ಲಿ ಲೀಫ್ ಬ್ಲೈಟ್‌ನ ಹೆಚ್ಚಿನ ಅಪಾಯವಿದೆ.\n4. ಒಟ್ಟಾರೆ ಲಾಭ (ROI) ಶೇಕಡಾ 28.4 ರಷ್ಟಿದೆ.\nನಾನು ಚಿಕಿತ್ಸೆಯನ್ನು ನಿಯೋಜಿಸಬೇಕೇ?"
                    : "Here is your Farm Summary:\n1. Primary Location: Karnataka\n2. Live Market: Chilli is up (+4.2%), while Tomato is down.\n3. Alerts: High risk of Leaf Blight detected in Sector 4.\n4. Overall ROI is tracking at 28.4%.\nWould you like me to deploy treatments?";
            }

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: responseText, sender: 'ai', timestamp: new Date() }]);
            setIsTyping(false);
            speak(responseText);
        })();
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-prodmast-dark/80 backdrop-blur-xl border border-prodmast-accent/50 text-white p-4 rounded-full shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_30px_rgba(163,230,53,0.5)] transition-all z-50 flex items-center gap-3 hover:scale-105 active:scale-95 group"
            >
                <div className="relative">
                  <Bot className="w-6 h-6 text-prodmast-accent group-hover:rotate-12 transition-transform" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border-2 border-prodmast-dark"></span>
                </div>
                <span className="font-bold text-sm tracking-wide hidden md:inline text-prodmast-accent uppercase">Agri-Buddy</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col h-full bg-prodmast-dark/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl w-full h-full text-slate-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-black/20 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-prodmast-accent/20 p-2.5 rounded-xl border border-prodmast-accent/30 relative shadow-[0_0_15px_rgba(163,230,53,0.2)]">
                        <Bot className="w-6 h-6 text-prodmast-accent drop-shadow-md" />
                    </div>
                    <div>
                        <h3 className="font-black text-white tracking-wide text-lg">Agri-Buddy</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-prodmast-accent shadow-[0_0_5px_#a3e635] animate-pulse"></span>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">AI Online</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        className={`p-2 rounded-lg transition-colors ${isVoiceEnabled ? 'text-prodmast-accent hover:bg-white/5' : 'text-slate-500 hover:bg-white/5'}`}
                        title={isVoiceEnabled ? "Mute Voice" : "Unmute Voice"}
                    >
                        {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-transparent">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.sender === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-prodmast-accent/20 border border-prodmast-accent/30 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                                <Bot className="w-4 h-4 text-prodmast-accent" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${msg.sender === 'user'
                                ? 'bg-prodmast-accent text-prodmast-dark rounded-br-none font-medium'
                                : 'bg-white/5 border border-white/10 rounded-tl-none shadow-sm'
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="w-8 h-8 rounded-full bg-prodmast-accent/20 border border-prodmast-accent/30 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-prodmast-accent" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-prodmast-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-prodmast-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-prodmast-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* AI Prompts & Input */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex-shrink-0">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
                   <button 
                     onClick={triggerSummarize}
                     className="whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-prodmast-accent/50 hover:bg-prodmast-accent/10 text-xs font-bold text-slate-300 transition-all focus:outline-none"
                   >
                     ⚡ {language === 'kn' ? 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಸಾರಾಂಶ' : 'Summarize Dashboard'}
                   </button>
                   <button 
                     onClick={() => setInputText(language === 'kn' ? 'ಬೆಳೆ ಇಳುವರಿ ಹೇಗಿದೆ?' : 'What are the crop yields looking like?')}
                     className="whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-prodmast-accent/50 hover:bg-prodmast-accent/10 text-xs font-bold text-slate-300 transition-all focus:outline-none"
                   >
                     📈 {language === 'kn' ? 'ಇಳುವರಿ ಅಂದಾಜು ವರದಿ' : 'Predict Yields'}
                   </button>
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-3.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_#ef4444]' : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'}`}
                    >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isListening ? (language === 'kn' ? 'ಆಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Listening...') : (language === 'kn' ? 'ಅಗ್ರಿ-ಬಡ್ಡಿಯನ್ನು ಕೇಳಿ...' : 'Ask Agri-Buddy...')}
                            className="w-full pl-5 pr-12 py-3.5 bg-black/40 border border-white/20 rounded-xl focus:ring-2 focus:ring-prodmast-accent focus:border-transparent transition text-sm text-white placeholder-slate-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-prodmast-accent text-prodmast-dark rounded-lg hover:bg-prodmast-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(163,230,53,0.3)] active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
