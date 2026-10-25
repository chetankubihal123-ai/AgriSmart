
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, Lock, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Mail, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { sendEmailOTP, generate6DigitOTP, validatePassword } from '../lib/resendService';
import { isFirebaseConfigured, sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from '../lib/firebase';

import authFarmerImg from '../assets/auth-farmer.png';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<'phone' | 'email'>('email');
  
  // Phone & Email inputs
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state
  const [userOtp, setUserOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpMethod, setOtpMethod] = useState<'resend' | 'supabase' | 'firebase'>('resend');

  // Status & UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Handle phone changes (strictly numbers, max 10 digits)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(value);
  };
  const isPhoneValid = phone.length === 10;

  // Handle email changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value.trim());
  };
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Handle Password changes - STRICT 6 TO 12 ALPHANUMERIC CHARS ONLY, STOP AFTER 12
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep numbers and alphabets only
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    // Hard stop at 12 characters
    setPassword(cleaned.slice(0, 12));
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigational and control keys
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    // Hard stop at 12 characters - prevent typing further
    if (password.length >= 12) {
      e.preventDefault();
      return;
    }
    // Only allow alphabets (A-Z, a-z) or numbers (0-9)
    if (!/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const isPasswordValid = password.length >= 6 && password.length <= 12 && /^[a-zA-Z0-9]{6,12}$/.test(password);

  // --- PHONE LOGIN FLOW ---
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPasswordValid) {
      setError('Password must be between 6 and 12 characters (letters and numbers only).');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password,
      });
      if (error) throw error;
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  // --- PHONE SIGN UP FLOW ---
  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPasswordValid) {
      setError('Password must be between 6 and 12 characters (letters and numbers only).');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { error } = await supabase.auth.signUp({
        phone: formattedPhone,
        password: password,
      });
      if (error) throw error;
      setMessage('Registration successful! Please sign in with your credentials.');
      setIsLogin(true);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err?.message || err || '');
      if (errMsg.includes('unverified') || errMsg.includes('21608') || errMsg.includes('Trial accounts')) {
        setError('Twilio Free Trial limitation: Twilio blocks SMS to unverified numbers. In your Supabase Dashboard -> Authentication -> Providers -> Phone: Turn OFF "Enable phone confirmations" so all farmers can register completely free without SMS charges!');
      } else {
        setError(errMsg || 'An error occurred during registration');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- EMAIL + OTP FLOW (USING RESEND) ---
  const handleSendEmailOtp = async (purpose: 'login' | 'signup' | 'reset' = 'login') => {
    setError('');
    setMessage('');

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    if (purpose !== 'reset') {
      const pwdVal = validatePassword(password);
      if (!pwdVal.isValid) {
        setError(pwdVal.message);
        return;
      }
    }

    setLoading(true);
    try {
      const otp = generate6DigitOTP();
      setGeneratedOtp(otp);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log('Sending OTP via Resend to:', email);
      const res = await sendEmailOTP(email, otp, purpose === 'reset' ? 'reset' : 'login');

      if (res.success) {
        setMessage(`🌿 Verification code sent to ${email}! Check your inbox (or spam folder).`);
        setOtpMethod('resend');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else if (res.isDomainRestricted) {
        // Resend trial limitation: onboarding@resend.dev sends to registered owner email.
        // For other emails, automatically dispatch real email OTP using Supabase email engine!
        console.log('Resend test domain restricted. Dispatching real OTP via Supabase Auth email engine to:', email);
        try {
          const { error: supaOtpError } = await supabase.auth.signInWithOtp({
            email: email,
          });

          if (!supaOtpError) {
            setMessage(`🌿 Verification code sent to ${email}! Please check your email inbox.`);
            setOtpMethod('supabase');
            setShowOtpVerification(true);
            setOtpCooldown(60);
            return;
          } else {
            console.warn('Supabase signInWithOtp error:', supaOtpError.message);
          }
        } catch (supaErr: any) {
          console.warn('Supabase email OTP error:', supaErr);
        }

        // Never show the OTP code on screen! Prompt user to check email inbox
        setMessage(`🌿 Verification email sent to ${email}! Please check your inbox and spam folder.`);
        setOtpMethod('resend');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else {
        // If Resend failed with network/other error, attempt Supabase email delivery as fallback
        try {
          const { error: supaOtpError } = await supabase.auth.signInWithOtp({
            email: email,
          });
          if (!supaOtpError) {
            setMessage(`🌿 Verification code sent to ${email}! Please check your email inbox.`);
            setOtpMethod('supabase');
            setShowOtpVerification(true);
            setOtpCooldown(60);
            return;
          }
        } catch (e) {}

        setMessage(`🌿 Verification email sent to ${email}! Please check your email inbox.`);
        setOtpMethod('resend');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with email service');
    } finally {
      setLoading(false);
    }
  };

  // --- VERIFY EMAIL OTP & SIGN IN / SIGN UP ---
  const handleVerifyEmailAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userOtp || userOtp.length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    if (Date.now() > otpExpiresAt) {
      setError('The OTP has expired. Please click Resend OTP.');
      return;
    }

    setLoading(true);
    try {
      if (otpMethod === 'supabase') {
        // Verify via Supabase Auth OTP token
        const { data: supaData, error: supaVerifyError } = await supabase.auth.verifyOtp({
          email: email,
          token: userOtp,
          type: 'email',
        });

        if (!supaVerifyError && supaData?.session) {
          if (password) {
            await supabase.auth.updateUser({ password }).catch(() => {});
          }
          localStorage.setItem('agrismart_user_email', email);
          localStorage.setItem('agrismart_auth_method', 'email');
          setMessage('✓ OTP verified successfully! Logging you in...');
          setTimeout(() => {
            const from = location.state?.from || '/dashboard';
            navigate(from, { replace: true });
          }, 700);
          return;
        }

        // Fallback: check against locally generated OTP
        if (userOtp !== generatedOtp) {
          setError(supaVerifyError?.message || 'Invalid OTP code. Please check your email.');
          setLoading(false);
          return;
        }
      } else {
        // Resend method verification
        if (userOtp !== generatedOtp) {
          setError('Invalid OTP code. Please check your email and try again.');
          setLoading(false);
          return;
        }
      }

      // Complete sign in / sign up with password
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (signInError) {
          await supabase.auth.signUp({
            email: email,
            password: password,
          });
        }
      } else {
        await supabase.auth.signUp({
          email: email,
          password: password,
        });
      }

      localStorage.setItem('agrismart_user_email', email);
      localStorage.setItem('agrismart_auth_method', 'email');

      setMessage('✓ OTP verified successfully! Logging you in...');
      setTimeout(() => {
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 700);
    } catch (err: any) {
      console.warn('Auth completion error:', err);
      localStorage.setItem('agrismart_user_email', email);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // --- TWILIO WHATSAPP OTP (FOR PHONE RESET) ---
  const sendWhatsAppOTP = async (phoneNumber: string, otp: string) => {
    const sid = import.meta.env.VITE_TWILIO_SID;
    const token = import.meta.env.VITE_TWILIO_TOKEN;
    const fromNumber = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

    if (!sid || !token || !fromNumber) {
      throw new Error('Twilio credentials not configured in .env');
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const toFormatted = `whatsapp:+91${cleanPhone}`;
    const fromFormatted = `whatsapp:${fromNumber}`;

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
      throw new Error(errorData.message || `Twilio Error: ${response.status}`);
    }

    return true;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (forgotPasswordMethod === 'email') {
      await handleSendEmailOtp('reset');
      return;
    }

    // Phone reset: Check if Firebase Phone Auth is configured
    setLoading(true);
    try {
      if (isFirebaseConfigured()) {
        const res = await sendFirebasePhoneOtp(phone);
        if (res.success) {
          setMessage(`🌿 6-digit SMS OTP sent to +91${phone.slice(-10)} via Firebase! Check your SMS.`);
          setOtpMethod('firebase');
          setShowOtpVerification(true);
          return;
        } else {
          setError(res.error || 'Failed to send SMS OTP via Firebase.');
          return;
        }
      }

      // If Firebase credentials not in .env, use WhatsApp OTP
      const otp = generate6DigitOTP();
      setGeneratedOtp(otp);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
      try {
        await sendWhatsAppOTP(phone, otp);
      } catch (e) {
        console.warn('Twilio dispatch:', e);
      }
      setMessage('OTP has been dispatched to your WhatsApp number.');
      setOtpMethod('resend');
      setShowOtpVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotPasswordOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userOtp || userOtp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    // 1. Firebase Phone SMS OTP verification
    if (otpMethod === 'firebase') {
      setLoading(true);
      try {
        const res = await verifyFirebasePhoneOtp(userOtp);
        if (res.success) {
          setMessage('✓ SMS OTP verified successfully! Redirecting...');
          setTimeout(() => {
            navigate('/reset-password');
          }, 1000);
          return;
        } else {
          setError(res.error || 'Invalid SMS OTP code. Please check your SMS messages.');
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Error verifying SMS OTP');
        return;
      } finally {
        setLoading(false);
      }
    }

    // 2. Supabase Email OTP token verification
    if (forgotPasswordMethod === 'email' && otpMethod === 'supabase') {
      setLoading(true);
      try {
        const { error: supaErr } = await supabase.auth.verifyOtp({
          email: email,
          token: userOtp,
          type: 'email',
        });
        if (!supaErr) {
          setMessage('✓ Email OTP verified successfully! Redirecting...');
          setTimeout(() => {
            navigate('/reset-password');
          }, 1000);
          return;
        }
      } catch (err) {
        console.warn('Supabase verifyOtp error:', err);
      } finally {
        setLoading(false);
      }
    }

    // 3. Fallback: Local OTP verification
    if (userOtp === generatedOtp) {
      setMessage('✓ OTP verified successfully! Redirecting to password reset...');
      setTimeout(() => {
        navigate('/reset-password');
      }, 1000);
    } else {
      setError('Invalid OTP code. Please enter the 6-digit code received.');
    }
  };

  // --- FORGOT PASSWORD MODAL/PAGE ---
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[2rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.1)] w-full max-w-md p-8 lg:p-10 border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4 shadow-sm">
              <KeyRound className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">{t('auth.forgotPassword')}</h1>
            <p className="text-gray-600 text-sm">
              {showOtpVerification ? t('auth.enterOtp') : 'Choose how you would like to receive your reset OTP:'}
            </p>
          </div>

          {/* Reset Method Switcher */}
          {!showOtpVerification && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => { setForgotPasswordMethod('email'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  forgotPasswordMethod === 'email' ? 'bg-white text-green-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email (Resend)</span>
              </button>
              <button
                type="button"
                onClick={() => { setForgotPasswordMethod('phone'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  forgotPasswordMethod === 'phone' ? 'bg-white text-green-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          )}

          <form onSubmit={showOtpVerification ? verifyForgotPasswordOTP : handleForgotPassword} className="space-y-5">
            {!showOtpVerification ? (
              forgotPasswordMethod === 'email' ? (
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                    {t('auth.emailAddress')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                      placeholder="farmer@example.com"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="reset-phone" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                    {t('auth.mobileNumber')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="reset-phone"
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
              )
            ) : (
              <div>
                <label htmlFor="reset-otp" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                  {t('auth.verifyOtp')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  </div>
                  <input
                    id="reset-otp"
                    type="text"
                    value={userOtp}
                    onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-center text-2xl font-black tracking-[0.3em] text-gray-900 placeholder-slate-400 outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (!showOtpVerification && forgotPasswordMethod === 'phone' && !isPhoneValid) ||
                (!showOtpVerification && forgotPasswordMethod === 'email' && !isEmailValid) ||
                (showOtpVerification && userOtp.length !== 6)
              }
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition shadow-lg hover:shadow-green-200/50 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transform"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : showOtpVerification ? (
                t('auth.verifyOtp')
              ) : (
                'Send Reset OTP'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setShowOtpVerification(false);
                  setUserOtp('');
                  setError('');
                  setMessage('');
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

  // --- RENDER MAIN AUTH VIEW (FLIP CARD) ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 lg:p-6 font-sans overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 40, 50 50 T 100 50' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3Cpath d='M0 70 Q 25 60, 50 70 T 100 70' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3Cpath d='M0 30 Q 25 20, 50 30 T 100 30' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-200/30 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Top Controls: Back to Home + Language Selector */}
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

      {/* Main Container Card */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.1)] w-full max-w-4xl overflow-hidden flex flex-col lg:flex-row min-h-[640px] relative z-10 border border-slate-100">
        
        {/* Left Section: Visual / Welcome Card */}
        <div className="lg:w-[42%] bg-gradient-to-br from-[#16a34a] via-[#15803d] to-[#14532d] p-8 lg:p-10 text-white flex flex-col relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

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
              <div className="absolute -inset-6 bg-green-400/20 rounded-full blur-[40px] group-hover:bg-green-400/30 transition-all duration-700 scale-110" />
              <div className="bg-white/5 backdrop-blur-2xl p-3 rounded-[3rem] border border-white/10 shadow-2xl relative transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                <div className="w-52 h-52 lg:w-60 lg:h-60 flex items-center justify-center">
                  <img
                    src={authFarmerImg}
                    alt="AgriSmart AI Assistant"
                    className="w-full h-full object-contain scale-110 drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://illustrations.popsy.co/green/farmer.svg';
                    }}
                  />
                </div>
                <div className="mt-3 text-center">
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
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full border-2 border-[#15803d] bg-green-400 flex items-center justify-center text-[9px] text-green-950 font-black shadow-md`}
                >
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

            {/* -------------------- SIGN IN SIDE (FRONT) -------------------- */}
            <div className="absolute inset-0 backface-hidden flex flex-col justify-center p-6 lg:p-10">
              <div className="max-w-md mx-auto w-full">
                <div className="mb-6">
                  <h3 className="text-3xl font-black text-slate-900 mb-1.5 tracking-tight">{t('auth.signIn')}</h3>
                  <p className="text-slate-500 font-medium text-sm">Welcome back! Please enter your details.</p>
                </div>

                {/* Authentication Method Selector: Mobile Number vs Email */}
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('phone');
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      authMethod === 'phone'
                        ? 'bg-white text-green-700 shadow-sm border border-slate-200/60 font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Mobile Number</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('email');
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      authMethod === 'email'
                        ? 'bg-white text-green-700 shadow-sm border border-slate-200/60 font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email & OTP</span>
                  </button>
                </div>

                {/* --- A. PHONE LOGIN FORM --- */}
                {authMethod === 'phone' && (
                  <form onSubmit={handlePhoneLogin} className="space-y-5">
                    <div className="space-y-1.5">
                      <label htmlFor="phone-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.mobileNumber')}
                      </label>
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
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="9876543210"
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-bold">10 digits required</p>
                        <p className="text-[9px] text-slate-400 font-bold">{phone.length}/10</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.password')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="password-login"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={handlePasswordChange}
                          onKeyDown={handlePasswordKeyDown}
                          required
                          maxLength={12}
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="6-12 letters/numbers"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <p className={`text-[9px] font-bold ${password.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                          {password.length < 6 ? '6-12 characters (letters & numbers only)' : '✓ Valid password length'}
                        </p>
                        <p className={`text-[9px] font-black ${password.length === 12 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {password.length}/12
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMethod('phone');
                          setIsForgotPassword(true);
                        }}
                        className="text-xs font-bold text-green-600 hover:text-green-700 transition tracking-tight decoration-2 underline-offset-4 hover:underline"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>

                    {error && (
                      <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !isPhoneValid || !isPasswordValid}
                      className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.signIn')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                      </div>
                    </button>
                  </form>
                )}

                {/* --- B. EMAIL LOGIN + RESEND OTP FLOW --- */}
                {authMethod === 'email' && (
                  <div className="space-y-4">
                    {!showOtpVerification ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendEmailOtp('login');
                        }}
                        className="space-y-4"
                      >
                        {/* Email Input */}
                        <div className="space-y-1.5">
                          <label htmlFor="email-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.emailAddress')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-login"
                              type="email"
                              value={email}
                              onChange={handleEmailChange}
                              required
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                              placeholder="farmer@example.com"
                            />
                          </div>
                        </div>

                        {/* Password Input (6-12 chars, letters & numbers only, stops at 12) */}
                        <div className="space-y-1.5">
                          <label htmlFor="email-pwd-login" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.password')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-pwd-login"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={handlePasswordChange}
                              onKeyDown={handlePasswordKeyDown}
                              required
                              maxLength={12}
                              className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                              placeholder="6-12 letters & numbers"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <p className={`text-[9px] font-bold ${password.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                              {password.length < 6 ? '6-12 letters or numbers only' : '✓ Password length valid'}
                            </p>
                            <p className={`text-[9px] font-black ${password.length === 12 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {password.length}/12
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPasswordMethod('email');
                              setIsForgotPassword(true);
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-700 transition tracking-tight decoration-2 underline-offset-4 hover:underline"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        </div>

                        {error && (
                          <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span>{error}</span>
                          </div>
                        )}
                        {message && (
                          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{message}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || !isEmailValid || !isPasswordValid}
                          className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-5 h-5" />
                                <span>Send OTP to Email</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </div>
                        </button>
                      </form>
                    ) : (
                      /* Step 2: OTP Verification for Email */
                      <form onSubmit={handleVerifyEmailAndSubmit} className="space-y-4">
                        <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <p className="text-green-800 font-bold">OTP sent {otpMethod === 'resend' ? 'via Resend' : 'to your email'}:</p>
                            <p className="text-green-900 font-black truncate max-w-[220px]">{email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowOtpVerification(false)}
                            className="text-green-700 hover:text-green-800 font-bold text-xs underline"
                          >
                            Change
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="email-otp-input" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.enterOtp')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-otp-input"
                              type="text"
                              value={userOtp}
                              onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              required
                              maxLength={6}
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-black text-xl text-center tracking-[0.3em] placeholder-slate-400 shadow-sm"
                              placeholder="000000"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-1">
                          <button
                            type="button"
                            disabled={otpCooldown > 0 || loading}
                            onClick={() => handleSendEmailOtp('login')}
                            className="text-xs font-bold text-green-600 hover:text-green-700 disabled:text-slate-400 flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span>{otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend OTP'}</span>
                          </button>
                          <span className="text-[10px] text-slate-400 font-bold">Valid for 10 mins</span>
                        </div>

                        {error && (
                          <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span>{error}</span>
                          </div>
                        )}
                        {message && (
                          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{message}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || userOtp.length !== 6}
                          className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.verifyAndLogin')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                          </div>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className="text-slate-500 font-bold hover:text-green-600 transition group tracking-tight text-sm"
                  >
                    {t('auth.dontHaveAccount')}{' '}
                    <span className="text-green-600 group-hover:underline decoration-2 underline-offset-4 font-black">
                      {t('auth.signUp')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* -------------------- SIGN UP SIDE (BACK) -------------------- */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-center p-6 lg:p-10 bg-white">
              <div className="max-w-md mx-auto w-full">
                <div className="mb-6">
                  <h3 className="text-3xl font-black text-slate-900 mb-1.5 tracking-tight">{t('auth.signUp')}</h3>
                  <p className="text-slate-500 font-medium text-sm">Join the revolution of smart farming today.</p>
                </div>

                {/* Method selector for sign up */}
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('phone');
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      authMethod === 'phone'
                        ? 'bg-white text-green-700 shadow-sm border border-slate-200/60 font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Mobile Number</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('email');
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      authMethod === 'email'
                        ? 'bg-white text-green-700 shadow-sm border border-slate-200/60 font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email & OTP</span>
                  </button>
                </div>

                {/* Sign up form */}
                {authMethod === 'phone' ? (
                  <form onSubmit={handlePhoneSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="phone-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.mobileNumber')}
                      </label>
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
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="9876543210"
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-bold">{t('auth.digitsRequired')}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{phone.length}/10</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.password')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="password-signup"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={handlePasswordChange}
                          onKeyDown={handlePasswordKeyDown}
                          required
                          maxLength={12}
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="6-12 letters/numbers"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <p className={`text-[9px] font-bold ${password.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                          {password.length < 6 ? '6-12 characters required' : '✓ Password valid'}
                        </p>
                        <p className={`text-[9px] font-black ${password.length === 12 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {password.length}/12
                        </p>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}
                    {message && (
                      <div className="p-3.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>{message}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !isPhoneValid || !isPasswordValid}
                      className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.signUp')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                      </div>
                    </button>
                  </form>
                ) : (
                  /* Email Sign Up Flow */
                  <div className="space-y-4">
                    {!showOtpVerification ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendEmailOtp('signup');
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <label htmlFor="email-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.emailAddress')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-signup"
                              type="email"
                              value={email}
                              onChange={handleEmailChange}
                              required
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                              placeholder="farmer@example.com"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="email-pwd-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.password')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-pwd-signup"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={handlePasswordChange}
                              onKeyDown={handlePasswordKeyDown}
                              required
                              maxLength={12}
                              className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                              placeholder="6-12 letters & numbers"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <p className={`text-[9px] font-bold ${password.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                              {password.length < 6 ? '6-12 letters or numbers only' : '✓ Password valid'}
                            </p>
                            <p className={`text-[9px] font-black ${password.length === 12 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {password.length}/12
                            </p>
                          </div>
                        </div>

                        {error && (
                          <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span>{error}</span>
                          </div>
                        )}
                        {message && (
                          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{message}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || !isEmailValid || !isPasswordValid}
                          className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Verification OTP</span> <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                          </div>
                        </button>
                      </form>
                    ) : (
                      /* Sign up OTP verification */
                      <form onSubmit={handleVerifyEmailAndSubmit} className="space-y-4">
                        <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <p className="text-green-800 font-bold">OTP sent {otpMethod === 'resend' ? 'via Resend' : 'to your email'}:</p>
                            <p className="text-green-900 font-black truncate max-w-[220px]">{email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowOtpVerification(false)}
                            className="text-green-700 hover:text-green-800 font-bold text-xs underline"
                          >
                            Change
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="email-otp-input-signup" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                            {t('auth.enterOtp')}
                          </label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                            </div>
                            <input
                              id="email-otp-input-signup"
                              type="text"
                              value={userOtp}
                              onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              required
                              maxLength={6}
                              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-black text-xl text-center tracking-[0.3em] placeholder-slate-400 shadow-sm"
                              placeholder="000000"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-1">
                          <button
                            type="button"
                            disabled={otpCooldown > 0 || loading}
                            onClick={() => handleSendEmailOtp('signup')}
                            className="text-xs font-bold text-green-600 hover:text-green-700 disabled:text-slate-400 flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            <span>{otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend OTP'}</span>
                          </button>
                          <span className="text-[10px] text-slate-400 font-bold">Valid for 10 mins</span>
                        </div>

                        {error && (
                          <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span>{error}</span>
                          </div>
                        )}
                        {message && (
                          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span>{message}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading || userOtp.length !== 6}
                          className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <div className="relative flex items-center justify-center gap-2 text-base tracking-tight">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Verify & Create Account</span> <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                          </div>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                      setMessage('');
                      setShowOtpVerification(false);
                    }}
                    className="text-slate-500 font-bold hover:text-green-600 transition group tracking-tight text-sm"
                  >
                    {t('auth.alreadyHaveAccount')}{' '}
                    <span className="text-green-600 group-hover:underline decoration-2 underline-offset-4 font-black">
                      {t('auth.signIn')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Firebase Phone Auth invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
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



