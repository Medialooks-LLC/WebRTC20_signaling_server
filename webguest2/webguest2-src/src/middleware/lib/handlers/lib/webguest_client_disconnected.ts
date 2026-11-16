import { connectionRejected } from "../../../../actions";
import { GuestDisconnectedReason } from "../../../../dto";
import { StoreType } from "../../../../store";

export const onWebguestClientDisconnected = (
  store: StoreType,
  {
    message,
  }: {
    message: { command?: { reason: GuestDisconnectedReason; error_name?: string }; from: string };
  },
) => {
  const { command } = message;
  const { reason, error_name: errorName } = command ?? { reason: GuestDisconnectedReason.Unknown };
  store.dispatch(connectionRejected(reason, errorName));
};
