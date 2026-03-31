import crypto from 'crypto';

const TOKEN_EXPIRY_MS = 3600000; // 1 hour
const SECRET = process.env.TOKEN_SECRET || 'default-secret-change-me';

export class TokenService {
  generate(userId: string): { token: string; expiresAt: Date } {
    const payload = JSON.stringify({
      userId,
      exp: Date.now() + TOKEN_EXPIRY_MS,
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    const token = Buffer.from(payload).toString('base64') + '.' + signature;

    return {
      token,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    };
  }

  verify(token: string): { userId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8');

    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) return null;  // NOT timing-safe!

    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;

    return { userId: data.userId };
  }
}
