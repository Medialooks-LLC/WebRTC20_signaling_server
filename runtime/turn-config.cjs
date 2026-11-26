'use strict';
const { isIP } = require('node:net');

// This is the common format understood by both the browser and MConnect.
// URI schemes, IPv6 and transport suffixes cannot round-trip through both parsers.
function createTurnConfig(value) {
  if (value !== undefined && value !== null && typeof value !== 'string') throw new Error('TURN_SERVERS must be a string');
  if (value === undefined || value === null || value.trim() === '') {
    return { metadata: Object.freeze({}), redact: message => String(message) };
  }
  const entries = value.trim().split(';');
  const credentials = [];
  const normalized = entries.map((entry, index) => {
    const fail = reason => { throw new Error(`TURN_SERVERS entry ${index + 1}: ${reason}`); };
    const item = entry.trim();
    const parts = /^([^@:\s;/\\?#]+)@([^@:\s;/\\?#]+):([^:\s;/\\?#@]+):([0-9]+)$/.exec(item);
    if (!parts) fail('expected username@password:host:port with no URI scheme, IPv6 or transport suffix');
    const [, username, password, host, portText] = parts;
    if (!/^[\x21-\x7e]+$/.test(username + password)) fail('credentials must contain printable ASCII characters without whitespace or : @ ; / \\ ? #');
    const hostname = host.endsWith('.') ? host.slice(0, -1) : host;
    const labels = hostname.split('.');
    const ipv4 = isIP(hostname) === 4;
    const dns = hostname.length > 0 && hostname.length <= 253 && !/^[0-9.]+$/.test(hostname)
      && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    if (!ipv4 && !dns) fail('host must be an IPv4 address or ASCII DNS hostname');
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) fail('port must be between 1 and 65535');
    credentials.push(username, password);
    return `${username}@${password}:${host}:${port}`;
  }).join(';');

  // Child debug output can contain JSON or URL-encoded metadata. Replace all
  // credential forms in one pass so a short credential cannot corrupt a mask.
  const variants = new Set();
  for (const secret of [value, value.trim(), normalized, ...credentials]) {
    variants.add(secret);
    variants.add(JSON.stringify(secret).slice(1, -1));
    const encoded = encodeURIComponent(secret);
    variants.add(encoded);
    variants.add(encoded.replace(/%[0-9a-f]{2}/gi, part => part.toLowerCase()));
  }
  const pattern = new RegExp([...variants].filter(Boolean).sort((a, b) => b.length - a.length)
    .map(secret => secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return {
    metadata: Object.freeze({ turn_server: normalized }),
    redact: message => String(message).replace(pattern, '[redacted]'),
  };
}

module.exports = { createTurnConfig };
