import * as constants from "../constants";

export const setSignalingUrl = (url: string) => ({
  type: constants.WEB_RTC_SET_SIGNALING_URL,
  url,
});
