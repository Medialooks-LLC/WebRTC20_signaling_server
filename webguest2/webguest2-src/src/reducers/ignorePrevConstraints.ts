import { WEB_RTC_SET_IGNORE_PREV_CONSTRAINTS } from "../actions/constants";

export default (state = false, action: Readonly<{ type: string; ignore: boolean }>) => {
  switch (action.type) {
    case WEB_RTC_SET_IGNORE_PREV_CONSTRAINTS:
      return action.ignore;
    default:
      return state;
  }
};
