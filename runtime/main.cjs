'use strict';
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const httpProxy = require('http-proxy');
const { io } = require('socket.io-client');

const app = path.resolve(__dirname, '..');
const web = path.join(app, 'web');
const port = readPort('PORT', 8080);
const tlsPort = readPort('TLS_PORT', 8443);
const signalingPort = 8888;
const children = new Map();
const servers = [];
const probes = new Set();
const sensitive = [crypto.randomBytes(24).toString('hex'), crypto.randomBytes(32).toString('hex')];
let configRoot;
let stopping = false;
let ready = false;
let lastAuthCheck = 0;
let healthTimer;
let checking = false;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const proxy = httpProxy.createProxyServer({ target: `http://127.0.0.1:${signalingPort}`, ws: true });

function readPort(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} must be a port between 1024 and 65535`);
  return value;
}
function safeError(error) {
  let message = error && error.message ? error.message : String(error);
  for (const secret of sensitive) message = message.split(secret).join('[redacted]');
  return message.replace(/((?:password|credential|token|vt_auth_user|vt_auth_pass)\s*[:=]\s*)[^,\s}]+/gi, '$1[redacted]');
}
function log(message) { console.log(`[webrtc20] ${message}`); }
function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
proxy.on('error', (_error, _request, response) => {
  if (response && typeof response.writeHead === 'function') {
    if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain' });
    response.end('Signaling is not ready');
  } else if (response && typeof response.destroy === 'function') response.destroy();
});
async function handle(request, response) {
  let url;
  try { url = new URL(request.url, 'http://localhost'); } catch (_) { response.writeHead(400); response.end(); return; }
  if (url.pathname === '/healthz') {
    const healthy = ready && !stopping && children.size === 2 && Date.now() - lastAuthCheck < 30000;
    json(response, healthy ? 200 : 503, { status: healthy ? 'ok' : 'starting', services: { signaling: children.has('signaling'), auth: children.has('auth') } });
    return;
  }
  if (url.pathname === '/runtime-config.js') {
    const config = { sdkSignalingUrl: process.env.SDK_SIGNALING_URL || null, tlsEnabled: Boolean(process.env.TLS_CERT_FILE && process.env.TLS_KEY_FILE) };
    response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('window.__WEBRTC_CONFIG__=' + JSON.stringify(config).replace(/</g, '\\u003c') + ';');
    return;
  }
  if (url.pathname === '/socket.io' || url.pathname.startsWith('/socket.io/')) {
    proxy.web(request, response);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  let name;
  try { name = decodeURIComponent(url.pathname); } catch (_) { response.writeHead(400); response.end(); return; }
  if (name.includes('\0') || name.split('/').some(part => part.startsWith('.'))) { response.writeHead(404); response.end(); return; }
  let file = path.resolve(web, '.' + name);
  if (!file.startsWith(web + path.sep)) file = path.join(web, 'index.html');
  let stat = await fsp.stat(file).catch(() => null);
  if (!stat || !stat.isFile()) { file = path.join(web, 'index.html'); stat = await fsp.stat(file); }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': path.basename(file) === 'index.html' ? 'no-store' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  if (request.method === 'HEAD') response.end();
  else { const input = fs.createReadStream(file); input.on('error', () => response.destroy()); input.pipe(response); }
}
function makeServer(tls) {
  const handler = (request, response) => handle(request, response).catch(error => {
    console.error('[webrtc20] Request failed: ' + safeError(error));
    if (!response.headersSent) response.writeHead(500);
    response.end('Request failed');
  });
  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/socket.io' || pathname.startsWith('/socket.io/')) proxy.ws(request, socket, head);
    else socket.destroy();
  });
  server.on('error', error => { if (!stopping) { console.error('[webrtc20] Listener failed: ' + safeError(error)); shutdown(1); } });
  servers.push(server);
  return server;
}
async function listen(server, listenPort) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(listenPort, '0.0.0.0', resolve); });
}
function startChild(name, script, cwd, configEnvironment) {
  const child = spawn(process.execPath, [path.join(__dirname, script)], { cwd, env: { ...process.env, NODE_ENV: 'production', ...configEnvironment }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.set(name, child);
  // Legacy signaling logs include private handshake data. Only explicit debug mode forwards redacted lines.
  for (const stream of [child.stdout, child.stderr]) {
    const lines = readline.createInterface({ input: stream });
    lines.on('line', line => {
      if (process.env.RUNTIME_DEBUG === '1') log(`${name}: ${safeError(line)}`);
    });
  }
  child.on('error', error => {
    if (!stopping) { console.error(`[webrtc20] ${name} failed: ${safeError(error)}`); shutdown(1); }
  });
  child.on('exit', (code, signal) => {
    children.delete(name);
    if (!stopping) { console.error(`[webrtc20] ${name} exited unexpectedly (code=${code}, signal=${signal || 'none'})`); shutdown(1); }
  });
}
async function waitForSignaling() {
  const deadline = Date.now() + 20000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${signalingPort}/socket.io/?EIO=4&transport=polling`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) { await response.body.cancel(); return; }
    } catch (_) { /* The listener is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Signaling did not become ready');
}
function checkAuth() {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${signalingPort}`, { transports: ['websocket'], reconnection: false, forceNew: true, timeout: 2000, query: { id: 'health-' + crypto.randomBytes(8).toString('hex'), auth: '{}', visible: 'false', notify: 'false', public: '{}' } });
    probes.add(socket);
    const timer = setTimeout(() => finish(new Error('Auth check timed out')), 2500);
    function finish(error) { clearTimeout(timer); probes.delete(socket); socket.removeAllListeners(); socket.close(); error ? reject(error) : resolve(); }
    socket.once('connect', () => finish());
    socket.once('connect_error', () => finish(new Error('Auth is not ready')));
  });
}
async function waitForAuth() {
  const deadline = Date.now() + 20000;
  while (!stopping && Date.now() < deadline) {
    try { await checkAuth(); lastAuthCheck = Date.now(); return; } catch (_) { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  throw new Error('Authorization service did not become ready');
}
async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  ready = false;
  clearInterval(healthTimer);
  probes.forEach(socket => socket.close());
  probes.clear();
  servers.forEach(server => { server.close(); server.closeAllConnections(); });
  proxy.close();
  const pending = [...children.values()];
  pending.forEach(child => child.kill('SIGTERM'));
  const deadline = Date.now() + 5000;
  while (children.size && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  [...children.values()].forEach(child => child.kill('SIGKILL'));
  if (configRoot) await fsp.rm(configRoot, { recursive: true, force: true });
  process.exit(code);
}
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('uncaughtException', error => { console.error('[webrtc20] Runtime failed: ' + safeError(error)); shutdown(1); });
process.on('unhandledRejection', error => { console.error('[webrtc20] Runtime failed: ' + safeError(error)); shutdown(1); });

(async () => {
  const cert = process.env.TLS_CERT_FILE;
  const key = process.env.TLS_KEY_FILE;
  if (Boolean(cert) !== Boolean(key)) throw new Error('Set both TLS_CERT_FILE and TLS_KEY_FILE for direct TLS');
  const tls = cert ? { cert: await fsp.readFile(cert), key: await fsp.readFile(key), minVersion: 'TLSv1.2' } : null;
  const sdkUrl = process.env.SDK_SIGNALING_URL;
  if (sdkUrl) { const parsed = new URL(sdkUrl); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('SDK_SIGNALING_URL must be an HTTPS URL without credentials'); }
  await fsp.access(path.join(web, 'index.html'));
  configRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'webrtc20-'));
  await fsp.chmod(configRoot, 0o700);
  const signalConfig = path.join(configRoot, 'signaling');
  const authConfig = path.join(configRoot, 'auth');
  await fsp.mkdir(signalConfig, { mode: 0o700 });
  await fsp.mkdir(authConfig, { mode: 0o700 });
  await fsp.writeFile(path.join(signalConfig, 'production.json'), JSON.stringify({ isDev: false, server: { port: signalingPort, secure: false, pingTimeout: 10000, pingInterval: 4800, loglevel: 0 }, metadata: { special_rooms: { gateways: { name: 'VTGateways', role: 'gateway' }, auth: { name: 'Auth', role: 'auth' } } }, auth: { vt_auth_user: sensitive[0], vt_auth_pass: sensitive[1] } }), { mode: 0o600 });
  await fsp.writeFile(path.join(authConfig, 'default.json'), JSON.stringify({ auth: { login: sensitive[0], password: sensitive[1] }, signaling: { serverUrl: `http://127.0.0.1:${signalingPort}` } }), { mode: 0o600 });
  startChild('signaling', 'signaling-child.cjs', path.join(app, 'signaling'), { GETCONFIG_ROOT: signalConfig, PORT: String(signalingPort) });
  await waitForSignaling();
  if (stopping) return;
  startChild('auth', 'auth-child.cjs', path.join(app, 'auth'), { NODE_CONFIG_DIR: authConfig });
  await waitForAuth();
  if (stopping) return;
  await listen(makeServer(), port);
  if (tls) await listen(makeServer(tls), tlsPort);
  ready = true;
  log(`Ready: HTTP :${port}` + (tls ? `, HTTPS :${tlsPort}` : ' (terminate public TLS at your reverse proxy)'));
  healthTimer = setInterval(async () => {
    if (checking || stopping) return;
    checking = true;
    try { await checkAuth(); lastAuthCheck = Date.now(); } catch (_) { /* /healthz becomes unavailable if this persists. */ }
    finally { checking = false; }
  }, 10000);
})().catch(error => { console.error('[webrtc20] Startup failed: ' + safeError(error)); shutdown(1); });
