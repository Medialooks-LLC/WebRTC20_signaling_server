import {
  WEB_RTC_SET_LOCAL_MEDIA_STREAM_ERROR,
  WEB_RTC_SET_PREV_MEDIA_STREAM_CONSTRAINTS,
} from "../actions/constants";

export default (
  state: Readonly<MediaStreamConstraints> | null = null,
  action: Readonly<{ type: string; constraints: MediaStreamConstraints }>,
) => {
  switch (action.type) {
    case WEB_RTC_SET_PREV_MEDIA_STREAM_CONSTRAINTS:
      return action.constraints ? { ...state, ...action.constraints } : action.constraints;
    case WEB_RTC_SET_LOCAL_MEDIA_STREAM_ERROR:
      return null;
    default:
      return state;
  }
};
