import { WEB_RTC_SET_WORKING_MODE } from "../constants";
import { WorkingMode } from "../../../dto";
import { createAction } from "@reduxjs/toolkit";

export const setWorkingMode = (workingMode: WorkingMode) => ({
  type: WEB_RTC_SET_WORKING_MODE,
  workingMode,
});

export const setAutoJoin = createAction<boolean>("connection/auto-join");
