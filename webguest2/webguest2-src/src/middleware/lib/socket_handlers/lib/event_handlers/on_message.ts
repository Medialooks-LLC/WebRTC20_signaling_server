import { StoreType } from "../../../../../store";
import { controlMessageReceived, logMessage, messageReceived } from "../../../../../actions";
import { COMMAND } from "../../../../../webrtc/constants";

export const onMessage = (store: StoreType) => (
  message: Readonly<{ type: string; payload: any; command: any }>,
) => {
  if (Object.prototype.hasOwnProperty.apply(message, ["type"])) {
    switch (message.type) {
      case COMMAND:
        store.dispatch(controlMessageReceived(message));
        break;
      default:
        store.dispatch(messageReceived(message));
        break;
    }
  } else {
    store.dispatch(logMessage("Incorrect message format", { message }));
  }
};
