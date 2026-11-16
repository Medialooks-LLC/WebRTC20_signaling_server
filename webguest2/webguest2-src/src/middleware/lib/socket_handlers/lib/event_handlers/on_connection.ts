import { StoreType } from "../../../../../store";
import * as actions from "../../../../../actions";

/**
 * Called on WS connection info
 * @param store Redux store
 */
export const onConnection = (store: StoreType) => (connectionInfo: any) => {
  store.dispatch(actions.wsConnectionInfo(connectionInfo));
};
