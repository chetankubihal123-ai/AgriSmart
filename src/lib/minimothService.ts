/**
 * MiniMoth WhatsApp & SMS OTP Service for AgriSmart
 * Sends WhatsApp-first OTPs with automatic SMS fallback
 */

export interface MiniMothSendResult {
  success: boolean;
  message?: string;
  otp_id?: string;
  error?: string;
}

export interface MiniMothVerifyResult {
  success: boolean;
  message?: string;
  access_token?: string;
  error?: string;
}

export async function sendMiniMothOtp(rawPhone: string): Promise<MiniMothSendResult> {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10
    ? `+${cleanPhone}`
    : `+91${cleanPhone.slice(-10)}`;

  try {
    const response = await fetch('/api/minimoth/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone }),
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message, otp_id: data.otp_id };
    }
    return { success: false, error: data.error || data.message || 'Failed to send MiniMoth OTP' };
  } catch (err: any) {
    console.error('Error invoking /api/minimoth/send:', err);
    return { success: false, error: err.message || 'Network error while contacting MiniMoth service' };
  }
}

export async function verifyMiniMothOtp(rawPhone: string, code: string): Promise<MiniMothVerifyResult> {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10
    ? `+${cleanPhone}`
    : `+91${cleanPhone.slice(-10)}`;

  try {
    const response = await fetch('/api/minimoth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, code }),
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, access_token: data.access_token };
    }
    return { success: false, error: data.error || data.message || 'Invalid OTP code. Please enter the correct code.' };
  } catch (err: any) {
    console.error('Error invoking /api/minimoth/verify:', err);
    return { success: false, error: err.message || 'Network error while verifying OTP' };
  }
}
