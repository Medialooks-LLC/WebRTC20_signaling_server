import { PeerType } from "../webrtc/types";
import { Peer } from "../webrtc";
import { WorkingMode } from "../dto";

export const findPeer = (peers: Peer[], targetId: string, peerType: PeerType) =>
  peers.find(p => p.id === targetId && p.ptype === peerType && p.pc.connectionState !== "closed");

export const currentPeerType = (workingMode: WorkingMode) =>
  workingMode === WorkingMode.Preview ? "subscriber" : "publisher";

export const shouldRestart = (workingMode: WorkingMode, peerType: PeerType) =>
  peerType === currentPeerType(workingMode);
