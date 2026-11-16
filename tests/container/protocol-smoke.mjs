import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';

const base = new URL(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8080');
const tlsBase = process.env.SMOKE_TLS_BASE_URL ? new URL(process.env.SMOKE_TLS_BASE_URL) : null;
const deadlineMs = 30_000;
const allowedHosts = new Set((process.env.SMOKE_ALLOWED_HOSTS || '127.0.0.1,localhost').split(','));
for (const url of [base, tlsBase].filter(Boolean)) assert.ok(allowedHosts.has(url.hostname), 'Smoke URL must be an explicitly allowed local test host');
assert.equal(typeof WebSocket, 'function', 'Node 22+ native WebSocket is required inside the image');

function request(url) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.get(url, { rejectUnauthorized: false }, res => {
      const chunks = []; let length = 0;
      res.on('data', chunk => { length += chunk.length; if (length > 12_000_000) req.destroy(new Error('Oversized response')); else chunks.push(chunk); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(5_000, () => req.destroy(new Error('HTTP deadline exceeded')));
    req.on('error', reject);
  });
}
async function healthy(url) {
  const until = Date.now() + deadlineMs;
  while (Date.now() < until) {
    try { const response = await request(new URL('/healthz', url)); if (response.status === 200 && JSON.parse(response.body).status === 'ok') return; } catch (_) { /* Startup is bounded below. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Container HTTP health never became ready');
}

class SignalingClient {
  constructor(endpoint, query) {
    const url = new URL('/socket.io/', endpoint);
    url.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('EIO', '4'); url.searchParams.set('transport', 'websocket');
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    this.events = []; this.waiters = []; this.acks = new Map(); this.nextAck = 0;
    this.ready = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; });
    this.timer = setTimeout(() => this.fail(Object.assign(new Error('Socket.IO connection deadline exceeded'), { code: 'connection-timeout' })), 8_000);
    this.ws = new WebSocket(url);
    this.ws.addEventListener('message', event => this.packet(String(event.data)));
    this.ws.addEventListener('error', () => this.fail(Object.assign(new Error('WebSocket transport error'), { code: 'transport-error' })));
    this.ws.addEventListener('close', () => { if (!this.connected) this.fail(Object.assign(new Error('Socket.IO closed before namespace connection'), { code: 'closed-before-connect' })); });
  }
  fail(error) { clearTimeout(this.timer); this.rejectReady(error); for (const ack of this.acks.values()) { clearTimeout(ack.timer); ack.reject(error); } this.acks.clear(); }
  packet(packet) {
    if (packet.startsWith('0')) { this.ws.send('40'); return; }
    if (packet === '2') { this.ws.send('3'); return; }
    if (packet.startsWith('40')) { clearTimeout(this.timer); this.connected = true; this.resolveReady(); return; }
    if (packet.startsWith('44')) { this.fail(Object.assign(new Error('Socket.IO namespace authentication rejected'), { code: 'namespace-rejected' })); return; }
    let match = /^43(\d+)(\[.*\])$/s.exec(packet);
    if (match) { const ack = this.acks.get(+match[1]); if (ack) { clearTimeout(ack.timer); this.acks.delete(+match[1]); ack.resolve(JSON.parse(match[2])); } return; }
    match = /^42(\d*)(\[.*\])$/s.exec(packet);
    if (!match) return;
    const [name, ...args] = JSON.parse(match[2]);
    const event = { name, args }; this.events.push(event);
    for (const waiter of [...this.waiters]) if (waiter.name === name && waiter.predicate(args[0])) { clearTimeout(waiter.timer); this.waiters.splice(this.waiters.indexOf(waiter), 1); waiter.resolve(args[0]); }
  }
  emit(name, ...args) { this.ws.send('42' + JSON.stringify([name, ...args])); }
  ack(name, ...args) {
    const id = this.nextAck++;
    return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.acks.delete(id); reject(new Error('Socket.IO acknowledgement deadline exceeded for ' + name)); }, 8_000); this.acks.set(id, { resolve, reject, timer }); this.ws.send('42' + id + JSON.stringify([name, ...args])); });
  }
  event(name, predicate) {
    const existing = this.events.find(event => event.name === name && predicate(event.args[0]));
    if (existing) return Promise.resolve(existing.args[0]);
    return new Promise((resolve, reject) => { const waiter = { name, predicate, resolve }; waiter.timer = setTimeout(() => { this.waiters.splice(this.waiters.indexOf(waiter), 1); reject(new Error('Forwarded event deadline exceeded for ' + name)); }, 8_000); this.waiters.push(waiter); });
  }
  close() { clearTimeout(this.timer); if (this.ws.readyState === WebSocket.OPEN) { this.ws.send('41'); this.ws.close(); } else if (this.ws.readyState === WebSocket.CONNECTING) this.ws.close(); }
}
const publicInfo = id => JSON.stringify({ name: id, submode: 'webguest_duplex', camera: 'on', vidEncoder: 'VP9', audEncoder: 'opus' });
const hostQuery = id => ({ id, ver: '2.1', visible: 'true', notify: 'true', auth: '{}', public: publicInfo(id) });
async function signalingSuite(endpoint, suffix) {
  const hostId = 'SmokeHost-' + suffix, guestId = 'SmokeGuest-' + suffix;
  const clients = [];
  try {
    const host = new SignalingClient(endpoint, hostQuery(hostId)); clients.push(host); await host.ready;
    const [hostError, hostRoom] = await host.ack('join', hostId, { visible: true, notify: true });
    assert.equal(hostError, null, 'Host room join succeeds'); assert.ok(hostRoom.members[hostId], 'Host is visible in its room');
    const guest = new SignalingClient(endpoint, { id: guestId, access_id: hostId, ver: '2.1', visible: 'true', notify: 'true', public: publicInfo(guestId) }); clients.push(guest); await guest.ready;
    const [guestError, guestRoom] = await guest.ack('join', hostId, { visible: true, notify: true });
    assert.equal(guestError, null, 'Authenticated guest joins the host room');
    assert.ok(guestRoom.members[hostId] && guestRoom.members[guestId], 'Guest sees the connected host and itself');
    const nonce = crypto.randomBytes(12).toString('hex');
    const receivedHost = host.event('package_probe', data => data?.nonce === nonce && data.from === guestId);
    guest.emit('forward', { to: hostId, package_probe: { nonce } }); await receivedHost;
    const receivedGuest = guest.event('package_reply', data => data?.nonce === nonce && data.from === hostId);
    host.emit('forward', { to: guestId, package_reply: { nonce } }); await receivedGuest;
    const missing = new SignalingClient(endpoint, { id: 'MissingGuest-' + suffix, access_id: 'AbsentHost-' + suffix, ver: '2.1', public: publicInfo('missing') }); clients.push(missing);
    let denied = false;
    try { await missing.ready; } catch (error) { denied = ['namespace-rejected', 'closed-before-connect'].includes(error.code); }
    assert.ok(denied, 'A guest cannot authorize against an absent host');
    return { hostJoin: true, guestJoin: true, forwardBothDirections: true, absentHostDenied: true };
  } finally { for (const client of clients) client.close(); }
}

await healthy(base);
const routes = ['/streamer', '/player', '/player/SmokePlayer', '/SmokeSource', '/wg/SmokeSource', '/webguest/SmokeSource', '/wg2/SmokeSource', '/duplex/SmokeSource', '/webguest2/SmokeSource', '/pb/SmokePublisher', '/publisher/SmokePublisher'];
let html;
for (const route of routes) { const response = await request(new URL(route, base)); assert.equal(response.status, 200, 'SPA route returns 200: ' + route); assert.match(response.headers['content-type'] || '', /text\/html/, 'SPA route has HTML MIME type'); assert.match(response.body, /id=["']root["']/, 'SPA contains the React root'); html ||= response.body; }
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(match => new URL(match[1], base)).filter(url => url.origin === base.origin && /\/static\/.*\.js$/.test(url.pathname));
const styles = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css)["']/g)].map(match => new URL(match[1], base)).filter(url => url.origin === base.origin);
assert.ok(scripts.length && styles.length, 'Production JS and CSS assets are referenced');
const assets = []; let javascript = '', css = '';
for (const url of [...scripts, ...styles]) { const response = await request(url); assert.equal(response.status, 200, 'Referenced asset is served'); assert.doesNotMatch(response.body.slice(0,100), /<!doctype html/i, 'Asset does not return the SPA fallback'); assets.push({ path: url.pathname, bytes: Buffer.byteLength(response.body), sha256: crypto.createHash('sha256').update(response.body).digest('hex') }); if (url.pathname.endsWith('.js')) javascript += response.body; else css += response.body; }
for (const marker of ['streamer-start','streamer-enable-devices','streamer-viewer-url','streamer-sdk-url']) assert.ok(javascript.includes(marker), 'Current streamer feature is shipped: ' + marker);
for (const marker of ['--ic-viewport-height','.streamer-video','.lb-stage']) assert.ok(css.includes(marker), 'Current responsive CSS is shipped: ' + marker);
const suffix = crypto.randomBytes(6).toString('hex');
const websocket = await signalingSuite(base, suffix);
let tls;
if (tlsBase) { await healthy(tlsBase); tls = await signalingSuite(tlsBase, suffix + '-tls'); }
console.log(JSON.stringify({ check: 'http-websocket', passed: true, health: true, routes: routes.length, assets, websocket, tls: tls || null }));
