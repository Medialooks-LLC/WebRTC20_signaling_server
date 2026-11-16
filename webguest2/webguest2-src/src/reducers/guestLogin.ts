import * as constants from "../actions/constants";

export default (state = null, action: { type: string; guestLogin: string }) => {
  switch (action.type) {
    case constants.WEB_RTC_SET_CREDENTIALS:
    case constants.WEB_RTC_SET_GUEST_LOGIN:
      return action.guestLogin;
    case constants.WEB_RTC_CLEAR_CREDENTIALS:
      return "";
    default:
      return state;
  }
};
