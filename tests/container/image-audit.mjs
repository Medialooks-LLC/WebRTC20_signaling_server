import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = '/app';
const violations = [];
let entries = 0;
assert.ok(fs.existsSync(root), 'Application root /app is present');
assert.ok(typeof process.getuid === 'function' && process.getuid() !== 0, 'Image defaults to a non-root Linux user');
const credentialNames = /(?:password|passwd|secret|token|private[_-]?key|auth[_-]?login|ssh[_-]?(?:private[_-]?)?key|deploy[_-]?key|signing[_-]?key|api[_-]?key)/i;
for (const [name, value] of Object.entries(process.env)) {
  if (value && credentialNames.test(name) && !/^(?:TLS_KEY_FILE|TLS_CERT_FILE)$/.test(name)) violations.push({ type: 'image-environment', name });
}
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const relative = path.relative(root, filename).split(path.sep).join('/');
    entries++;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === '.ssh' || relative === 'web/node_modules' || relative === 'web/src' || relative === 'auth/config' || relative === 'signaling/config') violations.push({ type: 'forbidden-directory', path: relative });
      visit(filename);
    } else {
      if (/\.(?:pem|key|pfx|p12|ppk)$/i.test(entry.name) || /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/.test(entry.name) || (/^\.env(?:\.|$)/.test(entry.name) && !/\.(?:example|template)$/.test(entry.name))) violations.push({ type: 'forbidden-file', path: relative });
      if (!relative.includes('/node_modules/') && /\.(?:json|js|cjs|mjs|ya?ml)$/.test(entry.name) && fs.statSync(filename).size < 3_000_000) {
        const contents = fs.readFileSync(filename, 'utf8');
        if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{100,}-----END/.test(contents) || /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/.test(contents) || /https?:\/\/[^\s/@:]+:[^\s/@]+@/.test(contents)) violations.push({ type: 'embedded-credential', path: relative });
      }
    }
  }
}
visit(root);
console.log(JSON.stringify({ check: 'image-content', uid: process.getuid(), entries, violations }));
if (violations.length) process.exitCode = 1;
