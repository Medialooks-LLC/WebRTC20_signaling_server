"use strict";

const { logStr, clientInfo } = require("../helpers");
const config = require("getconfig");

function raiseError(socketAuth, socket, next) {
  logStr(
    `AUTH Client: ${socket.id} auth module already connected`,
    clientInfo(socketAuth)
  );

  const err = new Error("auth_already_connected");
  err.data = {
    error: "auth_already_connected",
    content: "Auth module already connected, only ONE auth module allowed",
    connected: clientInfo(socketAuth)
  }; // additional details
  next(err);
}

function authorize(socket, next) {
  logStr(`AUTH Client: ${socket.id}`, {
    handshake: { query: socket.handshake.query }
  });

  socket.privateProps.role = "auth";

  // Auto-join the room for compatibility with old clients
  socket.joinRoom = config.metadata.special_rooms["auth"].name;
  next();
}

function authorizeAuth(socketAuth, socket, next) {
  // Only one auth module is supported for now (subject to change)
  if (socketAuth) {
    raiseError(socketAuth, socket, next);
  } else {
    authorize(socket, next);
  }
}

module.exports = { authorizeAuth };
