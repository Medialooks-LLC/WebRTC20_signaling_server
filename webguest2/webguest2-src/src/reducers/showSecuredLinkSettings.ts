import { createReducer } from "@reduxjs/toolkit";
import { setShowSecuredLinkSettings } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setShowSecuredLinkSettings, (state, action) => action.payload);
});
