import { StoreType } from "../../../../../store";
import { wsConnectError } from "../../../../../actions";

/**
 * Called on WS connect error
 * @param store Redux Store
 */
export const onConnectError = (store: StoreType) => (
  error: Error & { data?: { event: string } },
) => {
  store.dispatch(wsConnectError(error));
};
