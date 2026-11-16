import { WEB_RTC_CLEAR_SIGNALING_URL, WEB_RTC_SET_SIGNALING_URL } from "../actions/constants";

export default (state = "", action: { type: string; url: string }) => {
  switch (action.type) {
    case WEB_RTC_SET_SIGNALING_URL:
      return action.url;
    case WEB_RTC_CLEAR_SIGNALING_URL:
      return "";
    default:
      return state;
  }
};
