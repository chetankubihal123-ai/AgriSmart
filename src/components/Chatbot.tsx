
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, MessageSquare, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { findBestMatch } from '../lib/knowledgeBase';
import { useLanguage } from '../contexts/LanguageContext';

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

export function Chatbot({ isOpen, setIsOpen }: ChatbotProps) {
    const { t, translations } = useLanguage();
    // Internal state for messages stays here
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

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            
            // Set language dynamically
            recognitionRef.current.lang = t('chatbot.greeting').includes('ಹಲೋ') ? 'kn-IN' : 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, [t]);

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
        utterance.lang = t('chatbot.greeting').includes('ಹಲೋ') ? 'kn-IN' : 'en-US';
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
        setInputText('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const bestMatch = findBestMatch(inputText);
            let responseText = "";

            if (bestMatch) {
                responseText = bestMatch;
            } else {
                const fallbacks = translations.chatbot.fallbacks;
                responseText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
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
        }, 1000 + Math.random() * 1000);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all z-50 flex items-center gap-2 hover:scale-110 active:scale-95"
            >
                <MessageSquare className="w-6 h-6" />
                <span className="font-medium hidden md:inline">{t('chatbot.trigger')}</span>
            </button>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-2xl w-full h-full">
            {/* Header */}
            <div className="p-4 border-b bg-green-50 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                        <Bot className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">AgriBot</h3>
                        <p className="text-xs text-green-600 font-medium">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        className={`p-2 rounded-lg transition-colors ${isVoiceEnabled ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={isVoiceEnabled ? "Mute Voice" : "Unmute Voice"}
                    >
                        {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.sender === 'user'
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t bg-white flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isListening ? "Listening..." : t('chatbot.placeholder')}
                            className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-sm text-gray-900 placeholder-gray-500 shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
