import { TokenService } from '../services/tokenService';

const tokenService = new TokenService();

export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);
  const result = tokenService.verify(token);

  if (!result) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = result;
  next();
}
