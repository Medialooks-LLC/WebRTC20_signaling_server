import { createPeer } from "./create-peer";
import { StoreType } from "../../../../store";
import { GuestDisconnectedReason, WorkingMode } from "../../../../dto";
import { PeerType } from "../../../../webrtc/types";
import { findPeer, shouldRestart } from "../../../../helpers";
import { ANSWER, CANDIDATE, END_OF_CANDIDATES, OFFER, REJECTED } from "../../../../webrtc/constants";
import { connectionRejected, logMessage } from "../../../../actions";

export const onWebRtcMessage = (
  store: StoreType,
  {
    payload: message,
  }: {
    payload: {
      from: string;
      ptype: PeerType;
      type: string;
      offerResult?: string;
      reason: GuestDisconnectedReason;
      error_name?: string;
      reconnect?: boolean;
    };
  },
) => {
  const state = store.getState();
  const isHost = state.workingMode === WorkingMode.Publisher;
  const affectedPeers = isHost ? state.peers.filter(p => p.id === message.from) : state.peers;
  if (message.type === "error") {
    store.dispatch(logMessage("Error message received", message));
    affectedPeers.forEach(p => p.end(!isHost && shouldRestart(state.workingMode, p.ptype)));
  } else if (message.offerResult?.toLowerCase() === REJECTED) {
    store.dispatch(connectionRejected(message.reason, message.error_name));
    affectedPeers.forEach(p =>
      p.end(!isHost && message.reconnect && shouldRestart(state.workingMode, p.ptype)),
    );
  } else if (isHost || message.from === state.targetId) {
    if (isHost && (
      message.from === state.targetId ||
      ![OFFER, ANSWER, CANDIDATE, END_OF_CANDIDATES].includes(message.type)
    )) return;
    const localPtype = isHost ? "publisher" : message.ptype ?? "publisher";
    const peer =
      findPeer(state.peers, message.from, localPtype) ??
      createPeer({
        id: message.from,
        store: store,
        secure: false,
        ptype: localPtype,
        signalingPtype: isHost ? message.ptype ?? "subscriber" : undefined,
      });

    peer.handleMessage(message);
  }
};
