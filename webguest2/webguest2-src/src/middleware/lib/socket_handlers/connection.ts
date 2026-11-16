import { StoreType } from "../../../store";
import { Socket } from "socket.io-client";
import * as events from "../../../webrtc/constants";
import * as handlers from "./lib";

const eventHandlers = {
  [events.CONNECT_ERROR]: handlers.onConnectError,
  [events.DISCONNECT]: handlers.onClose,
  [events.CONNECT_TIMEOUT]: handlers.onConnectTimeout,
  [events.CONNECT]: handlers.onOpen,
  [events.ON_CONNECTION]: handlers.onConnection,
  [events.ON_LEAVE]: handlers.onLeave,
  [events.ON_JOIN]: handlers.onMemberJoined,
  [events.MESSAGE]: handlers.onMessage,
  [events.ON_REQUEST]: handlers.onRequest,
  [events.ON_PROPS_SET]: handlers.onPropsSet,
};

type EventHandlers = typeof eventHandlers;

export const bindEventHandlers = (store: StoreType, socket: Socket) => {
  Object.keys(eventHandlers).forEach(e => {
    const event = e as keyof EventHandlers;
    socket.off(event, eventHandlers[event](store));
    socket.on(event, eventHandlers[event](store));
  });
};
