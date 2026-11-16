import { Peer } from "../../../../webrtc";
import { addPeer } from "../../../../actions";
import { PeerProps } from "../../../../webrtc/types";

export const createPeer = (peerProps: PeerProps) => {
  const peer = new Peer(peerProps);
  const state = peerProps.store.getState();
  if (state.localMediaStream && peer.ptype === "publisher") {
    const stream = state.localMediaStream;
    const tracks = stream.getTracks();
    if (tracks.length > 0) tracks.forEach(t => peer.addTrack(t, stream));
  }
  peerProps.store.dispatch(addPeer(peer));
  return peer;
};
