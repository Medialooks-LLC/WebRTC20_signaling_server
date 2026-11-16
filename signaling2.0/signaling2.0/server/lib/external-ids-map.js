"use strict";

const externalIdToSocket = new Map();

// Use room with external id for have self-named room (used for historical limited access)
function addIdToMap(socket) {
  const externalId = socket.privateProps?.id;
  if (!externalId) return;

  externalIdToSocket.set(externalId, socket.id);
  socket.joinProps[externalId] = socket.joinProps[socket.id];
  socket.join(externalId);

  console.log(
    `Socket ${externalId}(${socket.id}) has been added to address map`
  );
}

function removeIdFromMap(socket) {
  const externalId = socket.privateProps?.id;
  if (!externalId) return;

  socket.leave(externalId);
  delete socket.joinProps[externalId];
  externalIdToSocket.delete(externalId);

  console.log(
    `Socket ${externalId}(${socket.id}) has been deleted from address map`
  );
}

module.exports = {
  externalIdToSocket,
  addIdToMap,
  removeIdFromMap
};
