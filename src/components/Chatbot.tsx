
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

    // Copilot Action
    const triggerSummarize = () => {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: "Please summarize the farm dashboard.", sender: 'user', timestamp: new Date() }]);
        setIsTyping(true);
        setTimeout(() => {
            const summary = "Here is your Farm Summary: \n1. Primary Location: Karnataka \n2. Live Market: Chilli is up (+4.2%), while Tomato is down. \n3. Alerts: High risk of Leaf Blight detected in Sector 4. \n4. Overall ROI is tracking at 28.4%. \nWould you like me to deploy treatments?";
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: summary, sender: 'ai', timestamp: new Date() }]);
            setIsTyping(false);
            speak(summary);
        }, 1500);
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
                <span className="font-bold text-sm tracking-wide hidden md:inline text-prodmast-accent uppercase">Farm Copilot</span>
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
                        <h3 className="font-black text-white tracking-wide text-lg">Farm Copilot</h3>
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
                     ⚡ Summarize Dashboard
                   </button>
                   <button 
                     onClick={() => setInputText("What are the crop yields looking like?")}
                     className="whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-prodmast-accent/50 hover:bg-prodmast-accent/10 text-xs font-bold text-slate-300 transition-all focus:outline-none"
                   >
                     📈 Predict Yields
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
                            placeholder={isListening ? "Listening..." : "Ask your farm copilot..."}
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
