import { createReducer } from "@reduxjs/toolkit";
import { setLocalStreamMain } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setLocalStreamMain, (state, action) => action.payload);
});
