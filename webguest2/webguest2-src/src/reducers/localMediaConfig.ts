import { LocalMediaConfig } from "../dto";
import * as constants from "../actions/constants";

export default (
  state: LocalMediaConfig = { micOff: false, cameraMuted: false, autostart: true },
  action: any,
) => {
  switch (action.type) {
    case constants.WEB_RTC_UPDATE_LOCAL_MEDIA_CONFIG:
      return { ...state, ...action.settings };
    case constants.WEB_RTC_MIC_TOGGLED:
      return { ...state, micOff: action.muted };
    case constants.WEB_RTC_CAM_TOGGLED:
      return { ...state, cameraMuted: action.muted };
    default:
      return state;
  }
};
