import { Peer } from "../webrtc";
import { createReducer } from "@reduxjs/toolkit";
import { setSecuredPeer } from "../actions";

export default createReducer<Peer | null>(null, builder => {
  builder.addCase(setSecuredPeer, (state, action) => action.payload);
});
