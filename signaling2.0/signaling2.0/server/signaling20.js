"use strict";

const _ = require("lodash");
const config = require("getconfig");
const {
  propsFromQuery,
  safeCb,
  logStr,
  isTrue,
  clientInfo,
  getSocket,
  deepOmitNull
} = require("./lib/helpers");

const {
  externalIdToSocket,
  addIdToMap,
  removeIdFromMap
} = require("./lib/external-ids-map");
const { authorizeAuth } = require("./lib/authorization/authorize-auth");
const { authorizeGuest } = require("./lib/authorization/authorize-guest");
const { authorizeDefault } = require("./lib/authorization/authorize-default");

function listenSockets(io) {
  let socketAuth;

  // authorization
  // (basic check for username/password + guest authorization)
  // https://socket.io/docs/v3/middlewares/
  io.use((socket, next) => {
    const externalId = socket.handshake.query.id;
    const socketId = externalId ? externalIdToSocket.get(externalId) : null;
    if (socketId) {
      logStr(
        `ERROR Client: ${externalId} Client Id already used: ${socketId}`,
        socket.handshake.query
      );

      const err = new Error(
        `Another client with id of ${externalId} (socket: ${socketId}) exists`
      );
      err.data = {
        id: socket.id,
        query: socket.handshake.query,
        error: "query_id",
        description: `Another client with id of ${externalId} exists`
      }; // additional details
      next(err);
    } else {
      socket.privateProps = propsFromQuery(socket);
      const {
        vt_auth_user,
        vt_auth_pass,
        access_id,
        auth
      } = socket.privateProps;
      // Check for auth module
      if (
        vt_auth_user &&
        vt_auth_user === config.auth.vt_auth_user &&
        vt_auth_pass &&
        vt_auth_pass === config.auth.vt_auth_pass
      ) {
        authorizeAuth(socketAuth, socket, next);
      } else if (access_id) {
        authorizeGuest(io, socket, next);
      } else if (auth) {
        authorizeDefault(socketAuth, socket, next);
      } else {
        // Not authorized
        logStr(`ERROR Client: ${socket.id} NO AUTH INFO`, {
          query: socket.handshake.query
        });

        const err = new Error("not_authorized");
        err.data = {
          error: "not_authorized",
          content: "Auth info not found"
        }; // additional details
        next(err);
      }
    }
  });

  // Update props (from query)
  // https://socket.io/docs/v3/middlewares/
  io.use((socket, next) => {
    // Specify self-room join props
    // visible and notify flags are set to true in self-room by default
    socket.joinProps = {
      [socket.id]: {
        notify: isTrue(socket.handshake.query.notify, true),
        visible: isTrue(socket.handshake.query.visible, true)
      }
    };

    // Public props
    socket.publicProps = JSON.parse(socket.handshake.query.public || "{}");

    next();
  });

  // For debugging purposes
  // Note: notifyRoomMembers() inside this method causes a crash
  // in index.js:67 _del(room, id) {
  // ...
  // Here -> if (this.rooms.get(room).size === 0) {
  // ....
  // Reason: this.rooms already empty as during join-room->notifyRoomMembers->emit error occurs
  // and other sockets are removed from room
  io.of("/").adapter.on("leave-room", (roomName, id) => {
    logStr(`socket ${id} has left the room ${roomName}`);

    // Notify auth
    if (socketAuth && id !== socketAuth.id && id !== roomName) {
      const authMessage = {
        type: "auth_room_leave",
        payload: {
          room: roomName,
          client_info: clientInfo(getSocket(io, id, false), roomName)
        }
      };

      socketAuth.emit("on_request", authMessage);
    }
  });

  io.on("error", function(details) {
    logStr("IO ERROR:", details);
  });

  io.on("connection", socket => {
    if (socket.privateProps.role === "auth") socketAuth = socket;
    logStr(`CONNECT Client: ${socket.id}`, {
      privateProps: socket.privateProps,
      publicProps: socket.publicProps
    });

    addIdToMap(socket);

    // Notify cients for get socket id + headers + server metadata (e.g. stunserver, gateway_rooms, auth_id, etc... )
    const connectionInfo = {
      peer_id: socket.privateProps.id,
      session_id: socket.handshake.issued,
      socket_id: socket.id,
      signaling_ver: "2.0",
      remoteAddress: socket.request.connection.remoteAddress,
      remotePort: socket.request.connection.remotePort,
      headers: socket.handshake.headers,
      server_metadata: config.metadata || {},
      username: socket.privateProps.username,
      role: socket.privateProps.role
    };

    if (
      config.metadata &&
      config.metadata.special_rooms &&
      config.metadata.special_rooms.auth
    )
      connectionInfo.auth_room = config.metadata.special_rooms.auth;

    // For debugging purposes
    if (socketAuth && socketAuth.id !== socket.id) {
      // For compatibility with old clients
      connectionInfo.auth_id = socketAuth.privateProps.id;
      connectionInfo.auth_props = clientInfo(socketAuth);

      // To have an ability to update all clients after auth is reconnected
      connectionInfo.server_metadata.auth_id = socketAuth.privateProps.id;
      connectionInfo.server_metadata.auth_props = clientInfo(socketAuth);
    } else if (socket.id === socketAuth.id) {
      // Notify all connected clients about auth changes
      // e.g. for auth reconnect
      connectionInfo.server_metadata.auth_id = socketAuth.privateProps.id;
      connectionInfo.server_metadata.auth_props = clientInfo(socketAuth);

      socket.broadcast.emit("on_metadata_update", {
        server_metadata: connectionInfo.server_metadata
      });
    }

    // Join room if specified
    if (socket.joinRoom) {
      const joinError = join(socket.joinRoom);
      if (!joinError) connectionInfo.join_result = roomMembers(socket.joinRoom);
      else connectionInfo.join_result = joinError;

      delete socket.joinRoom;
    }

    socket.emit("on_connection", connectionInfo);

    // Handlers below
    socket.on("error", function(details) {
      logStr("SOCKET ERROR:", details);
    });

    // Updates global metadada
    socket.on("metadata_update", function(details) {
      if (!details) return;

      if (socket.privateProps.role !== "admin") return;

      // update auth_id
      const metadata = config.metadata;
      if (socketAuth) {
        metadata.auth_id = socketAuth.privateProps.id;
        metadata.auth_props = clientInfo(socketAuth);
      }

      // Notify ALL connected room_members via 'on_metadata_update' message
      socket.broadcast.emit("on_metadata_update", {
        server_metadata: metadata
      });
    });

    // Send a message to another id
    // Destination SHOULD be specified in 'to' field:
    // 1. To peer with specified id (e.g. 'to'='1vswhXCS19U4ZgxS')
    // 2. Array of destination peer id's (e.g. 'to'=['1vswhXCS19U4ZgxS', '45gATSBqdsnTYZSAz', ...] )
    // 3. (?) (not_impl) Destination room - for send to all peers in room.
    // 4. (?) (not_impl) Map of desired public props (e.g. { 'name'='Guest1', 'location'='DE' } or {'tag'='AVTest'})
    //    - note if specifie public props contain array -> e.g. if tag=['AVTest','VideoSink'], check presence of desired props in array
    socket.on("message", (details, cb) => {
      if (!details.to) {
        if (cb) cb("to_field_missed", { error: "'to' field is required" });
        return;
      }

      const message = updateSenderInfo(details);

      const idOk = [];
      const idFailed = [];
      if (Array.isArray(details.to)) {
        for (const to of details.to) {
          const otherSocket = getSocket(io, to, true);
          if (otherSocket) {
            otherSocket.emit("message", { ...message, to });
            idOk.push(to);
          } else {
            idFailed.push(to);
          }
        }
      } else {
        const otherSocket = getSocket(io, details.to, true);
        if (otherSocket) {
          otherSocket.emit("message", message);
          idOk.push(details.to);
        } else {
          idFailed.push(details.to);
        }
      }

      if (idFailed.length > 0) {
        logStr(`WARNING - message ${details} - NOT FOUND IDs:`, idFailed);
      }

      safeCb(cb)(null, { sent: idOk, failed: idFailed });
    });

    // Send a request to another id
    // Destination peer id SHOULD be specified in 'to' field:
    socket.on("request", (details, cb) => {
      if (!details.to) {
        safeCb(cb)("to_field_missed", { error: "'to' field is required" });
        return;
      }

      if (typeof cb != "function") {
        safeCb(cb)("callback_missed", { error: "callback_missed" });
        return;
      }

      const otherSocket = getSocket(io, details.to, true);
      if (!otherSocket) {
        safeCb(cb)("id_not_found", { error: "id_not_found" });
        return;
      }

      otherSocket.emit(
        "on_request",
        updateSenderInfo(details),
        (err, result) => {
          logStr("on_request(details, err, result)", details, err, result);
          safeCb(cb)(err, result);
        }
      );
    });

    // Forward message to another peer (optionally with callback)
    // receive json:
    // 'to' - destination peer (peers list ?)
    // '<message_name>' = {} -> forwarded message
    socket.on("forward", (details, cb) => {
      if (!details.to) {
        safeCb(cb)("to_field_missed", { error: "'to' field is required" });
        return;
      }

      const otherSocket = getSocket(io, details.to, true);
      if (!otherSocket) {
        safeCb(cb)("id_not_found", { error: "id_not_found" });
        return;
      }

      Object.keys(details).forEach(function(messageName) {
        if (typeof messageName === "string" && messageName !== "to") {
          if (typeof cb === "function") {
            otherSocket.emit(
              messageName,
              updateSenderInfo(details[messageName]),
              (err, result) => {
                safeCb(cb)(err, result);
              }
            );

            return;
          }

          otherSocket.emit(messageName, updateSenderInfo(details[messageName]));
        }
      });
    });

    // {
    //   clean : true/false (optional, default FALSE)
    //   notify : true/false (optional, default TRUE)
    //   changes_only : true/false (optional, default FALSE)
    //   values : { prop_name : prop_value, name_for_remove: null, ... }
    // }
    socket.on("props_set", function({ clean, notify, changes_only, values }, cb) {
      if (typeof socket.publicProps != "object" || clean)
        socket.publicProps = {};

      if (values)
        socket.publicProps = deepOmitNull(_.merge(socket.publicProps, values));

      if (isTrue(notify, true)) {
        const rooms = io.of("/").adapter.sids.get(socket.id);
        if (rooms) {
          rooms.forEach(function(roomName) {
            const info = changes_only
              ? { id: socket.privateProps.id, clean, notify, changes_only, values }
              : clientInfo(socket, roomName);
            notifyRoomMembers(
              socket,
              changes_only ? "on_props_changed" : "on_props_set",
              roomName,
              info
            );
          });
        }
      }
      safeCb(cb)(null, clientInfo(socket));
    });

    socket.on("props_get", function(peerId, cb) {
      if (peerId) {
        const otherSocket = getSocket(io, peerId, true);
        if (otherSocket) {
          safeCb(cb)(null, clientInfo(otherSocket));
        } else {
          safeCb(cb)("id_not_found", { error: "id_not_found" });
        }
      } else {
        safeCb(cb)(null, clientInfo(socket));
      }
    });

    socket.on("room_members_get", function(room_name, cb) {
      // Basic check for auth room_members
      if (socket.privateProps.role !== "guest") {
        // todo: check what room exist
        safeCb(cb)(null, roomMembers(room_name));
      }
    });

    socket.on("join", join);

    socket.on("leave", function(roomName, cb) {
      const { joinProps, privateProps, publicProps } = socket;
      logStr(
        `Client ${socket.handshake.query.id}(${socket.id}) has left the room ${roomName}`,
        {
          joinProps: joinProps[roomName],
          privateProps,
          publicProps
        }
      );

      if (joinProps[roomName] && joinProps[roomName].visible)
        notifyRoomMembers(
          socket,
          "on_leave",
          roomName,
          clientInfo(socket, roomName)
        );

      delete joinProps[roomName];

      socket.leave(roomName);
      if (cb) cb(null, roomName);
    });

    socket.on("disconnect", reason => {
      // Notify auth about disconnected client (for channels counting)
      if (socketAuth && socketAuth.id === socket.id) {
        logStr(`DISCONNECT AUTH: ${socket.id} Reason: ${reason}`, {
          privateProps: socket.privateProps,
          publicProps: socket.publicProps
        });

        socketAuth = undefined;
      } else {
        logStr(`DISCONNECT Client: ${socket.id} Reason: ${reason}`, {
          privateProps: socket.privateProps,
          publicProps: socket.publicProps
        });

        if (socketAuth) {
          const roomName = "auth";
          socketAuth.emit("on_leave", roomName, clientInfo(socket, roomName));
        }
      }

      // Notify about leaving all rooms
      // Note: io.of("/").adapter.sids.get(socket.id); is already empty, thus using own join_props
      Object.keys(socket.joinProps).forEach(function(roomName) {
        if (socket.joinProps[roomName].visible)
          notifyRoomMembers(
            socket,
            "on_leave",
            roomName,
            clientInfo(socket, roomName)
          );
      });

      removeIdFromMap(socket);
    });

    // support for logging full webrtc traces to stdout
    // useful for large-scale error monitoring
    socket.on("trace", function(data) {
      console.log(
        "trace",
        JSON.stringify([
          data.type,
          data.session,
          data.prefix,
          data.peer,
          data.time,
          data.value
        ])
      );
    });

    socket.on("error", function(err) {
      logStr(`Client: ${socket.id}`, err);
    });

    // Next rule:
    // - do not notify ourself
    // - do not notify room_members with 'notify' false
    // - guest recieve notification only from client with id same as access_id
    function notifyRoomMembers(socket, messageName, roomName, messageContent) {
      const room = getRoom(roomName);

      if (room) {
        // Skip invisible room members
        for (const id of room) {
          const roomMember = getSocket(io, id, false);
          if (
            roomMember &&
            socket.id !== id &&
            roomMember.joinProps[roomName] &&
            roomMember.joinProps[roomName].notify &&
            (roomMember.privateProps.role !== "guest" ||
              roomMember.privateProps.access_id === socket.privateProps.id)
          ) {
            roomMember.emit(messageName, roomName, messageContent);
          }
        }
      }
    }

    function join(roomName, joinProps, cb) {
      // sanity check
      if (typeof roomName !== "string")
        return { error: "join_room_name_missed" };

      if (typeof joinProps === "function") {
        [cb, joinProps] = [joinProps, cb];
      }

      joinProps = joinProps || {};

      if (config.metadata && config.metadata.special_rooms) {
        let error;
        Object.keys(config.metadata.special_rooms).every(function(
          specialRoomName
        ) {
          const specialRoom = config.metadata.special_rooms[specialRoomName];
          if (
            roomName === specialRoomName &&
            isTrue(joinProps.visible, true) &&
            socket.privateProps.role !== specialRoom.role
          ) {
            error = "join_not_authorized";
            safeCb(cb)(error, { error });

            return false;
          }
        });
        if (error) return error;
      }

      // Create joinProps
      socket.joinProps = socket.joinProps || {};
      socket.joinProps[roomName] = {};
      if (joinProps) socket.joinProps[roomName] = joinProps;

      // Room entrance authorize (not impl yet)
      if (socketAuth && socket.id !== socketAuth.id) {
        const authMsg = {
          type: "auth_room_join",
          payload: {
            room: roomName,
            client_info: clientInfo(socket, roomName),
            join_props: socket.joinProps
          }
        };

        socketAuth.emit(
          "on_request",
          updateSenderInfo(authMsg),
          (err, result) => {
            if (err || result.error) {
              logStr(
                "ERROR JOIN AUTH SRV Id: " + socket.id + " err:",
                err,
                " result:",
                result
              );

              delete socket.joinProps[roomName];

              return {
                error: err ? err : "join_not_authorized",
                ...result
              };
            } else if (result && result.proof) {
              socket.joinProps[roomName].proof = result.proof;
            }
          }
        );
      }

      // Update mandatory joinProps
      socket.joinProps[roomName].visible = isTrue(joinProps.visible, true);
      socket.joinProps[roomName].notify = isTrue(joinProps.notify, true);

      socket.join(roomName);

      logStr(
        `Client ${socket.handshake.query.id}(${socket.id}) has joined room ${roomName}`,
        {
          privateProps: socket.privateProps,
          publicProps: socket.publicProps
        }
      );

      if (socket.joinProps[roomName].notify) {
        safeCb(cb)(null, roomMembers(roomName));
      } else {
        const oneClientInfo = {};
        oneClientInfo.name = roomName;
        oneClientInfo.members = {};
        oneClientInfo.members[socket.id] = clientInfo(socket, roomName);

        safeCb(cb)(null, oneClientInfo);
      }

      // todo: move into join-room event (for notifying abut self-name joining)
      // WARN !!! Now CPP client have to receive join result BEFORE clients receive on_join and try to connect/reconnect
      if (socket.joinProps[roomName].visible)
        notifyRoomMembers(
          socket,
          "on_join",
          roomName,
          clientInfo(socket, roomName)
        );
    }

    function updateSenderInfo(message) {
      message.from = socket.privateProps.id;
      message.from_role = socket.privateProps.role;
      message.from_user = socket.privateProps.username;
      message.sender_proof = socket.privateProps.proof;
      message.from_name = socket.publicProps?.name;

      return message;
    }

    // Next rule:
    // - do not populate not 'visible' room members
    // - for guests include only members with same access_id
    function roomMembers(roomName) {
      const result = {
        name: roomName,
        members: {}
      };
      const room = getRoom(roomName);
      if (room) {
        // Skip invisible room members
        room.forEach(function(id) {
          const roomMember = getSocket(io, id, false);
          if (
            roomMember &&
            roomMember.joinProps[roomName].visible &&
            (socket.privateProps.id === roomMember.privateProps.id ||
              socket.privateProps.role !== "guest" ||
              socket.privateProps.access_id === roomMember.privateProps.id)
          ) {
            result.members[roomMember.privateProps.id] = clientInfo(
              roomMember,
              roomName
            );
          }
        });
      }
      return result;
    }
  }); // on(connection)

  function getRoom(name) {
    return io.sockets.adapter.rooms.get(name);
  }
} // listenSocket;

module.exports = listenSockets;
