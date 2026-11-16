import { createReducer } from "@reduxjs/toolkit";
import { setAwaiting } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setAwaiting, (state, action) => action.payload);
});
