import { WEB_RTC_SET_WORKING_MODE } from "../actions/constants";
import { WorkingMode } from "../dto";

export default (state: WorkingMode = WorkingMode.Preview, action: any) => {
  switch (action.type) {
    case WEB_RTC_SET_WORKING_MODE:
      return action.workingMode;
    default:
      return state;
  }
};
