
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, Lock, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

import authFarmerImg from '../assets/auth-farmer.png';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
  };

  const isPhoneValid = phone.length === 10;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        phone: phone,
        password: password,
      });
      if (error) throw error;
      // Navigate to the 'from' location or default to dashboard
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        phone: phone,
        password: password,
      });
      if (error) throw error;
      // If "Confirm phone" is enabled, user needs OTP. If disabled, they get session immediately.
      setMessage('Registration successful! If phone verification is on, check for SMS.');
      setIsLogin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppOTP = async (phoneNumber: string, otp: string) => {
    const sid = import.meta.env.VITE_TWILIO_SID;
    const token = import.meta.env.VITE_TWILIO_TOKEN;
    const fromNumber = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

    if (!sid || !token || !fromNumber) {
      throw new Error('Twilio credentials not configured in .env');
    }

    // Format numbers for Twilio (International format with '+' but NO 'whatsapp:' prefix yet)
    // The input 'phoneNumber' is usually just the 10 digits.
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const toFormatted = `whatsapp:+91${cleanPhone}`; // Assuming India (+91)
    const fromFormatted = `whatsapp:${fromNumber}`;

    try {
      console.log('Attempting to send Twilio WhatsApp OTP to:', toFormatted);

      // Twilio requires form-url-encoded body
      const formData = new URLSearchParams();
      formData.append('To', toFormatted);
      formData.append('From', fromFormatted);
      formData.append('Body', `🌿 *AgriSmart AI Verification*\n\nYour OTP for password reset is: *${otp}*\n\nThis OTP is valid for 10 minutes.`);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${sid}:${token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Twilio API Error:', errorData);
        throw new Error(errorData.message || `Twilio Error: ${response.status}`);
      }

      return true;
    } catch (err) {
      console.error('WhatsApp Error:', err);
      throw err;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      // Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      // Send via WhatsApp
      await sendWhatsAppOTP(phone, otp);

      setMessage('OTP has been sent to your WhatsApp number.');
      setShowOtpVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (userOtp === generatedOtp) {
      setMessage('OTP Verified successfully! Redirecting to password reset...');
      setTimeout(() => {
        navigate('/reset-password');
      }, 1500);
    } else {
      setError('Invalid OTP. Please try again.');
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[2rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.1)] w-full max-w-md p-10 border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword')}</h1>
            <p className="text-gray-600 text-sm">
              {showOtpVerification ? t('auth.enterOtp') : t('auth.enterMobile')}
            </p>
          </div>

          <form onSubmit={showOtpVerification ? verifyOTP : handleForgotPassword} className="space-y-6">
            {!showOtpVerification ? (
              <div>
                <label htmlFor="phone" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                  {t('auth.mobileNumber')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    required
                    className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                    placeholder="9876543210"
                  />
                </div>
                <div className="flex justify-between mt-1 px-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.1em] font-bold">10 digits required</p>
                  <p className="text-[10px] text-slate-400 font-bold">{phone.length}/10</p>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="otp" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                  {t('auth.verifyOtp')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    value={userOtp}
                    onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-center text-xl font-bold tracking-[0.3em] text-gray-900 placeholder-slate-400 outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>
            )}

            {error && <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {error}
            </div>}
            {message && <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm flex items-center gap-2 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {message}
            </div>}

            <button type="submit" disabled={loading || (!showOtpVerification && !isPhoneValid) || (showOtpVerification && userOtp.length !== 6)} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition shadow-lg hover:shadow-green-200/50 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transform">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (showOtpVerification ? t('auth.verifyOtp') : t('auth.sendOtp'))}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setShowOtpVerification(false);
                  setUserOtp('');
                }}
                className="text-green-600 hover:text-green-700 font-bold text-sm hover:underline"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 lg:p-6 font-sans overflow-hidden relative">
      {/* Enhanced Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Farm Field Patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 40, 50 50 T 100 50' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3Cpath d='M0 70 Q 25 60, 50 70 T 100 70' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3Cpath d='M0 30 Q 25 20, 50 30 T 100 30' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }} />

        {/* Soft Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-200/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-700 hover:text-green-700 transition-all bg-white/80 hover:bg-white backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold tracking-tight">{t('auth.backToHome')}</span>
        </button>
        <LanguageSelector />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.1)] w-full max-w-4xl overflow-hidden flex flex-col lg:flex-row min-h-[600px] relative z-10 border border-slate-100">

        {/* Left Section: Welcome Card */}
        <div className="lg:w-[42%] bg-gradient-to-br from-[#16a34a] via-[#15803d] to-[#14532d] p-8 lg:p-10 text-white flex flex-col relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

          <div className="mb-auto relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xl px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/20">
              <SproutIcon className="w-4 h-4 text-green-300" />
              <span>Smart Farming AI</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black leading-[1.1] mb-6">
              {t('auth.welcomeBack')}<br />
              <span className="text-green-300">AgriSmart</span>
            </h2>
            <p className="text-green-50/80 text-sm leading-relaxed font-medium">
              {t('auth.joinThousands')}
            </p>
          </div>

          <div className="my-6 flex justify-center relative z-10">
            <div className="relative group">
              <div className="absolute -inset-6 bg-green-400/20 rounded-full blur-[40px] group-hover:bg-green-400/30 transition-all duration-700 scale-110"></div>
              <div className="bg-white/5 backdrop-blur-2xl p-3 rounded-[3rem] border border-white/10 shadow-2xl relative transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                <div className="w-56 h-56 lg:w-64 lg:h-64 flex items-center justify-center">
                  <img
                    src={authFarmerImg}
                    alt="AgriSmart AI Assistant"
                    className="w-full h-full object-contain scale-110 drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://illustrations.popsy.co/green/farmer.svg';
                    }}
                  />
                </div>
                <div className="mt-4 text-center">
                  <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-green-100 border border-white/10">
                    Ready to help
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 flex items-center gap-4 text-xs font-semibold text-green-100/70 relative z-10 border-t border-white/10">
            <div className="flex -space-x-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#15803d] bg-green-${100 + i * 100} flex items-center justify-center text-[9px] text-green-900 font-black shadow-md`}>
                  {i}
                </div>
              ))}
            </div>
            <p className="tracking-tight">{t('auth.empoweringFarmers')}</p>
          </div>
        </div>

        {/* Right Section: Flip Card Container */}
        <div className="lg:w-[58%] relative perspective-1000 bg-white">
          <div className={`w-full h-full relative transition-transform duration-1000 preserve-3d ${!isLogin ? 'rotate-y-180' : ''}`}>

            {/* Login Side (Front) */}
            <div className="absolute inset-0 backface-hidden flex flex-col justify-center p-6 lg:p-12">
              <div className="max-w-md mx-auto w-full">
                <div className="mb-8 lg:hidden text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-4 shadow-inner">
                    <SproutIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 mb-1">AgriSmart AI</h1>
                  <p className="text-slate-500 font-medium tracking-tight text-sm">Login to manage your farm</p>
                </div>

                <div className="hidden lg:block mb-8">
                  <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.signIn')}</h3>
                  <p className="text-slate-500 font-medium text-sm">Welcome back! Please enter your details.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="phone-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.mobileNumber')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        id="phone-login"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="flex justify-between px-1">
                      <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-bold">10 digits required</p>
                      <p className="text-[9px] text-slate-400 font-bold">{phone.length}/10</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.password')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        id="password-login"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={12}
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end p-1">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-bold text-green-600 hover:text-green-700 transition tracking-tight decoration-2 underline-offset-4 hover:underline">{t('auth.forgotPassword')}</button>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold animate-shake flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !isPhoneValid} 
                    className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4.5 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 transition-opacity group-hover:opacity-100"></div>
                    <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.signIn')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </div>
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <button onClick={() => { setIsLogin(false); setError(''); setMessage(''); }} className="text-slate-500 font-bold hover:text-green-600 transition group tracking-tight text-sm">
                    {t('auth.dontHaveAccount')} <span className="text-green-600 group-hover:underline decoration-2 underline-offset-4">{t('auth.signUp')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Signup Side (Back) */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-center p-6 lg:p-12 bg-white">
              <div className="max-w-md mx-auto w-full">
                <div className="mb-8 lg:hidden text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-4">
                    <SproutIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 mb-1">Create Account</h1>
                </div>

                <div className="hidden lg:block mb-8">
                  <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('auth.signUp')}</h3>
                  <p className="text-slate-500 font-medium text-sm">Join the revolution of smart farming today.</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="phone-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.mobileNumber')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        id="phone-signup"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="flex justify-between px-1">
                      <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-bold">{t('auth.digitsRequired')}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{phone.length}/10</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('auth.password')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                      </div>
                      <input
                        id="password-signup"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={12}
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold animate-shake flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-sm font-bold flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                      {message}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !isPhoneValid} 
                    className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4.5 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 transition-opacity group-hover:opacity-100"></div>
                    <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.signUp')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </div>
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <button onClick={() => { setIsLogin(true); setError(''); setMessage(''); }} className="text-slate-500 font-bold hover:text-green-600 transition group tracking-tight text-sm">
                    {t('auth.alreadyHaveAccount')} <span className="text-green-600 group-hover:underline decoration-2 underline-offset-4">{t('auth.signIn')}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export function SproutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.2.4-4.8-.3-6.8-6-3.3-7.5-5.5-2.7" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 2.6-2.2 4.1-3 4.1-6.6a7.8 7.8 0 0 0-7.3 4Z" />
    </svg>
  );
}


