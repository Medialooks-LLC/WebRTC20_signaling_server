import { StoreType } from "../../../../../store";
import { wsConnectTimeout } from "../../../../../actions";

/**
 * Called on WS connect timeout
 * @param store ReduxStore
 */
export const onConnectTimeout = (store: StoreType) => (error: any) => {
  store.dispatch(wsConnectTimeout(error));
};
