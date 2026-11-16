import * as events from "../../../../webrtc/constants";
import { Socket } from "socket.io-client";
import { StoreType } from "../../../../store";

export const onWsMessage = <T>(_store: StoreType, action: { message: T }, socket?: Socket) => {
  socket?.emit(events.MESSAGE, action.message);
};
