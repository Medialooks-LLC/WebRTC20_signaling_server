import { WEB_RTC_UPDATE_LOCAL_MEDIA_CONFIG } from "../constants";

export const updateLocalMediaConfig = (settings: object) => ({
  type: WEB_RTC_UPDATE_LOCAL_MEDIA_CONFIG,
  settings,
});
