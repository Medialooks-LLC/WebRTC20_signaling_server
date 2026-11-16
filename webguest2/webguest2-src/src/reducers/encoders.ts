import { WEB_RTC_SET_ENCODERS } from "../actions/constants";

export default (
  state: { mimeType: string }[] = [],
  action: { type: string; codecs: { mimeType: string }[] },
) => {
  switch (action.type) {
    case WEB_RTC_SET_ENCODERS:
      return [...state, ...action.codecs];
    default:
      return state;
  }
};
