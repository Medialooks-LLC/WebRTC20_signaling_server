import { createReducer } from "@reduxjs/toolkit";
import { setReadyToCall } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setReadyToCall, (state, action) => action.payload);
});
