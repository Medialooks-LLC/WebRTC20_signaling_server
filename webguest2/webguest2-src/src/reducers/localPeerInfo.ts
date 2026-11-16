import { LocalPeerProps } from "../dto";
import { WEB_RTC_SET_INFO } from "../actions/constants";

export default (
  state: LocalPeerProps = { submode: "" },
  action: { type: string; info: LocalPeerProps },
) => {
  switch (action.type) {
    case WEB_RTC_SET_INFO:
      return { ...state, ...action.info };
    default:
      return state;
  }
};
