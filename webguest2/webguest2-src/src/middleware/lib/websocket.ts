import { Socket } from "socket.io-client";
import * as handlers from "./handlers";
import * as actionTypes from "../../actions/constants";
import { StoreType } from "../../store";
import { joinRoomAction, leaveRoom } from "../../actions";

export const createWebocketMiddleware = () => {
  let socket: Socket | undefined;

  return (store: StoreType) => (next: any) => (action: any) => {
    switch (action.type) {
      case actionTypes.WS_CONNECT:
        socket = handlers.onWsConnect(store, action, socket);
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        window.socket = socket;
        break;
      case actionTypes.WS_DISCONNECT:
        handlers.onWsDisconnect(store, action, socket);
        socket = undefined;
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        delete window.socket;
        break;
      case actionTypes.WS_MESSAGE:
        handlers.onWsMessage(store, action, socket);
        break;
      case joinRoomAction.type:
        handlers.onWebRtcJoinRoom(store, action, socket);
        break;
      case leaveRoom.type:
        handlers.onWebRtcLeaveRoom(store, action, socket);
        break;
      case actionTypes.WEB_RTC_SET_INFO:
        handlers.onWebRtcSetInfo(store, action, socket);
        break;
    }
    next(action);
  };
};
