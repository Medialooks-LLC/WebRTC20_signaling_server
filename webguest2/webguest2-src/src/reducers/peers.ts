import { Peer } from "../webrtc";
import { createReducer } from "@reduxjs/toolkit";
import { addPeer, removePeer } from "../actions";

export default createReducer<Peer[]>([], builder => {
  builder.addCase(addPeer, (state, action) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    window.peers = [...state, action.payload];
    return [...state, action.payload];
  });
  builder.addCase(removePeer, (state, action) => {
    const idx = state.findIndex(p => p === action.payload);
    if (idx < 0) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      window.peers = state;
      return state;
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      window.peers = [...state.slice(0, idx), ...state.slice(idx + 1)];
      return [...state.slice(0, idx), ...state.slice(idx + 1)];
    }
  });
});
