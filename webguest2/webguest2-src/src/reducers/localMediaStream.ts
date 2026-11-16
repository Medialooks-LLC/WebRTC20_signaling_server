import { WEB_RTC_SET_LOCAL_MEDIA_STREAM } from "../actions/constants";

export default (state: MediaStream | null = null, action: any) => {
  switch (action.type) {
    case WEB_RTC_SET_LOCAL_MEDIA_STREAM:
      return action.stream;
    default:
      return state;
  }
};
