import * as constants from "../actions/constants";

export default (state = false, action: { type: string }) => {
  switch (action.type) {
    case constants.WS_CONNECTED:
      return true;
    case constants.WS_DISCONNECTED:
    case constants.WS_CONNECT_ERROR:
    case constants.WS_CONNECT_TIMEOUT:
      return false;
    default:
      return state;
  }
};
