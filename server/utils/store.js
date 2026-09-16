import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const dataFile = path.join(process.cwd(), 'data', 'store.json');
const seed = { users: [], todos: [] };
let writeQueue = Promise.resolve();

export async function readStore() {
  try { return JSON.parse(await fs.readFile(dataFile, 'utf8')); } catch { await writeStore(seed); return structuredClone(seed); }
}
export function writeStore(store) {
  writeQueue = writeQueue.then(async () => { await fs.mkdir(path.dirname(dataFile), { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(store, null, 2)); });
  return writeQueue;
}
export function makeId() { return crypto.randomUUID(); }
