/**
 * MiniMoth WhatsApp & SMS OTP Service for AgriSmart
 * Sends WhatsApp-first OTPs with automatic SMS fallback
 * 
 * In production, calls MiniMoth API directly.
 * In dev, tries the local proxy first, then falls back to direct API call.
 */

const MINIMOTH_API_KEY = import.meta.env.VITE_MINIMOTH_API_KEY || 'mm_live_4576c0435f1fd54a24da811eee67de085bbdaf1a8164216684bab042738b8a8e1ff7ad4f689d07f86fa0d377e1f252cb';

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

async function callMiniMothDirect(endpoint: string, body: Record<string, string>): Promise<Response> {
  return fetch(`https://api.minimoth.dev/v1/otp/${endpoint}`, {
    method: 'POST',
    headers: {
      'X-Api-Key': MINIMOTH_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function callWithFallback(endpoint: string, proxyPath: string, body: Record<string, string>): Promise<Response> {
  // In development, try local proxy first
  if (import.meta.env.DEV) {
    try {
      const proxyRes = await fetch(proxyPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      // If we got a valid JSON response (not HTML), use it
      const contentType = proxyRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return proxyRes;
      }
    } catch {
      // Proxy not available, fall through to direct call
    }
  }

  // Direct API call (works in both dev and production)
  return callMiniMothDirect(endpoint, body);
}

export async function sendMiniMothOtp(rawPhone: string): Promise<MiniMothSendResult> {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10
    ? `+${cleanPhone}`
    : `+91${cleanPhone.slice(-10)}`;

  try {
    const response = await callWithFallback('send', '/api/minimoth/send', { phone: formattedPhone });

    const data = await response.json();
    if (response.ok) {
      return { success: true, message: data.message, otp_id: data.otp_id };
    }
    return { success: false, error: data.error || data.message || 'Failed to send MiniMoth OTP' };
  } catch (err: any) {
    console.error('Error sending MiniMoth OTP:', err);
    return { success: false, error: err.message || 'Network error while contacting MiniMoth service' };
  }
}

export async function verifyMiniMothOtp(rawPhone: string, code: string): Promise<MiniMothVerifyResult> {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10
    ? `+${cleanPhone}`
    : `+91${cleanPhone.slice(-10)}`;

  try {
    const response = await callWithFallback('verify', '/api/minimoth/verify', { phone: formattedPhone, code });

    const data = await response.json();
    if (response.ok) {
      return { success: true, access_token: data.access_token };
    }
    return { success: false, error: data.error || data.message || 'Invalid OTP code. Please enter the correct code.' };
  } catch (err: any) {
    console.error('Error verifying MiniMoth OTP:', err);
    return { success: false, error: err.message || 'Network error while verifying OTP' };
  }
}
