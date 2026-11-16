import * as actions from "../../../../actions";
import { iceServerUpdate } from "../../../../lib";
import { createPeer } from "./create-peer";
import { WorkingMode } from "../../../../dto";
import { StoreType } from "../../../../store";
import { findPeer } from "../../../../helpers";
import { setVtVersion } from "../../../../reducers/vtVersion";
import { PeerType } from "../../../../webrtc/types";

export const onWebRtcRoomJoinFinished = (
  store: StoreType,
  {
    payload,
  }: {
    payload: {
      members: {
        [_p: string]: {
          turn_server?: string;
          audio_channels?: string;
          id: string;
          secured: string;
          vt_version?: string;
        };
      };
      name: string;
    };
  },
) => {
  const state = store.getState();
  // A standalone source only advertises its own room. Subscribers initiate offers;
  // creating a receiving Peer here would attach no local tracks and cause glare.
  const target = state.workingMode === WorkingMode.Publisher ? undefined : state.targetId;
  if (target) store.dispatch(setVtVersion(payload.members[target]?.vt_version));
  if (target) {
    const client = payload.members[target];
    if (client) {
      store.dispatch(
        actions.setIceServers(iceServerUpdate(client, state.peerConnectionConfig?.iceServers)),
      );
      if (client.audio_channels) {
        const maxChannels = parseInt(client.audio_channels);
        store.dispatch(actions.setMaxAudioChannels(maxChannels));
      }

      let ptype: PeerType = state.workingMode === WorkingMode.Preview
        ? "subscriber"
        : "publisher";

      if (store.getState().vtVersion.isLegacy) {
        ptype = "publisher";
      }

      const peer =
        findPeer(state.peers, client.id, ptype) ??
        createPeer({
          id: client.id,
          secure: client.secured === "true",
          store,
          ptype,
        });
      if (peer.pc.iceConnectionState === "new") peer.run();
    }
  }
  store.dispatch(actions.roomJoinCompleted());
  store.dispatch(actions.setLoading(false));
  store.dispatch(actions.setAwaiting(false));
  store.dispatch(actions.setOnline(true));
};
