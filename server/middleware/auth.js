import jwt from 'jsonwebtoken';
import { readStore } from '../utils/store.js';

export async function requireAuth(request, response, next) {
  try {
    const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
    if (!token) return response.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === payload.userId);
    if (!user) return response.status(401).json({ message: 'User account not found' });
    request.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch { response.status(401).json({ message: 'Invalid or expired authentication token' }); }
}

export function asyncHandler(handler) { return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next); }
