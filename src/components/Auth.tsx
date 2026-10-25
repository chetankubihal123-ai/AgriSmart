import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, Lock, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Mail, CheckCircle2, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { sendEmailOTP, generate6DigitOTP, validatePassword } from '../lib/resendService';
import { sendMiniMothOtp, verifyMiniMothOtp } from '../lib/minimothService';

import authFarmerImg from '../assets/auth-farmer.png';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<'phone' | 'email'>('phone');
  
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
  const [otpMethod, setOtpMethod] = useState<'resend' | 'supabase' | 'firebase' | 'minimoth'>('minimoth');

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

  // Handle Password changes - STRICT 6 TO 12 ALPHANUMERIC CHARS ONLY
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    setPassword(cleaned.slice(0, 12));
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }
    if (password.length >= 12) {
      e.preventDefault();
      return;
    }
    if (!/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const isPasswordValid = password.length >= 6 && password.length <= 12 && /^[a-zA-Z0-9]{6,12}$/.test(password);

  // --- MINIMOTH PHONE & WHATSAPP OTP FLOW ---
  const handlePhoneSendOtp = async (purpose: 'signup' | 'login' = isLogin ? 'login' : 'signup') => {
    setError('');
    setMessage('');

    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (purpose === 'signup') {
      const pwdVal = validatePassword(password);
      if (!pwdVal.isValid) {
        setError(pwdVal.message);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await sendMiniMothOtp(phone);
      if (res.success) {
        setMessage(`🌿 6-digit verification code sent to +91 ${phone}! Check WhatsApp and SMS.`);
        setOtpMethod('minimoth');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else {
        setError(res.error || 'Failed to send OTP via MiniMoth. Please check your mobile number.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with MiniMoth OTP service');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userOtp || userOtp.length !== 6) {
      setError('Please enter the 6-digit OTP sent to your WhatsApp or SMS.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyMiniMothOtp(phone, userOtp);
      if (res.success) {
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        if (password) {
          localStorage.setItem(`agrismart_pwd_${phone}`, btoa(password));
        }

        setMessage('✓ Phone verified successfully! Logging you in...');
        setTimeout(() => {
          const from = location.state?.from || '/dashboard';
          navigate(from, { replace: true });
        }, 700);
      } else {
        setError(res.error || 'Invalid OTP code. Please enter the 6-digit code received on WhatsApp or SMS.');
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying Mobile OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePhonePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setMessage('');

    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Please enter your password (minimum 6 characters).');
      return;
    }

    setLoading(true);
    try {
      const savedPwd = localStorage.getItem(`agrismart_pwd_${phone}`);
      if (savedPwd && atob(savedPwd) === password) {
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        setMessage('✓ Signed in successfully! Logging you in...');
        setTimeout(() => {
          const from = location.state?.from || '/dashboard';
          navigate(from, { replace: true });
        }, 600);
        return;
      }

      // Supabase phone login with virtual email fallback
      const virtualEmail = `${phone.slice(-10)}@agrismart.local`;
      const { data, error: supaErr } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password
      });

      if (!supaErr && data?.session) {
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        setMessage('✓ Signed in successfully! Logging you in...');
        setTimeout(() => {
          const from = location.state?.from || '/dashboard';
          navigate(from, { replace: true });
        }, 600);
        return;
      }

      setError('Incorrect password. You can sign in instantly using Mobile / WhatsApp OTP below.');
    } catch (err: any) {
      setError(err.message || 'Error signing in with password');
    } finally {
      setLoading(false);
    }
  };

  // --- EMAIL FLOW (DIRECT PASSWORD LOGIN OR RESEND OTP) ---
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Please enter your password (minimum 6 characters).');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid email or password. You can also click "Sign In with Email OTP" to receive a login code.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        localStorage.setItem('agrismart_user_email', email);
        localStorage.setItem('agrismart_auth_method', 'email');
        setMessage('✓ Signed in successfully! Logging you in...');
        setTimeout(() => {
          const from = location.state?.from || '/dashboard';
          navigate(from, { replace: true });
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Error signing in with password');
    } finally {
      setLoading(false);
    }
  };

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

      const res = await sendEmailOTP(email, otp, purpose === 'reset' ? 'reset' : 'login');

      if (res.success) {
        setMessage(`🌿 Verification code sent to ${email}! Check your inbox (or spam folder).`);
        setOtpMethod('resend');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else {
        // Fallback to Supabase OTP
        try {
          const { error: supaOtpError } = await supabase.auth.signInWithOtp({ email });
          if (!supaOtpError) {
            setMessage(`🌿 Verification code sent to ${email}! Please check your email inbox.`);
            setOtpMethod('supabase');
            setShowOtpVerification(true);
            setOtpCooldown(60);
            return;
          }
        } catch {}

        setMessage(`🌿 Verification email sent to ${email}! Please check your inbox and spam folder.`);
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

        if (userOtp !== generatedOtp) {
          setError(supaVerifyError?.message || 'Invalid OTP code. Please check your email.');
          setLoading(false);
          return;
        }
      } else {
        if (userOtp !== generatedOtp) {
          setError('Invalid OTP code. Please check your email and try again.');
          setLoading(false);
          return;
        }
      }

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (forgotPasswordMethod === 'email') {
      await handleSendEmailOtp('reset');
      return;
    }

    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendMiniMothOtp(phone);
      if (res.success) {
        setMessage(`🌿 6-digit verification code sent to +91 ${phone} via WhatsApp/SMS!`);
        setOtpMethod('minimoth');
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else {
        setError(res.error || 'Failed to send OTP via MiniMoth. Please check your mobile number.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please check your mobile number.');
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

    if (otpMethod === 'minimoth' || otpMethod === 'firebase') {
      setLoading(true);
      try {
        const res = await verifyMiniMothOtp(phone, userOtp);
        if (res.success) {
          setMessage('✓ Mobile OTP verified successfully! Redirecting...');
          setTimeout(() => {
            navigate('/reset-password');
          }, 1000);
          return;
        } else {
          setError(res.error || 'Invalid OTP code. Please enter the 6-digit code received on WhatsApp or SMS.');
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Error verifying Mobile OTP');
        return;
      } finally {
        setLoading(false);
      }
    }

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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 font-sans overflow-y-auto">
        <div className="w-full max-w-md flex items-center justify-between mb-4 z-20">
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setShowOtpVerification(false);
              setUserOtp('');
              setError('');
              setMessage('');
            }}
            className="flex items-center gap-2 text-slate-700 hover:text-green-700 transition-all bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('auth.backToLogin')}</span>
          </button>
          <LanguageSelector />
        </div>

        <div className="bg-white rounded-3xl sm:rounded-[2rem] shadow-xl w-full max-w-md p-6 sm:p-8 lg:p-10 border border-slate-100 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-2xl mb-3 shadow-sm">
              <KeyRound className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-1">{t('auth.forgotPassword')}</h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              {showOtpVerification ? t('auth.enterOtp') : 'Choose how to receive your reset OTP:'}
            </p>
          </div>

          {!showOtpVerification && (
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => { setForgotPasswordMethod('phone'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  forgotPasswordMethod === 'phone' ? 'bg-white text-green-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp / SMS</span>
              </button>
              <button
                type="button"
                onClick={() => { setForgotPasswordMethod('email'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  forgotPasswordMethod === 'email' ? 'bg-white text-green-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>
            </div>
          )}

          <form onSubmit={showOtpVerification ? verifyForgotPasswordOTP : handleForgotPassword} className="space-y-4">
            {!showOtpVerification ? (
              forgotPasswordMethod === 'email' ? (
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
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
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                      placeholder="farmer@example.com"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="reset-phone" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    {t('auth.mobileNumber')}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-slate-500 font-black text-sm pr-1 border-r border-slate-200 mr-2">+91</span>
                      <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-green-500 transition-colors ml-1" />
                    </div>
                    <input
                      id="reset-phone"
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      required
                      className="w-full pl-24 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="flex justify-between mt-1 px-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">10 digits required</p>
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
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-center text-2xl font-black tracking-[0.3em] text-gray-900 placeholder-slate-400 outline-none"
                    placeholder="------"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-center gap-2 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs sm:text-sm flex items-center gap-2 font-bold">
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
              className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-black hover:bg-green-700 transition shadow-lg hover:shadow-green-200/50 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transform text-sm"
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
                className="text-green-600 hover:text-green-700 font-bold text-xs sm:text-sm hover:underline"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN AUTH VIEW (RESPONSIVE SPLIT CARD) ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 lg:p-8 font-sans relative overflow-y-auto w-full">
      {/* Background Decorative Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q 25 40, 50 50 T 100 50' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3Cpath d='M0 70 Q 25 60, 50 70 T 100 70' stroke='%2316a34a' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-200/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* Top Controls: Back to Home + Language Selector */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 sm:mb-6 z-20">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-700 hover:text-green-700 transition-all bg-white/90 hover:bg-white backdrop-blur-md px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md active:scale-95 text-xs sm:text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('auth.backToHome')}</span>
        </button>
        <LanguageSelector />
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] w-full max-w-4xl overflow-hidden flex flex-col lg:flex-row relative z-10 border border-slate-100 mb-8">
        
        {/* Left Section: Visual / Welcome Card */}
        <div className="lg:w-[42%] w-full bg-gradient-to-br from-[#16a34a] via-[#15803d] to-[#14532d] p-6 sm:p-8 lg:p-10 text-white flex flex-col relative overflow-hidden shrink-0">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xl px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-6 border border-white/20">
              <SproutIcon className="w-4 h-4 text-green-300" />
              <span>Smart Farming AI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight mb-2 sm:mb-4">
              {isLogin ? t('auth.welcomeBack') : 'Join'}{' '}
              <span className="text-green-300">AgriSmart</span>
            </h2>
            <p className="text-green-50/80 text-xs sm:text-sm leading-relaxed font-medium">
              {t('auth.joinThousands')}
            </p>
          </div>

          {/* Large farmer illustration shown on desktop */}
          <div className="hidden lg:flex my-6 justify-center relative z-10">
            <div className="relative group">
              <div className="absolute -inset-6 bg-green-400/20 rounded-full blur-[40px] scale-110" />
              <div className="bg-white/5 backdrop-blur-2xl p-3 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="w-52 h-52 lg:w-56 lg:h-56 flex items-center justify-center">
                  <img
                    src={authFarmerImg}
                    alt="AgriSmart AI Assistant"
                    className="w-full h-full object-contain scale-110 drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://illustrations.popsy.co/green/farmer.svg';
                    }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-green-100 border border-white/10">
                    Ready to help
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Empowering farmers stats on desktop */}
          <div className="hidden lg:flex mt-auto pt-6 items-center gap-4 text-xs font-semibold text-green-100/70 relative z-10 border-t border-white/10">
            <div className="flex -space-x-2.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#15803d] bg-green-400 flex items-center justify-center text-[9px] text-green-950 font-black shadow-md"
                >
                  {i}
                </div>
              ))}
            </div>
            <p className="tracking-tight">{t('auth.empoweringFarmers')}</p>
          </div>
        </div>

        {/* Right Section: Interactive Auth Form */}
        <div className="lg:w-[58%] w-full bg-white p-5 sm:p-8 lg:p-10 flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            
            {/* Header: Sign In vs Sign Up */}
            <div className="mb-5 sm:mb-6">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 tracking-tight">
                {isLogin ? t('auth.signIn') : t('auth.signUp')}
              </h3>
              <p className="text-slate-500 font-medium text-xs sm:text-sm">
                {isLogin ? 'Welcome back! Please enter your details.' : 'Join the revolution of smart farming today.'}
              </p>
            </div>

            {/* Authentication Method Selector: Mobile Number vs Email & Password */}
            <div className="flex p-1 bg-slate-100 rounded-2xl mb-5 sm:mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone');
                  setError('');
                  setMessage('');
                  setShowOtpVerification(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  authMethod === 'email'
                    ? 'bg-white text-green-700 shadow-sm border border-slate-200/60 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Email & Password</span>
              </button>
            </div>

            {/* --- METHOD 1: MOBILE NUMBER FLOW --- */}
            {authMethod === 'phone' && (
              <div className="space-y-4">
                {!showOtpVerification ? (
                  <form onSubmit={handlePhonePasswordLogin} className="space-y-4">
                    {/* Mobile Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="phone-login" className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.mobileNumber')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <span className="text-slate-600 font-black text-sm pr-2 border-r border-slate-200 mr-2">+91</span>
                          <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="phone-login"
                          type="tel"
                          value={phone}
                          onChange={handlePhoneChange}
                          required
                          className="w-full pl-24 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="9876543210"
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">10 digits required</p>
                        <p className="text-[9px] text-slate-400 font-bold">{phone.length}/10</p>
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label htmlFor="password-phone" className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">
                          {t('auth.password')} {isLogin && <span className="text-slate-400 font-normal lowercase">(optional for OTP)</span>}
                        </label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPasswordMethod('phone');
                              setIsForgotPassword(true);
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-700 transition tracking-tight hover:underline"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="password-phone"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={handlePasswordChange}
                          onKeyDown={handlePasswordKeyDown}
                          maxLength={12}
                          required={!isLogin}
                          className="w-full pl-12 pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder={isLogin ? 'Enter password or sign in with OTP' : '6-12 letters & numbers'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {!isLogin && (
                        <div className="flex justify-between items-center px-1">
                          <p className={`text-[9px] font-bold ${password.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                            {password.length < 6 ? '6-12 characters required' : '✓ Password valid'}
                          </p>
                          <p className={`text-[9px] font-black ${password.length === 12 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {password.length}/12
                          </p>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}
                    {message && (
                      <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                        <span>{message}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5 pt-1">
                      {/* Button 1: WhatsApp / SMS OTP */}
                      <button
                        type="button"
                        onClick={() => handlePhoneSendOtp(isLogin ? 'login' : 'signup')}
                        disabled={loading || !isPhoneValid || (!isLogin && !isPasswordValid)}
                        className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>{isLogin ? 'Sign In with WhatsApp / SMS OTP' : 'Send WhatsApp / SMS OTP'}</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      {/* Button 2: Direct Password Sign In (if login mode) */}
                      {isLogin && password.length >= 6 && (
                        <button
                          type="submit"
                          disabled={loading || !isPhoneValid}
                          className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4 text-slate-600" />
                          <span>Sign In with Password</span>
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* Phone OTP Verification View */
                  <form onSubmit={handleVerifyPhoneAndSubmit} className="space-y-4">
                    <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs text-green-800 font-bold">
                      <span className="truncate max-w-[200px]">OTP sent to: +91 {phone}</span>
                      <button
                        type="button"
                        onClick={() => { setShowOtpVerification(false); setUserOtp(''); setError(''); setMessage(''); }}
                        className="text-green-700 hover:text-green-900 underline font-black ml-2 shrink-0"
                      >
                        Change
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        ENTER 6-DIGIT OTP SENT TO YOUR PHONE
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={userOtp}
                          onChange={(e) => setUserOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          maxLength={6}
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-black text-2xl tracking-[0.3em] text-center placeholder-slate-400 shadow-sm"
                          placeholder="------"
                          autoFocus
                        />
                      </div>
                      <div className="flex justify-between items-center px-1 text-xs">
                        <button
                          type="button"
                          disabled={otpCooldown > 0 || loading}
                          onClick={() => handlePhoneSendOtp(isLogin ? 'login' : 'signup')}
                          className="font-bold text-green-600 hover:text-green-700 disabled:text-slate-400 flex items-center gap-1 text-[11px] sm:text-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                          <span>{otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}</span>
                        </button>
                        <span className="text-slate-400 text-[10px]">Valid for 10 mins</span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}
                    {message && (
                      <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                        <span>{message}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || userOtp.length !== 6}
                      className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{isLogin ? 'Verify & Sign In' : 'Verify & Create Account'}</span> <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* --- METHOD 2: EMAIL & PASSWORD FLOW --- */}
            {authMethod === 'email' && (
              <div className="space-y-4">
                {!showOtpVerification ? (
                  <form onSubmit={isLogin ? handleEmailPasswordLogin : (e) => { e.preventDefault(); handleSendEmailOtp('signup'); }} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="email-input" className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                        {t('auth.emailAddress')}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="email-input"
                          type="email"
                          value={email}
                          onChange={handleEmailChange}
                          required
                          className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
                          placeholder="farmer@example.com"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label htmlFor="password-email" className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">
                          {t('auth.password')}
                        </label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPasswordMethod('email');
                              setIsForgotPassword(true);
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-700 transition tracking-tight hover:underline"
                          >
                            {t('auth.forgotPassword')}
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        </div>
                        <input
                          id="password-email"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={handlePasswordChange}
                          onKeyDown={handlePasswordKeyDown}
                          required
                          maxLength={12}
                          className="w-full pl-12 pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-bold text-base placeholder-slate-400 shadow-sm"
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
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}
                    {message && (
                      <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>{message}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5 pt-1">
                      {/* Primary Button: Direct Password Login */}
                      {isLogin ? (
                        <>
                          <button
                            type="submit"
                            disabled={loading || !isEmailValid || !isPasswordValid}
                            className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                          >
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Sign In with Password</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </button>

                          {/* Secondary Button: Sign In with Email OTP */}
                          <button
                            type="button"
                            onClick={() => handleSendEmailOtp('login')}
                            disabled={loading || !isEmailValid}
                            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
                          >
                            <Mail className="w-4 h-4 text-slate-600" />
                            <span>Sign In with Email OTP</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="submit"
                          disabled={loading || !isEmailValid || !isPasswordValid}
                          className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                        >
                          {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span>Send Verification OTP</span>
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* Email OTP Verification View */
                  <form onSubmit={handleVerifyEmailAndSubmit} className="space-y-4">
                    <div className="p-3.5 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs">
                      <div className="truncate max-w-[200px]">
                        <p className="text-green-800 font-bold">OTP sent to:</p>
                        <p className="text-green-900 font-black truncate">{email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowOtpVerification(false)}
                        className="text-green-700 hover:text-green-800 font-bold text-xs underline ml-2 shrink-0"
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
                          className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:bg-white focus:border-green-500 transition-all outline-none text-slate-900 font-black text-xl text-center tracking-[0.3em] placeholder-slate-400 shadow-sm"
                          placeholder="000000"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <button
                        type="button"
                        disabled={otpCooldown > 0 || loading}
                        onClick={() => handleSendEmailOtp(isLogin ? 'login' : 'signup')}
                        className="text-xs font-bold text-green-600 hover:text-green-700 disabled:text-slate-400 flex items-center gap-1.5 text-[11px] sm:text-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>{otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : 'Resend OTP'}</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-bold">Valid for 10 mins</span>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span>{error}</span>
                      </div>
                    )}
                    {message && (
                      <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>{message}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || userOtp.length !== 6}
                      className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{isLogin ? t('auth.verifyAndLogin') : 'Verify & Create Account'}</span> <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Bottom Toggle: Switch between Sign In and Sign Up */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setMessage('');
                  setShowOtpVerification(false);
                }}
                className="text-slate-600 font-bold hover:text-green-600 transition group tracking-tight text-xs sm:text-sm inline-flex items-center gap-1.5 py-1 px-2"
              >
                <span>{isLogin ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}</span>
                <span className="text-green-600 group-hover:underline decoration-2 underline-offset-4 font-black">
                  {isLogin ? t('auth.signUp') : t('auth.signIn')}
                </span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Invisible container for potential reCAPTCHA */}
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
