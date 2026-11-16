import { WEB_RTC_SET_CAMERAS } from "../actions/constants";

export default (
  state: MediaDeviceInfo[] = [],
  action: { type: string; cameras: MediaDeviceInfo[] },
) => {
  switch (action.type) {
    case WEB_RTC_SET_CAMERAS:
      return [...state, ...action.cameras];
    default:
      return state;
  }
};
