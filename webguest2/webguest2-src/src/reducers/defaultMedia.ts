import { WEB_RTC_SET_DEFAULT_MEDIA_CONSTRAINTS } from "../actions/constants";

export default (
  state: Readonly<{ video: boolean; audio: boolean }> = { video: true, audio: false },
  action: Readonly<{ type: string; constraints: Readonly<{ video: boolean; audio: boolean }> }>,
) => {
  switch (action.type) {
    case WEB_RTC_SET_DEFAULT_MEDIA_CONSTRAINTS:
      return { ...state, ...action.constraints };
    default:
      return state;
  }
};
