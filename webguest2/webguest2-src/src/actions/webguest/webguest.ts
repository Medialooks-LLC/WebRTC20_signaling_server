import { DispatchType } from "../../store/type";
import { actionType } from "../../helpers";
import { logMessage } from "../support";

export const controlMessageReceived = (
  message: Readonly<{ command: { type: string } }>,
  cb?: (error: any, payload: any) => void,
) => (dispatch: DispatchType) => {
  if (
    Object.prototype.hasOwnProperty.apply(message, ["command"]) &&
    Object.prototype.hasOwnProperty.apply(message.command, ["type"])
  ) {
    const type = actionType(message.command);
    dispatch({ type, message, cb });
  } else {
    dispatch(logMessage("Incorrect command format", { message }));
  }
};
