import { createReducer } from "@reduxjs/toolkit";
import { setIceServers } from "../actions";

//{ username: "user1", credential: "password1", urls: ["turn:nw-turn-eu.medialooks.com:3478"] }
// user1@password1:nw-turn-eu.medialooks.com:3478
const defaultState: { iceServers: RTCIceServer[] } = {
  iceServers: [
    {
      urls: process.env.REACT_APP_DEFAULT_STUN_URL
        ? [process.env.REACT_APP_DEFAULT_STUN_URL]
        : ["stun:stun.l.google.com:19302"],
    },
  ],
};

export default createReducer<{ iceServers: RTCIceServer[] }>({ ...defaultState }, builder => {
  builder.addCase(setIceServers, (state, action) => ({ iceServers: action.payload }));
});
