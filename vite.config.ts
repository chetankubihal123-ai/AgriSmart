import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function resendDevPlugin(resendApiKey: string): Plugin {
  return {
    name: 'resend-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/send-email-otp', async (req, res) => {
        // Handle preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const email = parsed.email;
            const otp = parsed.otp;
            const subject = parsed.subject || `🌿 AgriSmart Login OTP: ${otp}`;

            if (!email || !otp) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Email and OTP are required' }));
              return;
            }

            const apiKey = resendApiKey || process.env.VITE_RESEND_API_KEY || '';

            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'AgriSmart <onboarding@resend.dev>',
                to: [email],
                subject: subject,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="display: inline-block; padding: 12px 20px; background: #dcfce7; border-radius: 9999px; margin-bottom: 12px;">
                        <span style="font-size: 24px;">🌿</span>
                        <strong style="color: #15803d; font-size: 18px; margin-left: 8px;">AgriSmart AI</strong>
                      </div>
                      <h2 style="color: #0f172a; margin: 8px 0 4px 0; font-size: 22px; font-weight: 800;">Your Verification Code</h2>
                      <p style="color: #64748b; font-size: 14px; margin: 0;">Please use the OTP below to complete your login</p>
                    </div>

                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed #86efac; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">One-Time Password</span>
                      <div style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #16a34a; font-family: 'Courier New', monospace; margin: 4px 0;">
                        ${otp}
                      </div>
                      <span style="font-size: 12px; color: #15803d; font-weight: 600; display: block; margin-top: 8px;">⏱️ Expires in 10 minutes</span>
                    </div>

                    <p style="color: #475569; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0;">
                      If you didn't request this verification code, please ignore this email or contact support. Never share your password or OTP with anyone.
                    </p>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} AgriSmart AI. Empowering 50,000+ Farmers.
                      </p>
                    </div>
                  </div>
                `
              })
            });

            const data = await resendRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = resendRes.status;
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resendKey = env.VITE_RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || '';

  return {
    plugins: [react(), resendDevPlugin(resendKey)],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'lucide-react',
        'recharts',
        '@supabase/supabase-js',
        '@tensorflow/tfjs',
        '@tensorflow-models/mobilenet'
      ]
    }
  };
});

