// Reconstructed: the original type-only module was not part of the build output.
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import reducer from "../reducers";

type ReducerState = ReturnType<typeof reducer>;

// Reducers whose inferred type is looser/narrower than what the app works with.
export type WebRtcState = Omit<
  ReducerState,
  "localMediaStream" | "remoteMediaStream" | "peerConnectionConfig"
> & {
  localMediaStream: MediaStream | null;
  remoteMediaStream: MediaStream | null;
  peerConnectionConfig: RTCConfiguration;
};

export type DispatchType = ThunkDispatch<WebRtcState, unknown, AnyAction>;
