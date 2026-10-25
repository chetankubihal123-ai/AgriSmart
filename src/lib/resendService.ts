/**
 * Resend Email Service for AgriSmart
 * Sends real OTP verification emails using Resend API
 * 
 * In production, calls Resend API directly.
 * In dev, tries the local proxy first, then falls back to direct API call.
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';

export interface SendOtpResult {
  success: boolean;
  id?: string;
  error?: string;
  isDomainRestricted?: boolean;
}

function buildOtpEmailHtml(otp: string, purpose: 'login' | 'reset'): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 12px 20px; background: #dcfce7; border-radius: 9999px; margin-bottom: 12px;">
          <span style="font-size: 24px;">🌿</span>
          <strong style="color: #15803d; font-size: 18px; margin-left: 8px;">AgriSmart AI</strong>
        </div>
        <h2 style="color: #0f172a; margin: 8px 0 4px 0; font-size: 22px; font-weight: 800;">Your Verification Code</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Please use the OTP below to ${purpose === 'reset' ? 'reset your password' : 'complete your login'}</p>
      </div>
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed #86efac; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">One-Time Password</span>
        <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #16a34a; font-family: 'Courier New', monospace; margin: 4px 0;">
          ${otp}
        </div>
        <span style="font-size: 12px; color: #15803d; font-weight: 600; display: block; margin-top: 8px;">⏱️ Expires in 10 minutes</span>
      </div>
      <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
        If you didn't request this verification code, please ignore this email. Never share your password or OTP with anyone.
      </p>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} AgriSmart AI. Empowering 50,000+ Farmers.
        </p>
      </div>
    </div>
  `;
}

async function callResendDirect(email: string, otp: string, subject: string, purpose: 'login' | 'reset'): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AgriSmart <onboarding@resend.dev>',
      to: [email],
      subject,
      html: buildOtpEmailHtml(otp, purpose),
    }),
  });
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
    let response: Response;

    // In development, try local proxy first
    if (import.meta.env.DEV) {
      try {
        const proxyRes = await fetch('/api/send-email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, subject }),
        });
        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          response = proxyRes;
        } else {
          response = await callResendDirect(email, otp, subject, purpose);
        }
      } catch {
        response = await callResendDirect(email, otp, subject, purpose);
      }
    } else {
      // Production: call Resend API directly
      response = await callResendDirect(email, otp, subject, purpose);
    }

    const data = await response.json();

    if (response.ok) {
      return { success: true, id: data.id };
    }

    // Check for Resend test domain restriction message
    const errorMsg = data.message || data.error || 'Failed to send email';
    const msgLower = errorMsg.toLowerCase();
    const isDomainRestricted =
      msgLower.includes('testing email') ||
      msgLower.includes('verify a domain') ||
      msgLower.includes('verify your domain') ||
      msgLower.includes('own email address');

    return {
      success: false,
      error: errorMsg,
      isDomainRestricted,
    };
  } catch (err: any) {
    console.error('Error sending email OTP:', err);
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
