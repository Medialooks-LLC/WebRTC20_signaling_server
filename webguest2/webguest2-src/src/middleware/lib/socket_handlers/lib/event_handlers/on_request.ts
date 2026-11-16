import { StoreType } from "../../../../../store";
import { controlMessageReceived, logMessage } from "../../../../../actions";
import { COMMAND } from "../../../../../webrtc/constants";

export const onRequest = (store: StoreType) => (
  message: Readonly<{ type: string; payload: any; command: any }>,
  cb: (error: string | null, payload: any) => void,
) => {
  if (Object.prototype.hasOwnProperty.apply(message, ["type"])) {
    switch (message.type) {
      case COMMAND:
        store.dispatch(controlMessageReceived(message, cb));
        break;
    }
  } else {
    store.dispatch(logMessage("Incorrect message format", { message }));
  }
};
