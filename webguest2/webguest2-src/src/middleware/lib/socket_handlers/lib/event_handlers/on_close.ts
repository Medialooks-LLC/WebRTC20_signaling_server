import { StoreType } from "../../../../../store";
import { wsDisconnected } from "../../../../../actions";

/**
 * Called on WS connection closed
 * @param store
 */
export const onClose = (store: StoreType) => () => {
  store.dispatch(wsDisconnected());
};
