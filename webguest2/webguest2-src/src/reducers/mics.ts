import { WEB_RTC_SET_MICS } from "../actions/constants";

export default (
  state: MediaDeviceInfo[] = [],
  action: { type: string; mics: MediaDeviceInfo[] },
) => {
  switch (action.type) {
    case WEB_RTC_SET_MICS:
      return [...state, ...action.mics];
    default:
      return state;
  }
};
