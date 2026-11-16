import { WEB_RTC_ADD_MESSAGE } from "../actions/constants";

export default (state: string[] = [], action: { type: string; message?: string }) => {
  switch (action.type) {
    case WEB_RTC_ADD_MESSAGE:
      return [...state, action.message];
    default:
      return state;
  }
};
