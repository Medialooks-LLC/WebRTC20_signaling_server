'use strict';
require('./node-compat.cjs');
// The legacy server has no bind-address setting. Its private listener stays inside this process host.
const net = require('node:net');
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number' && (args.length === 1 || typeof args[1] === 'function')) {
    args.splice(1, 0, '127.0.0.1');
  }
  return listen.apply(this, args);
};
require('../signaling/server/server.js');
