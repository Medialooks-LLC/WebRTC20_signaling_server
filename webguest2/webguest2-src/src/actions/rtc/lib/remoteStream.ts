import { WEB_RTC_SET_REMOTE_MEDIA_STREAM } from "../constants";

export const setRemoteMediaStream = (stream: MediaStream | null) => ({
  type: WEB_RTC_SET_REMOTE_MEDIA_STREAM,
  stream,
});
