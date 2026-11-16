"use strict";

const { logStr, getSocket } = require("../helpers");

function raiseError(socket, next) {
  logStr(`ERROR Client: ${socket.id} Connect Id for guest not found`, {
    query: socket.handshake.query
  });

  const err = new Error("Wrong access id");
  err.data = {
    error: "not_authorized",
    content: "Connect Id for guest not found"
  }; // additional details
  next(err);
}

function authorize(socket, next) {
  socket.privateProps.role = "guest";

  // For auto-join
  socket.joinRoom = socket.privateProps.access_id;
  next();
}

function authorizeGuest(io, socket, next) {
  // Guest  authorization
  if (!getSocket(io, socket.privateProps.access_id, true)) {
    raiseError(socket, next);
  } else {
    authorize(socket, next);
  }
}

module.exports = {
  authorizeGuest
};
