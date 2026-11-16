import { createReducer } from "@reduxjs/toolkit";
import { setOnline } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setOnline, (state, action) => action.payload);
});
