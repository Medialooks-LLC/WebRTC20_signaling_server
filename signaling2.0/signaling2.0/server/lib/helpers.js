"use strict";

const moment = require("moment");
const { externalIdToSocket } = require("./external-ids-map");
const _ = require("lodash");

const deepOmitNull = obj => {
  function omitFromObject(obj) {
    return _.transform(obj, function(result, value, key) {
      if (_.isNull(value)) return;

      result[key] = _.isObject(value) ? omitFromObject(value) : value;
    });
  }

  return omitFromObject(obj);
};

const propsFromQuery = socket => {
  let {
    username,
    auth,
    access_id,
    vt_auth_user,
    vt_auth_pass
  } = socket.handshake.query;
  const privateProps = {
    id: socket.handshake.query.id || socket.id
  };
  if (!!username) privateProps["username"] = username;
  if (!!auth) privateProps["auth"] = fromJson(auth);
  if (!!access_id) privateProps["access_id"] = access_id;
  if (!!vt_auth_user) privateProps["vt_auth_user"] = vt_auth_user;
  if (!!vt_auth_pass) privateProps["vt_auth_pass"] = vt_auth_pass;
  return privateProps;
};

function fromJson(info) {
  return info ? JSON.parse(info) : {};
}

function safeCb(cb) {
  if (typeof cb === "function") {
    return cb;
  } else {
    return function() {};
  }
}

function logStr(s, ...args) {
  console.log(getTimeStr(), s, ...args);
}

function getTimeStr() {
  return moment().format();
}

function isTrue(val, def_val) {
  if (typeof val === "undefined") return !!def_val;

  return val === true || val === "true";
}

function clientInfo(socket, roomName) {
  if (!socket) {
    logStr(`clientInfo error: socket is ${typeof socket}`);
    return;
  }

  const { role, username } = socket.privateProps;
  const info = {
    id: socket.privateProps.id,
    ...(socket.publicProps || {}),
    private: {
      role,
      username
    }
  };

  // Room specific
  if (roomName && socket.joinProps[roomName])
    info.join_props = socket.joinProps[roomName];

  return info;
}

function getSocket(io, id, isExternal) {
  if (isExternal) id = externalIdToSocket.get(id);

  if (id) return io.of("/").sockets.get(id);
}

module.exports = {
  propsFromQuery,
  safeCb,
  logStr,
  isTrue,
  clientInfo,
  getSocket,
  deepOmitNull
};
