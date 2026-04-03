
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Chatbot } from './Chatbot';
import { LanguageSelector } from './LanguageSelector';
import {
    LayoutDashboard,
    Sprout,
    CloudSun,
    LogOut,
    Menu,
    X,
    Bug,
    FileText,
    ShoppingBag,
    Users,
    Activity,
    LineChart,
    Landmark
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const { signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);


    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/', { replace: true });
        } catch (error) {
            navigate('/', { replace: true });
        }
    };

    const { t } = useLanguage();

    const farmerNavItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
        { icon: FileText, label: t('nav.landAnalysis'), path: '/land-analysis' },
        { icon: Sprout, label: t('nav.cropHealth'), path: '/crop-health' },
        { icon: Bug, label: t('nav.diseaseDetection'), path: '/disease-detection' },
        { icon: CloudSun, label: t('nav.weather'), path: '/weather' },
        { icon: LineChart, label: 'Market Rates', path: '/market-rates' },
        { icon: Landmark, label: 'Smart Schemes', path: '/schemes' },
        { icon: ShoppingBag, label: t('nav.shop'), path: '/shop' },
    ];

    const adminNavItems = [
        { icon: LayoutDashboard, label: "Admin Overview", path: '/dashboard' },
        { icon: Users, label: "User Management", path: '/admin/users' },
        { icon: ShoppingBag, label: "Shop Orders", path: '/admin/orders' },
        { icon: Activity, label: "Platform Analytics", path: '/admin/analytics' },
    ];

    const navItems = isAdmin ? adminNavItems : farmerNavItems;

    return (
        <div className="min-h-screen text-prodmast-dark flex overflow-hidden bg-[#F9FAFB]">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Hover-Expandable Left Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex-shrink-0 group overflow-hidden
                w-72 lg:w-20 lg:hover:w-72 shadow-2xl lg:shadow-none
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-full flex flex-col w-72">
                    {/* Header/Logo */}
                    <div className="p-6 h-20 border-b border-gray-100 flex items-center shrink-0">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
                            <div className="w-10 h-10 shrink-0 bg-prodmast-primary rounded-[14px] flex items-center justify-center shadow-md">
                                <Sprout className="w-5 h-5 text-prodmast-accent" />
                            </div>
                            <span className="text-2xl font-sans font-extrabold text-prodmast-dark tracking-tight whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                AgriSmart
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`
                                        w-full flex items-center gap-4 px-3 py-3.5 rounded-[18px] text-sm font-bold transition-all relative overflow-hidden group/btn
                                        ${isActive
                                            ? 'bg-prodmast-primary/10 text-prodmast-primary border border-prodmast-primary/20'
                                            : 'text-prodmast-muted hover:bg-gray-50 hover:text-prodmast-dark border border-transparent'}
                                    `}
                                    title={item.label}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-prodmast-primary rounded-r-md hidden lg:block"></div>
                                    )}
                                    <div className={`shrink-0 flex items-center justify-center ${isActive ? 'text-prodmast-primary scale-110' : 'text-prodmast-muted group-hover/btn:scale-110 transition-transform'}`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className="whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 shrink-0 space-y-2">
                        <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 overflow-hidden h-10">
                            <LanguageSelector className="w-full justify-center !text-sm border border-gray-200" />
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-4 px-3 py-3 rounded-[18px] text-sm font-bold text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                            title={t('nav.signOut')}
                        >
                            <div className="shrink-0 flex items-center justify-center">
                                <LogOut className="w-6 h-6 scale-90" />
                            </div>
                            <span className="whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                {t('nav.signOut')}
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen relative overflow-hidden transition-all duration-300 ease-in-out lg:ml-20 ${isChatOpen ? 'mr-0 lg:mr-96' : 'mr-0'}`}>
                {/* Mobile Header */}
                <header className="bg-white border-b border-gray-200 lg:hidden p-4 flex items-center justify-between z-30 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 shrink-0 bg-prodmast-primary rounded-xl flex items-center justify-center">
                            <Sprout className="w-5 h-5 text-prodmast-accent" />
                        </div>
                        <h1 className="text-xl font-bold text-prodmast-dark">AgriSmart</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <LanguageSelector className="!px-2 !py-1 text-xs border border-gray-200" />
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-prodmast-dark hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-10 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {children}
                </main>
            </div>

            {/* Right Chatbot Sidebar */}
            <div className={`fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}>
                <div className="h-full w-full md:w-96 shadow-2xl bg-white border-l border-gray-200">
                    <Chatbot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
                </div>
            </div>

            {/* Chatbot Toggle Button */}
            {!isChatOpen && (
                <Chatbot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
            )}
        </div>
    );
}
