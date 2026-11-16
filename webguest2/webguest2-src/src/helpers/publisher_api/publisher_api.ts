import * as events from "../../webrtc/constants";
import * as constants from "../../actions/constants";

export const actionType = (command: Readonly<{ type: string }>) => {
  switch (command.type) {
    case events.CONTROL_GET:
      return constants.WEB_GUEST_CONTROL_GET;
    case events.CONTROL_SET:
      return constants.WEB_GUEST_CONTROL_SET;
    case events.GUEST_DISCONNECTED:
      return constants.WEB_GUEST_GUEST_DISCONNECTED;
    default:
      return constants.WEB_GUEST_UNSUPPORTED_COMMAND;
  }
};
