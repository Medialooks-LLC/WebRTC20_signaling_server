import { createReducer } from "@reduxjs/toolkit";
import { changeSoundLevel } from "../actions";

export default createReducer<number>(0, builder => {
  builder.addCase(changeSoundLevel, (_state, action) => action.payload);
});
