import { Socket } from "socket.io-client";
import * as actions from "../../../../actions";
import * as events from "../../../../webrtc/constants";
import { StoreType } from "../../../../store";

export const onWebRtcJoinRoom = (
  store: StoreType,
  { payload: roomName }: { payload: string },
  socket?: Socket,
) => {
  if (roomName) {
    store.dispatch(actions.setLoading(true));
    if (socket) {
      socket.emit(
        events.JOIN,
        roomName,
        { visible: true, notify: true },
        (
          error: string,
          roomDescription: {
            members: { [p: string]: { turn_server?: string; audio_channels?: string } };
          },
        ) => {
          if (error) {
            store.dispatch(actions.roomJoinError(new Error(error)));
          } else {
            store.dispatch(actions.roomJoinSuccess(roomDescription));
          }
        },
      );
    }
  } else {
    store.dispatch(actions.logMessage("No room to join"));
  }
};
