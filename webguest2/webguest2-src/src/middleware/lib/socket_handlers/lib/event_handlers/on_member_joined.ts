import { StoreType } from "../../../../../store";
import { joinRoom, memberJoined } from "../../../../../actions";
import { currentPeerType, findPeer } from "../../../../../helpers";
import { WorkingMode } from "../../../../../dto";

/**
 * Called on member has joined a room
 * @param store
 */
export const onMemberJoined = (store: StoreType) => (
  roomName: string,
  member: { id: string; access_id: string; secured: string },
) => {
  store.dispatch(memberJoined(member));
  const state = store.getState();
  if (state.workingMode !== WorkingMode.Publisher && member.id === state.targetId) {
    const peer = findPeer(state.peers, state.targetId, currentPeerType(state.workingMode));
    if (!peer || (peer && peer.pc.iceConnectionState === "new")) store.dispatch(joinRoom());
  }
  // const peerType = state.workingMode === WorkingMode.Preview ? "subscriber" : "publisher";
  // let peer = findPeer(state.peers, state.targetId, peerType);
  // if (peer && peer.pc.iceConnectionState === "new") peer.run();
  // else if (!peer) {
  //   peer = createPeer({
  //     id: member.id,
  //     store: store,
  //     secure: member.secured === "true",
  //     ptype: peerType,
  //   }, 'onMemberJoined');
  //   peer.run();
  // }
};
