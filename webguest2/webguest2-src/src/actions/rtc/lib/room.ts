import { DispatchType, WebRtcState } from "../../../store/type";
import { setAwaiting, setLoading, setOnline } from "../../ui";
import { showNotification } from "../../support";
import i18n from "../../../i18n/i18n_config";
import { createAction } from "@reduxjs/toolkit";

export const setTargetId = createAction<string>("webrtc/target-client/set");

export const joinRoomAction = createAction<string>("room/join");

export const joinRoom = (roomName?: string) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const state = getState();
    if (state.sessionReady && !state.joinInProgress) {
      roomName = roomName ?? state.targetId;
      if (roomName && roomName.length > 0) dispatch(joinRoomAction(roomName));
    }
  };
};

export const roomJoinErrorAction = createAction<Error>("room/join-error");

export const roomJoinError = (error: Error) => {
  return (dispatch: DispatchType) => {
    dispatch(setAwaiting(false));
    dispatch(setLoading(false));
    dispatch(setOnline(false));
    showNotification(
      i18n.t("errors.roomJoin.title"),
      error.message ?? i18n.t("errors.roomJoin.message"),
    );
    dispatch(roomJoinErrorAction(error));
  };
};

export const roomJoinSuccess = createAction<{
  members: { [p: string]: { turn_server?: string; audio_channels?: string } };
}>("room/join-success");

export const roomJoinCompleted = createAction("room/join-completed");

export const leaveRoom = createAction<string | undefined>("room/leave");

export const roomLeft = () => {
  return (dispatch: DispatchType) => {
    dispatch(setLoading(false));
    dispatch(setOnline(false));
  };
};
