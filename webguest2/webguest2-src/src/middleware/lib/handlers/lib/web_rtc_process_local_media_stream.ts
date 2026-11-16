import {
  joinRoom,
  setAwaiting,
  setLoading,
  setLocalMediaStream,
  testReadiness,
  toggleCamera,
  toggleMute,
} from "../../../../actions";
import { WebRtcState } from "../../../../store/type";
import { StoreType } from "../../../../store";

export const onWebRtcProcessLocalMediaStream = (
  store: StoreType,
  action: { stream: MediaStream },
) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  window.stream = action.stream;

  const state: WebRtcState = store.getState();
  if (action.stream) {
    store.dispatch(setLocalMediaStream(action.stream));
    store.dispatch(toggleCamera(state.localMediaConfig.cameraMuted));
    store.dispatch(toggleMute(state.localMediaConfig.micOff));
  }

  store.dispatch(setAwaiting(false));
  store.dispatch(setLoading(false));

  if (!state.localMediaStream || state.localMediaStream.id !== action.stream?.id) {
    const negotiationNeeded =
      (!state.localMediaStream && !!action.stream) ||
      (!!state.localMediaStream && state.localMediaStream.id !== action.stream?.id);

    if (action.stream) {
      state.peers.forEach(peer => {
        if (peer.ptype === "publisher") {
          if (negotiationNeeded) {
            peer.end();
          } else peer.bindTracks(action.stream);
        }
      });
    }

    if (!state.readyToCall) {
      store.dispatch(testReadiness());
    } else if (negotiationNeeded) {
      store.dispatch(joinRoom());
    }
  }
};
