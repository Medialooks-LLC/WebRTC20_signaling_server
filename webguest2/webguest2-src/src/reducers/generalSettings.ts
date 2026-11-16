import { GeneralSettingsProps } from "../dto";
import { WEB_RTC_UPDATE_GENERAL_SETTINGS } from "../actions/constants";

export default (state: GeneralSettingsProps = {}, action: any) => {
  switch (action.type) {
    case WEB_RTC_UPDATE_GENERAL_SETTINGS:
      return { ...state, ...action.settings };
    default:
      return state;
  }
};
