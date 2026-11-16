import * as constants from "../../../../webrtc/constants";
import { CLOSED, CONNECTED, DISCONNECTED, FAILED } from "../../../../webrtc/constants";
import { setAwaiting, setLoading, setOnline } from "../../../../actions";
import { StoreType } from "../../../../store";
import { WorkingMode } from "../../../../dto";

export const onWebRtcPeerConnectionStateChanged = (
  store: StoreType,
  { payload }: { payload: string },
) => {
  if ([CONNECTED, DISCONNECTED, FAILED, CLOSED].includes(payload)) {
    store.dispatch(setLoading(false));
    store.dispatch(setAwaiting(false));
    // Source availability follows its room registration, independently of any one viewer.
    if (store.getState().workingMode !== WorkingMode.Publisher) {
      store.dispatch(setOnline(payload === constants.CONNECTED));
    }
  }
};
