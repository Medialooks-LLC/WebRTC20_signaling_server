import { WEB_RTC_UPDATE_MEDIA_CONSTRAINTS } from "../actions/constants";

export default (
  state: Readonly<MediaStreamConstraints> = { video: false, audio: false },
  action: Readonly<{ type: string; constraints: MediaStreamConstraints }>,
) => {
  switch (action.type) {
    case WEB_RTC_UPDATE_MEDIA_CONSTRAINTS:
      return { ...state, ...action.constraints };
    default:
      return state;
  }
};
