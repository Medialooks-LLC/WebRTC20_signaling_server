import { createReducer } from "@reduxjs/toolkit";
import { setLoading } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setLoading, (state, action) => action.payload);
});
