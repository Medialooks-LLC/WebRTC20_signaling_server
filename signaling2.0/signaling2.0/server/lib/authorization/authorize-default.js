"use strict";

const { logStr } = require("../helpers");

function authorizeExternal(authSocket, socket, next) {
  authSocket.emit("authorize", socket.privateProps, (error, result) => {
    if (error || result.error) {
      logStr(`ERROR AUTH SRV Id: ${socket.privateProps.id}`, {
        error,
        auth_result_srv: result
      });
      const err = new Error("not_authorized");
      err.data = { error: error || result.error, result }; // additional details
      next(err);
      return;
    }

    // Update role/username from auth server
    socket.privateProps.role = result.role;
    socket.privateProps.username = result.username;
    socket.privateProps.proof = result.proof;

    logStr(`OK AUTH SRV Id: ${socket.privateProps.id}`, { result });

    // Expect what client drop connection if sever not authorized.
    socket.emit("on_authorize", result);
    next();
  });
}

function authorizeDefault(socketAuth, socket, next) {
  if (socketAuth) {
    authorizeExternal(socketAuth, socket, next);
  } else {
    // Not authorized
    logStr(`ERROR Client: ${socket.id} NO AUTH SERVER`, {
      query: socket.handshake.query
    });

    const err = new Error("no_auth_server");
    err.data = {
      error: "no_auth_server",
      content: "Auth server not found"
    }; // additional details
    next(err);
  }
}

module.exports = {
  authorizeDefault
};
