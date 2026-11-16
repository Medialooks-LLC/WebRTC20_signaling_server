import { StoreType } from "../../../../../store";
import { peerPropsSet } from "../../../../../actions/rtc/lib/peerProps";

export const onPropsSet = (store: StoreType) => (peerProps: any) => {
  store.dispatch(peerPropsSet(peerProps));
};
