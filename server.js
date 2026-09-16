const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'workspace.json');
const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const seed = {
  projects: [
    { id: 'proj-studio', name: 'Studio refresh', color: 'sage' },
    { id: 'proj-personal', name: 'Personal', color: 'coral' },
    { id: 'proj-learning', name: 'Learning', color: 'blue' }
  ],
  tasks: [
    { id: 'task-1', title: 'Send revised project brief to Maya', notes: '', projectId: 'proj-studio', priority: 'high', due: new Date().toISOString().slice(0, 10), completed: false, createdAt: Date.now() - 40000 },
    { id: 'task-2', title: 'Book dentist appointment', notes: '', projectId: 'proj-personal', priority: 'medium', due: new Date().toISOString().slice(0, 10), completed: false, createdAt: Date.now() - 30000 },
    { id: 'task-3', title: 'Read chapter four of The Creative Act', notes: '', projectId: 'proj-learning', priority: 'low', due: '2026-09-12', completed: false, createdAt: Date.now() - 20000 },
    { id: 'task-4', title: 'Archive old research notes', notes: '', projectId: 'proj-studio', priority: 'low', due: '', completed: true, createdAt: Date.now() - 10000 }
  ]
};

async function ensureData() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try { await fs.access(DATA_FILE); } catch { await writeData(seed); }
}
async function readData() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch { await writeData(seed); return structuredClone(seed); }
}
async function writeData(data) { await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2)); }
function sendJson(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }); response.end(JSON.stringify(body)); }
function sendError(response, status, message) { sendJson(response, status, { error: message }); }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
function validTask(input) { return input && typeof input.title === 'string' && input.title.trim() && ['high', 'medium', 'low'].includes(input.priority || 'medium'); }
function validProject(input) { return input && typeof input.name === 'string' && input.name.trim(); }
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; try { return raw ? JSON.parse(raw) : {}; } catch { return null; } }
async function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(ROOT, requested));
  if (!file.startsWith(ROOT) || file.includes(`${path.sep}data${path.sep}`)) return sendError(response, 404, 'Not found');
  try { const content = await fs.readFile(file); response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream' }); response.end(content); } catch { sendError(response, 404, 'Not found'); }
}
async function handleApi(request, response, pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const resource = parts[1];
  const resourceId = parts[2];
  if (request.method === 'GET' && pathname === '/api/health') return sendJson(response, 200, { ok: true, service: 'daymark-api' });
  const data = await readData();
  if (request.method === 'GET' && pathname === '/api/state') return sendJson(response, 200, data);
  if (request.method === 'PUT' && pathname === '/api/state') {
    const input = await body(request);
    if (!input || !Array.isArray(input.tasks) || !Array.isArray(input.projects)) return sendError(response, 400, 'State must include tasks and projects arrays');
    await writeData({ tasks: input.tasks, projects: input.projects });
    return sendJson(response, 200, { tasks: input.tasks, projects: input.projects });
  }
  if (!['tasks', 'projects'].includes(resource)) return sendError(response, 404, 'API route not found');
  const collection = data[resource];
  if (request.method === 'GET' && !resourceId) return sendJson(response, 200, collection);
  if (request.method === 'GET' && resourceId) { const item = collection.find((entry) => entry.id === resourceId); return item ? sendJson(response, 200, item) : sendError(response, 404, 'Item not found'); }
  if (request.method === 'POST' && !resourceId) {
    const input = await body(request);
    if (resource === 'tasks' && !validTask(input)) return sendError(response, 400, 'Task title and valid priority are required');
    if (resource === 'projects' && !validProject(input)) return sendError(response, 400, 'Project name is required');
    const item = resource === 'tasks' ? { title: input.title.trim(), notes: input.notes || '', projectId: input.projectId || '', priority: input.priority || 'medium', due: input.due || '', completed: Boolean(input.completed), createdAt: Date.now(), id: id('task') } : { name: input.name.trim(), color: input.color || 'sage', id: id('project') };
    collection.unshift(item); await writeData(data); return sendJson(response, 201, item);
  }
  if (resourceId && ['PUT', 'PATCH'].includes(request.method)) {
    const index = collection.findIndex((entry) => entry.id === resourceId); if (index < 0) return sendError(response, 404, 'Item not found');
    const input = await body(request); const current = collection[index];
    if (resource === 'tasks' && input.title !== undefined && !validTask({ ...current, ...input })) return sendError(response, 400, 'Task title and valid priority are required');
    if (resource === 'projects' && input.name !== undefined && !validProject(input)) return sendError(response, 400, 'Project name is required');
    collection[index] = { ...current, ...input, id: current.id }; await writeData(data); return sendJson(response, 200, collection[index]);
  }
  if (resourceId && request.method === 'DELETE') {
    const index = collection.findIndex((entry) => entry.id === resourceId); if (index < 0) return sendError(response, 404, 'Item not found');
    collection.splice(index, 1); if (resource === 'projects') data.tasks.forEach((task) => { if (task.projectId === resourceId) task.projectId = ''; }); await writeData(data); return sendJson(response, 200, { ok: true });
  }
  return sendError(response, 405, 'Method not allowed');
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return response.end(); }
  try { if (url.pathname.startsWith('/api/')) await handleApi(request, response, url.pathname); else await serveStatic(request, response, url.pathname); } catch (error) { console.error(error); sendError(response, 500, 'Internal server error'); }
});

ensureData().then(() => server.listen(PORT, () => console.log(`Daymark running at http://localhost:${PORT}`))).catch((error) => { console.error(error); process.exit(1); });
