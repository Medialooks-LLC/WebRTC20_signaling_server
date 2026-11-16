import { createReducer } from "@reduxjs/toolkit";
import { setAutoJoin } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setAutoJoin, (state, action) => action.payload);
});
