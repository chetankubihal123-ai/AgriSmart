import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.projectId && 
    firebaseConfig.appId
  );
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep confirmation result in memory for OTP verification
let confirmationResult: ConfirmationResult | null = null;

/**
 * Setup Invisible or Visible RecaptchaVerifier
 */
export const setupRecaptcha = (containerId: string = 'recaptcha-container'): RecaptchaVerifier => {
  // Clear any existing verifier on window if present
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {}
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with phone auth
      console.log('Firebase reCAPTCHA solved successfully.');
    },
    'expired-callback': () => {
      console.warn('Firebase reCAPTCHA expired, please try again.');
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
};

/**
 * Send real 6-digit SMS OTP using Firebase Phone Auth (10,000 free SMS/mo)
 */
export const sendFirebasePhoneOtp = async (
  rawPhoneNumber: string,
  containerId: string = 'recaptcha-container'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const cleanPhone = rawPhoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 
      ? `+${cleanPhone}` 
      : `+91${cleanPhone.slice(-10)}`;

    const appVerifier = setupRecaptcha(containerId);
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    return { success: true };
  } catch (err: any) {
    console.error('Firebase sendPhoneOtp error:', err);
    return { 
      success: false, 
      error: err.message || 'Failed to send Firebase SMS OTP' 
    };
  }
};

/**
 * Verify 6-digit SMS OTP with Firebase
 */
export const verifyFirebasePhoneOtp = async (
  otpCode: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  if (!confirmationResult) {
    return { 
      success: false, 
      error: 'No active OTP request found. Please request a new OTP.' 
    };
  }

  try {
    const result = await confirmationResult.confirm(otpCode);
    return { success: true, user: result.user };
  } catch (err: any) {
    console.error('Firebase verifyPhoneOtp error:', err);
    return { 
      success: false, 
      error: err.code === 'auth/invalid-verification-code' 
        ? 'Invalid SMS OTP code. Please enter the correct 6-digit code.' 
        : (err.message || 'Invalid OTP code.') 
    };
  }
};
