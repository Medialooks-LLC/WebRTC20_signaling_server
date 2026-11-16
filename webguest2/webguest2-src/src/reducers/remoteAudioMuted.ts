import { createReducer } from "@reduxjs/toolkit";
import { setRemoteAudioMuted } from "../actions";

export default createReducer<boolean>(true, builder => {
  builder.addCase(setRemoteAudioMuted, (state, action) => action.payload);
});
