import { createReducer } from "@reduxjs/toolkit";
import { setMaxAudioChannels } from "../actions";

export default createReducer<number>(0, builder => {
  builder.addCase(setMaxAudioChannels, (state, action) => action.payload);
});
