import { DispatchType, WebRtcState } from "../../../store/type";
import { WorkingMode } from "../../../dto";
import { joinRoom } from "./room";
import { wsConnect } from "../../websockets";
import { createAction } from "@reduxjs/toolkit";

export const setReadyToCall = createAction<boolean>("webrtc/ready-to-call/set");

export const testReadiness = () => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const state = getState();

    if (state.sessionReady) {
      if ((!state.media.video && !state.media.audio) || state.localMediaStream) {
        dispatch(setReadyToCall(true));
        if (state.localMediaConfig.autostart || state.workingMode === WorkingMode.Preview) {
          dispatch(joinRoom());
        }
      }
    } else {
      dispatch(wsConnect());
    }
  };
};

export const connectPreview = () => (dispatch: DispatchType) => {
  dispatch(wsConnect());
};
