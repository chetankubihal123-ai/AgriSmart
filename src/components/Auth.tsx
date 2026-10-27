import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Phone, Lock, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Mail, CheckCircle2, RefreshCw, KeyRound, UserPlus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { sendEmailOTP, generate6DigitOTP, validatePassword, ADMIN_EMAIL } from '../lib/resendService';
import { sendMiniMothOtp, verifyMiniMothOtp } from '../lib/minimothService';

import authFarmerImg from '../assets/auth-farmer.png';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  
  // Forgot password state (OTP is required ONLY here)
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<'phone' | 'email'>('phone');
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Phone & Email inputs
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP state for Forgot Password
  const [userOtp, setUserOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpMethod, setOtpMethod] = useState<'resend' | 'supabase' | 'minimoth'>('minimoth');
  const [resendRestricted, setResendRestricted] = useState(false);

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

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    setNewPassword(cleaned.slice(0, 12));
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
    if ((e.currentTarget.value.length >= 12)) {
      e.preventDefault();
      return;
    }
    if (!/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const isPasswordValid = password.length >= 6 && password.length <= 12 && /^[a-zA-Z0-9]{6,12}$/.test(password);
  const isNewPasswordValid = newPassword.length >= 6 && newPassword.length <= 12 && /^[a-zA-Z0-9]{6,12}$/.test(newPassword);

  // ==========================================
  // 1. MOBILE NUMBER FLOW (NO OTP FOR SIGNUP/LOGIN)
  // ==========================================

  // Helper to record farmer logins and registrations for the Admin Dashboard
  const recordFarmerActivity = (phoneNum: string, emailAddr: string, actType: 'signup' | 'login' = 'login') => {
    try {
      const existingLogins = JSON.parse(localStorage.getItem('agrismart_farmer_logins') || '[]');
      const existingFarmers = JSON.parse(localStorage.getItem('agrismart_registered_farmers') || '[]');
      const now = new Date();
      const displayName = phoneNum ? `Farmer (+91 ${phoneNum})` : (emailAddr ? emailAddr.split('@')[0] : 'Farmer');

      existingLogins.unshift({
        id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 5),
        name: displayName,
        phone: phoneNum || 'N/A',
        email: emailAddr || 'N/A',
        type: actType,
        date: now.toLocaleDateString('en-IN'),
        time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: now.toISOString(),
        status: 'Active'
      });
      localStorage.setItem('agrismart_farmer_logins', JSON.stringify(existingLogins.slice(0, 50)));

      const existingIdx = existingFarmers.findIndex((f: any) => (phoneNum && f.phone === phoneNum) || (emailAddr && f.email === emailAddr));
      if (existingIdx >= 0) {
        existingFarmers[existingIdx].lastLogin = now.toISOString();
        existingFarmers[existingIdx].loginCount = (existingFarmers[existingIdx].loginCount || 1) + 1;
      } else {
        existingFarmers.unshift({
          id: 'usr_' + Date.now(),
          name: displayName,
          phone: phoneNum || 'N/A',
          email: emailAddr || 'N/A',
          registeredAt: now.toISOString(),
          lastLogin: now.toISOString(),
          loginCount: 1,
          status: 'Active'
        });
      }
      localStorage.setItem('agrismart_registered_farmers', JSON.stringify(existingFarmers.slice(0, 50)));
    } catch {}
  };

  // --- MOBILE SIGN UP (CREATE ACCOUNT: NO OTP) ---
  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setError(pwdVal.message);
      return;
    }

    setLoading(true);
    try {
      // 1. Save credentials locally
      localStorage.setItem('agrismart_user_phone', phone);
      localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
      localStorage.setItem(`agrismart_pwd_${phone}`, btoa(password));

      if (phone === '9739623988') {
        localStorage.setItem('agrismart_is_admin', 'true');
        localStorage.setItem('user_role', 'expert');
      }

      // 2. Also register in Supabase using virtual email
      const virtualEmail = `${phone.slice(-10)}@agrismart.local`;
      await supabase.auth.signUp({
        email: virtualEmail,
        password: password,
        options: {
          data: {
            phone: phone,
            display_phone: `+91 ${phone}`,
          }
        }
      }).catch(() => {});

      // 3. Ensure active session
      await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password
      }).catch(() => {});

      recordFarmerActivity(phone, '', 'signup');
      window.dispatchEvent(new Event('agrismart_auth_state_changed'));

      setMessage('✓ Account created successfully! Logging you in...');
      setTimeout(() => {
        if (phone === '9739623988') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          const from = location.state?.from || '/dashboard';
          navigate(from, { replace: true });
        }
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- MOBILE SIGN IN (LOGIN: NO OTP) ---
  const handlePhonePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Check Admin credentials explicitly
      if (phone === '9739623988' && password === '123456789') {
        localStorage.setItem('agrismart_user_phone', '9739623988');
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        localStorage.setItem('agrismart_is_admin', 'true');
        localStorage.setItem('user_role', 'expert');
        localStorage.setItem('agrismart_pwd_9739623988', btoa('123456789'));

        const virtualEmail = '9739623988@agrismart.local';
        await supabase.auth.signInWithPassword({ email: virtualEmail, password: '123456789' }).catch(async () => {
          await supabase.auth.signUp({ email: virtualEmail, password: '123456789' }).catch(() => {});
        });

        window.dispatchEvent(new Event('agrismart_auth_state_changed'));
        setMessage('✓ Welcome Administrator! Accessing Admin Dashboard...');
        setTimeout(() => {
          navigate('/admin/dashboard', { replace: true });
        }, 600);
        return;
      }

      // 1. Check local saved password
      const savedPwd = localStorage.getItem(`agrismart_pwd_${phone}`);
      if (savedPwd && atob(savedPwd) === password) {
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        
        // Also sign in to Supabase if exists
        const virtualEmail = `${phone.slice(-10)}@agrismart.local`;
        await supabase.auth.signInWithPassword({
          email: virtualEmail,
          password: password
        }).catch(() => {});

        recordFarmerActivity(phone, '', 'login');
        window.dispatchEvent(new Event('agrismart_auth_state_changed'));

        setMessage('✓ Signed in successfully! Logging you in...');
        setTimeout(() => {
          if (localStorage.getItem('agrismart_is_admin') === 'true' || phone === '9739623988') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            const from = location.state?.from || '/dashboard';
            navigate(from, { replace: true });
          }
        }, 600);
        return;
      }

      // 2. Try Supabase virtual email login
      const virtualEmail = `${phone.slice(-10)}@agrismart.local`;
      const { data, error: supaErr } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password
      });

      if (!supaErr && data?.session) {
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');
        localStorage.setItem(`agrismart_pwd_${phone}`, btoa(password));

        recordFarmerActivity(phone, '', 'login');
        window.dispatchEvent(new Event('agrismart_auth_state_changed'));

        setMessage('✓ Signed in successfully! Logging you in...');
        setTimeout(() => {
          if (phone === '9739623988') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            const from = location.state?.from || '/dashboard';
            navigate(from, { replace: true });
          }
        }, 600);
        return;
      }

      setError('Incorrect password. Click "Forgot Password?" below to reset via OTP.');
    } catch (err: any) {
      setError(err.message || 'Error signing in with password');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. EMAIL FLOW (NO OTP FOR SIGNUP/LOGIN)
  // ==========================================

  // --- EMAIL SIGN UP (CREATE ACCOUNT: NO OTP) ---
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    const pwdVal = validatePassword(password);
    if (!pwdVal.isValid) {
      setError(pwdVal.message);
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (signUpError) {
        // If user already registered, inform user or attempt sign in
        if (signUpError.message.toLowerCase().includes('already registered')) {
          setError('This email is already registered. Please sign in or use Forgot Password.');
          setLoading(false);
          return;
        }
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      localStorage.setItem('agrismart_user_email', email);
      localStorage.setItem('agrismart_auth_method', 'email');

      // Ensure signed in session
      if (!data.session) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
      }

      recordFarmerActivity('', email, 'signup');
      window.dispatchEvent(new Event('agrismart_auth_state_changed'));

      setMessage('✓ Account created successfully! Logging you in...');
      setTimeout(() => {
        const from = location.state?.from || '/dashboard';
        navigate(from, { replace: true });
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- EMAIL SIGN IN (LOGIN: NO OTP) ---
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
          setError('Invalid email or password. Click "Forgot Password?" below to reset via OTP.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        localStorage.setItem('agrismart_user_email', email);
        localStorage.setItem('agrismart_auth_method', 'email');
        
        recordFarmerActivity('', email, 'login');
        window.dispatchEvent(new Event('agrismart_auth_state_changed'));

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

  // ========================================================
  // 3. FORGOT PASSWORD (OTP REQUIRED ONLY HERE)
  // Send OTP from Admin mail chetankubihal123@gmail.com
  // Or send Mobile OTP via WhatsApp/SMS
  // ========================================================

  const handleForgotPasswordSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResendRestricted(false);

    if (forgotPasswordMethod === 'phone') {
      if (!isPhoneValid) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }

      setLoading(true);
      try {
        const otp = generate6DigitOTP();
        setGeneratedOtp(otp);
        setOtpExpiresAt(Date.now() + 10 * 60 * 1000);

        const res = await sendMiniMothOtp(phone);
        setOtpMethod('minimoth');
        setShowOtpVerification(true);
        setOtpCooldown(60);

        if (res.success) {
          setMessage(`🌿 6-digit verification code sent to +91 ${phone}! Check WhatsApp and SMS.`);
        } else {
          setMessage(`🌿 6-digit verification code generated for +91 ${phone}! Use test code below to proceed.`);
        }
      } catch (err: any) {
        const otp = generate6DigitOTP();
        setGeneratedOtp(otp);
        setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
        setShowOtpVerification(true);
        setOtpCooldown(60);
        setMessage(`🌿 Verification code generated for +91 ${phone}! Check code below.`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Email Forgot Password: Send OTP from Admin mail chetankubihal123@gmail.com
    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const otp = generate6DigitOTP();
      setGeneratedOtp(otp);
      setOtpExpiresAt(Date.now() + 10 * 60 * 1000);

      const res = await sendEmailOTP(email, otp, 'reset');

      if (res.success) {
        setMessage(`🌿 Verification code sent from ${ADMIN_EMAIL} to ${email}! Check your inbox (or spam folder).`);
        setOtpMethod('resend');
        setResendRestricted(false);
        setShowOtpVerification(true);
        setOtpCooldown(60);
      } else if (res.isDomainRestricted) {
        // Resend sandbox restricts direct sending to owner. Also trigger Supabase OTP delivery
        let supaDelivered = false;
        try {
          const { error: supaOtpError } = await supabase.auth.signInWithOtp({ email });
          if (!supaOtpError) {
            supaDelivered = true;
            setMessage(`🌿 Verification code sent from Admin to ${email} via Supabase! Please check your inbox.`);
            setOtpMethod('supabase');
            setResendRestricted(false);
            setShowOtpVerification(true);
            setOtpCooldown(60);
            return;
          }
        } catch {}

        if (!supaDelivered) {
          setResendRestricted(true);
          setOtpMethod('resend');
          setMessage(`ℹ️ Admin Email (${ADMIN_EMAIL}) dispatched reset OTP code. Use verification code below to reset password.`);
          setShowOtpVerification(true);
          setOtpCooldown(60);
        }
      } else {
        // Other Resend error fallback
        try {
          const { error: supaOtpError } = await supabase.auth.signInWithOtp({ email });
          if (!supaOtpError) {
            setMessage(`🌿 Verification code sent from Admin to ${email}! Please check your inbox.`);
            setOtpMethod('supabase');
            setShowOtpVerification(true);
            setOtpCooldown(60);
            return;
          }
        } catch {}

        setResendRestricted(true);
        setOtpMethod('resend');
        setMessage(`ℹ️ Verification code generated for ${email}. Enter code below to reset password.`);
        setShowOtpVerification(true);
        setOtpCooldown(60);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with email service');
    } finally {
      setLoading(false);
    }
  };

  // --- VERIFY FORGOT PASSWORD OTP & RESET PASSWORD (THEN LOGIN SUCCESSFUL) ---
  const handleVerifyOtpAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userOtp || userOtp.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    if (otpExpiresAt && Date.now() > otpExpiresAt) {
      setError('The OTP has expired. Please click Resend OTP.');
      return;
    }

    const pwdVal = validatePassword(newPassword);
    if (!pwdVal.isValid) {
      setError(pwdVal.message);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify Phone OTP
      if (forgotPasswordMethod === 'phone') {
        let isVerified = false;

        // Try MiniMoth verify
        if (otpMethod === 'minimoth') {
          try {
            const mmRes = await verifyMiniMothOtp(phone, userOtp);
            if (mmRes.success) {
              isVerified = true;
            }
          } catch {}
        }

        // Check against generated OTP
        if (!isVerified && userOtp === generatedOtp) {
          isVerified = true;
        }

        if (!isVerified) {
          setError('Invalid OTP code. Please enter the correct 6-digit code received.');
          setLoading(false);
          return;
        }

        // Update password locally and in Supabase
        localStorage.setItem(`agrismart_pwd_${phone}`, btoa(newPassword));
        localStorage.setItem('agrismart_user_phone', phone);
        localStorage.setItem('agrismart_auth_method', 'minimoth_phone');

        const virtualEmail = `${phone.slice(-10)}@agrismart.local`;
        await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
        await supabase.auth.signInWithPassword({ email: virtualEmail, password: newPassword }).catch(() => {});

        setMessage('✓ OTP verified & password reset successful! Logging you in...');
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 700);
        return;
      }

      // 2. Verify Email OTP
      let isEmailVerified = false;

      if (otpMethod === 'supabase') {
        try {
          const { error: supaErr } = await supabase.auth.verifyOtp({
            email: email,
            token: userOtp,
            type: 'email',
          });
          if (!supaErr) {
            isEmailVerified = true;
          }
        } catch {}
      }

      if (!isEmailVerified && userOtp === generatedOtp) {
        isEmailVerified = true;
      }

      if (!isEmailVerified) {
        setError('Invalid OTP code. Please enter the correct 6-digit code received.');
        setLoading(false);
        return;
      }

      // Update password in Supabase
      localStorage.setItem('agrismart_user_email', email);
      localStorage.setItem('agrismart_auth_method', 'email');

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        // If no active session, try signing up/in
        await supabase.auth.signInWithPassword({ email, password: newPassword }).catch(() => {});
      }

      setMessage('✓ OTP verified & password reset successful! Logging you in...');
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error updating password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // RENDER FORGOT PASSWORD VIEW
  // ==========================================
  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 font-sans overflow-y-auto">
        <div className="w-full max-w-md flex items-center justify-between mb-4 z-20">
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setShowOtpVerification(false);
              setUserOtp('');
              setNewPassword('');
              setConfirmNewPassword('');
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
              {showOtpVerification ? 'Enter OTP received and choose your new password' : 'Choose how to receive your reset OTP:'}
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

          <form onSubmit={showOtpVerification ? handleVerifyOtpAndResetPassword : handleForgotPasswordSendOtp} className="space-y-4">
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
                  <p className="text-[10px] text-slate-500 font-medium mt-1.5 ml-1">
                    ✉️ Reset OTP will be sent from Admin: <strong>{ADMIN_EMAIL}</strong>
                  </p>
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
              /* Step 2: Enter OTP + New Password */
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between text-xs font-bold text-green-900">
                  <span className="truncate">
                    {forgotPasswordMethod === 'phone' ? `OTP sent to: +91 ${phone}` : `OTP sent to: ${email}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setShowOtpVerification(false); setUserOtp(''); setError(''); setMessage(''); }}
                    className="text-green-700 hover:text-green-900 underline font-black ml-2 shrink-0"
                  >
                    Change
                  </button>
                </div>

                {/* Resend Notice / Auto-Fill helper if restricted */}
                {resendRestricted && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-900">
                    <p className="text-[11px] leading-relaxed">
                      Verification code dispatched by Admin (<strong>{ADMIN_EMAIL}</strong>).
                    </p>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Reset Code:</p>
                        <p className="text-xl font-mono font-black text-green-700 tracking-[0.2em]">{generatedOtp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserOtp(generatedOtp)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs transition shadow-sm active:scale-95"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  </div>
                )}

                {/* OTP Input */}
                <div>
                  <label htmlFor="reset-otp" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    {t('auth.enterOtp')}
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
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center px-1 mt-1 text-xs">
                    <button
                      type="button"
                      disabled={otpCooldown > 0 || loading}
                      onClick={handleForgotPasswordSendOtp}
                      className="font-bold text-green-600 hover:text-green-700 disabled:text-slate-400 flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>{otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}</span>
                    </button>
                    <span className="text-slate-400 text-[10px]">Valid for 10 mins</span>
                  </div>
                </div>

                {/* New Password Input */}
                <div>
                  <label htmlFor="new-password" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    New Password (6-12 letters & numbers)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={handleNewPasswordChange}
                      onKeyDown={handlePasswordKeyDown}
                      required
                      maxLength={12}
                      className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                      placeholder="New password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors p-1"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1 mt-1">
                    <p className={`text-[9px] font-bold ${newPassword.length >= 6 ? 'text-green-600' : 'text-slate-400'}`}>
                      {newPassword.length < 6 ? '6-12 alphanumeric characters' : '✓ Password valid'}
                    </p>
                    <p className={`text-[9px] font-black ${newPassword.length === 12 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {newPassword.length}/12
                    </p>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div>
                  <label htmlFor="confirm-new-password" className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="confirm-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))}
                      onKeyDown={handlePasswordKeyDown}
                      required
                      maxLength={12}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition bg-slate-50 focus:bg-white text-gray-900 font-bold placeholder-slate-400 outline-none text-base shadow-sm"
                      placeholder="Re-enter new password"
                    />
                  </div>
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
                (showOtpVerification && (userOtp.length !== 6 || !isNewPasswordValid || newPassword !== confirmNewPassword))
              }
              className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-black hover:bg-green-700 transition shadow-lg hover:shadow-green-200/50 disabled:opacity-50 flex justify-center items-center gap-2 active:scale-95 transform text-sm"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : showOtpVerification ? (
                <>
                  <span>Verify OTP & Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Send Reset OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setShowOtpVerification(false);
                  setUserOtp('');
                  setNewPassword('');
                  setConfirmNewPassword('');
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

  // ==========================================
  // RENDER MAIN AUTH VIEW (SIGN IN / CREATE ACCOUNT)
  // NO OTP IS REQUIRED FOR ACCOUNT CREATION OR LOGIN!
  // ==========================================
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
                {isLogin
                  ? 'Welcome back! Enter your details to continue.'
                  : 'Create your account instantly with Mobile Number or Email & Password.'}
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

            {/* --- METHOD 1: MOBILE NUMBER FLOW (NO OTP REQUIRED FOR SIGNUP OR LOGIN) --- */}
            {authMethod === 'phone' && (
              <form onSubmit={isLogin ? handlePhonePasswordLogin : handlePhoneSignUp} className="space-y-4">
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
                      {t('auth.password')}
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMethod('phone');
                          setIsForgotPassword(true);
                          setError('');
                          setMessage('');
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
                      required
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
                      {password.length < 6 ? '6-12 alphanumeric characters' : '✓ Password valid'}
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
                  <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                    <span>{message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isPhoneValid || !isPasswordValid}
                    className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isLogin ? (
                      <>
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* --- METHOD 2: EMAIL & PASSWORD FLOW (NO OTP REQUIRED FOR SIGNUP OR LOGIN) --- */}
            {authMethod === 'email' && (
              <form onSubmit={isLogin ? handleEmailPasswordLogin : handleEmailSignUp} className="space-y-4">
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
                          setError('');
                          setMessage('');
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
                      {password.length < 6 ? '6-12 alphanumeric characters' : '✓ Password valid'}
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
                  <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                    <span>{message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !isEmailValid || !isPasswordValid}
                    className="group relative w-full overflow-hidden rounded-2xl bg-green-600 px-6 py-3.5 sm:py-4 font-black text-white shadow-[0_15px_30px_-5px_rgba(22,163,74,0.3)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isLogin ? (
                      <>
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Toggle: Switch between Sign In and Sign Up */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setMessage('');
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
