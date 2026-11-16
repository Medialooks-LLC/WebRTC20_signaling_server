import { WEB_RTC_ROOM_LEFT, WEB_RTC_SET_ROOM_NAME } from "../actions/constants";

export default (state = "", action: { type: string; roomName: string }) => {
  switch (action.type) {
    case WEB_RTC_SET_ROOM_NAME:
      return action.roomName;
    case WEB_RTC_ROOM_LEFT:
      return "";
    default:
      return state;
  }
};
