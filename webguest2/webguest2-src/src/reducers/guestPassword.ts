import {
  WEB_RTC_CLEAR_CREDENTIALS,
  WEB_RTC_SET_CREDENTIALS,
  WEB_RTC_SET_GUEST_PASSWORD,
} from "../actions/constants";

export default (state = "", action: { type: string; guestPassword: string }) => {
  switch (action.type) {
    case WEB_RTC_SET_CREDENTIALS:
    case WEB_RTC_SET_GUEST_PASSWORD:
      return action.guestPassword;
    case WEB_RTC_CLEAR_CREDENTIALS:
      return "";
    default:
      return state;
  }
};
