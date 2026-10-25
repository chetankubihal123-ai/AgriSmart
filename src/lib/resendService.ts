/**
 * Resend Email Service for AgriSmart
 * Sends real OTP verification emails using Resend API
 */

export interface SendOtpResult {
  success: boolean;
  id?: string;
  error?: string;
  isDomainRestricted?: boolean;
}

export async function sendEmailOTP(
  email: string,
  otp: string,
  purpose: 'login' | 'reset' = 'login'
): Promise<SendOtpResult> {
  const subject = purpose === 'login'
    ? `🌿 AgriSmart Login OTP: ${otp}`
    : `🌿 AgriSmart Password Reset OTP: ${otp}`;

  try {
    // 1. Try local dev endpoint / backend endpoint
    const response = await fetch('/api/send-email-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, subject }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, id: data.id };
    }

    // Check for Resend test domain restriction message
    const errorMsg = data.message || data.error || 'Failed to send email';
    const isDomainRestricted = errorMsg.toLowerCase().includes('testing email address') || 
                              errorMsg.toLowerCase().includes('verify your domain');

    return {
      success: false,
      error: errorMsg,
      isDomainRestricted,
    };
  } catch (err: any) {
    console.error('Error invoking /api/send-email-otp:', err);
    return {
      success: false,
      error: err.message || 'Network error while contacting email service',
    };
  }
}

export function generate6DigitOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validates password according to user rules:
 * - 6 to 12 characters only
 * - Numbers or alphabets only (alphanumeric, no special characters)
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 12) {
    return { isValid: false, message: 'Password cannot exceed 12 characters' };
  }
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return { isValid: false, message: 'Password can only contain letters and numbers (no special symbols)' };
  }
  return { isValid: true, message: 'Password format is valid' };
}
