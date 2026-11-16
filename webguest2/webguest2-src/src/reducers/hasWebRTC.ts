import { UI_SET_HAS_WEB_RTC } from "../actions/constants";

export default (state = true, action: any) => {
  switch (action.type) {
    case UI_SET_HAS_WEB_RTC:
      return action.hasWebRTC;
    default:
      return state;
  }
};
