import { createReducer } from "@reduxjs/toolkit";
import { setTargetId } from "../actions";

export default createReducer<string>("", builder => {
  builder.addCase(setTargetId, (state, action) => action.payload);
});
