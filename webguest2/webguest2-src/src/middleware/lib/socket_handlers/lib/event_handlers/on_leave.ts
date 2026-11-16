import { StoreType } from "../../../../../store";
import * as actions from "../../../../../actions";

/**
 * Called on member has left a room
 * @param store
 */
export const onLeave = (store: StoreType) => (roomName: string, peerProps: { id: string }) => {
  const state = store.getState();
  state.peers.forEach(p => {
    if (p.id === peerProps.id) p.end();
  });
  store.dispatch(actions.logMessage("on_leave", { roomName, peerProps }));
};
