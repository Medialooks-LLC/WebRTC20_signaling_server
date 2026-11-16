import * as handlers from "./handlers";
import * as actionTypes from "../../actions/constants";
import { StoreType } from "../../store";

export const createMediaMiddleware = () => {
  return (store: StoreType) => (next: any) => (action: any) => {
    switch (action.type) {
      case actionTypes.WEB_RTC_GET_MEDIA_DEVICES:
        handlers.onWebRtcGetMediaDevices(store);
        break;
      case actionTypes.WEB_RTC_ENUMERATE_DEVICES:
        handlers.onWebRtcEnumerateDevices(store, action);
        break;
      case actionTypes.WEB_RTC_GET_LOCAL_MEDIA_STREAM:
        handlers.onWebRtcGetLocalMediaStream(store);
        break;
      case actionTypes.WEB_RTC_GET_LOCAL_SCREEN:
        handlers.onWebRtcGetLocalScreen(store);
        break;
      case actionTypes.WEB_RTC_PROCESS_LOCAL_MEDIA_STREAM:
        handlers.onWebRtcProcessLocalMediaStream(store, action);
        break;
    }
    next(action);
  };
};
