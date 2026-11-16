import { DispatchType, WebRtcState } from "../../../store/type";
import { Peer } from "../../../webrtc";
import * as constants from "../constants";
import { createAction } from "@reduxjs/toolkit";

export const stopPeers = () => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const state = getState();
    state.peers.forEach((peer: Peer) => peer.end());
    dispatch({ type: constants.WEB_RTC_STOP_PEERS });
  };
};

export const addPeer = createAction<Peer>("peers/add");
export const removePeer = createAction<Peer>("peers/remove");

export const changeRemoteDescription = (peers: Peer[]) => (dispatch: DispatchType) => {
  peers.forEach(peer => peer.changeRemoteDescription());
  dispatch({
    type: "WEB_RTC_CHANGE_REMOTE_DESCRIPTION",
    peers,
  });
};
