import { createReducer } from "@reduxjs/toolkit";
import { setShowBannerForm } from "../actions";

export default createReducer<boolean>(false, builder => {
  builder.addCase(setShowBannerForm, (state, action) => action.payload);
});
