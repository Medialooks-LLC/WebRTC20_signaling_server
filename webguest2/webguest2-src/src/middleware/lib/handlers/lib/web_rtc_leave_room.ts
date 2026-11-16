import * as actions from "../../../../actions";
import { Socket } from "socket.io-client";
import { StoreType } from "../../../../store";

export const onWebRtcLeaveRoom = (
  store: StoreType,
  action: { payload?: string },
  socket?: Socket,
) => {
  const state = store.getState();
  const roomName = action.payload ?? state.targetId;
  if (roomName) {
    store.dispatch(actions.setLoading(true));
    socket?.emit("leave", roomName);
    store.dispatch(actions.stopPeers());
  }
  store.dispatch(actions.roomLeft());
};
