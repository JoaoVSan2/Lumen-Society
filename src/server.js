import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { advanceState, enqueueTask } from './simulation.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const store = createStore(join(ROOT, 'data', 'resident.json'));
let state = await store.load();
let mutation = Promise.resolve();
const withLock = (fn) => { const run = mutation.then(fn, fn); mutation = run.catch(() => {}); return run; };
async function sync() {
  return withLock(async () => {
    const next = advanceState(state, Date.now());
    if (next.meta.revision !== state.meta.revision) { state = next; await store.save(state); }
    return state;
  });
}
const mime = { '.webmanifest': 'application/manifest+json; charset=utf-8', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
function send(res, code, data, type = 'application/json; charset=utf-8') { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(data) : data); }
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw new Error('Corpo da requisição muito grande.'); }
  return raw ? JSON.parse(raw) : {};
}
const allowedOrigins = new Set(['capacitor://localhost', 'http://localhost', 'https://localhost', ...(process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) { res.setHeader('access-control-allow-origin', origin); res.setHeader('vary', 'Origin'); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS'); }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'lumen-simulation-core', timestamp: Date.now() });
    if (req.method === 'GET' && url.pathname === '/api/resident') {
      const current = await sync();
      return send(res, 200, current);
    }
    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const payload = await body(req);
      const current = await withLock(async () => {
        state = advanceState(state, Date.now());
        state = enqueueTask(state, payload);
        await store.save(state);
        return state;
      });
      return send(res, 201, current);
    }
    if (req.method === 'POST' && url.pathname === '/api/reset') {
      const { createInitialState } = await import('./simulation.js');
      const current = await withLock(async () => { state = createInitialState(); await store.save(state); return state; });
      return send(res, 200, current);
    }
    if (req.method === 'GET') {
      const requested = url.pathname === '/' ? '/index.html' : url.pathname;
      const publicRoot = resolve(ROOT, 'public');
      const path = resolve(publicRoot, `.${requested}`);
      if (path !== publicRoot && !path.startsWith(publicRoot + sep)) return send(res, 403, { error: 'Acesso negado.' });
      try { const data = await readFile(path); return send(res, 200, data, mime[extname(path)] || 'application/octet-stream'); }
      catch { return send(res, 404, { error: 'Não encontrado.' }); }
    }
    return send(res, 404, { error: 'Rota não encontrada.' });
  } catch (error) { return send(res, 400, { error: error.message || 'Erro na requisição.' }); }
});

// O estado é persistido em cada consulta/mutação e também periodicamente enquanto o processo está ativo.
const interval = setInterval(() => sync().catch(err => console.error('[simulation]', err)), 5000);
interval.unref();
server.listen(PORT, '0.0.0.0', () => console.log(`Lumen Society First Light em http://localhost:${PORT}`));
process.on('SIGINT', async () => { clearInterval(interval); await sync(); server.close(() => process.exit(0)); });
process.on('SIGTERM', async () => { clearInterval(interval); await sync(); server.close(() => process.exit(0)); });
