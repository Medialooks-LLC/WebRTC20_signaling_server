import { LocalPeerProps, SecuredPeerProps } from "../../../dto";
import { WEB_RTC_SET_INFO } from "../constants";

export const setLocalPeerInfo = (
  info:
    | SecuredPeerProps
    | LocalPeerProps
    | { audio_channels_mask: string }
    | { guest_login: string; guest_password: string }
    | {},
  callback?: () => void,
) => ({
  type: WEB_RTC_SET_INFO,
  info,
  callback,
});
