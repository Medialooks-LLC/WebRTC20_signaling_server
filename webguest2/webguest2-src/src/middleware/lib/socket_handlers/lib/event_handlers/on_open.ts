import { StoreType } from "../../../../../store";
import * as actions from "../../../../../actions";

/**
 * Called on WS connection open
 * @param store Redux store
 */
export const onOpen = (store: StoreType) => () => {
  store.dispatch(actions.wsConnected());
};
