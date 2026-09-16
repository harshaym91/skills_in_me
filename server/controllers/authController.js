import bcrypt from 'bcryptjs';
import { readStore, writeStore, makeId } from '../utils/store.js';
import { createToken } from '../utils/token.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function register(request, response) {
  const { name, email, password } = request.body;
  if (!name?.trim() || !email?.trim() || !password) return response.status(400).json({ message: 'Name, email, and password are required' });
  if (!emailPattern.test(email) || password.length < 8) return response.status(400).json({ message: 'Use a valid email and a password with at least 8 characters' });
  const store = await readStore();
  if (store.users.some((user) => user.email === email.toLowerCase())) return response.status(409).json({ message: 'An account with this email already exists' });
  const user = { id: makeId(), name: name.trim(), email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) };
  store.users.push(user); await writeStore(store);
  response.status(201).json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
}
export async function login(request, response) {
  const { email, password } = request.body;
  const store = await readStore(); const user = store.users.find((entry) => entry.email === email?.toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return response.status(401).json({ message: 'Invalid email or password' });
  response.json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
}
export function me(request, response) { response.json({ user: request.user }); }
