import * as handlers from "./handlers";
import * as actionTypes from "../../actions/constants";
import { StoreType } from "../../store";
import {
  connectionStateChanged,
  messageReceived,
  roomJoinSuccess,
  peerPropsSet,
} from "../../actions";

export const createEventsMiddleware = () => {
  return (store: StoreType) => (next: any) => (action: any) => {
    switch (action.type) {
      case roomJoinSuccess.type:
        handlers.onWebRtcRoomJoinFinished(store, action);
        break;
      case messageReceived.type:
        handlers.onWebRtcMessage(store, action);
        break;
      case actionTypes.WEB_GUEST_CONTROL_GET:
        handlers.onWebguestControlsGet(store, action);
        break;
      case actionTypes.WEB_GUEST_CONTROL_SET:
        handlers.onWebguestControlsSet(store, action);
        break;
      case actionTypes.WEB_GUEST_GUEST_DISCONNECTED:
        handlers.onWebguestClientDisconnected(store, action);
        break;
      case peerPropsSet.type:
        handlers.onWebRtcPeerPropsSet(store, action);
        break;
      case connectionStateChanged.type:
        handlers.onWebRtcPeerConnectionStateChanged(store, action);
        break;
    }
    next(action);
  };
};
