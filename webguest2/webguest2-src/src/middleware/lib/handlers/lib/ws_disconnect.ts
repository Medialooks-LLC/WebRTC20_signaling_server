import { Socket } from "socket.io-client";
import { StoreType } from "../../../../store";

export const onWsDisconnect = (_store: StoreType, _action: {}, socket?: Socket) => {
  socket?.close();
};
