import { WEB_RTC_SUPPORTED, WEB_RTC_UNSUPPORTED } from "../actions/constants";

export default (state = true, action: any) => {
  switch (action.type) {
    case WEB_RTC_SUPPORTED:
      return true;
    case WEB_RTC_UNSUPPORTED:
      return false;
    default:
      return state;
  }
};
