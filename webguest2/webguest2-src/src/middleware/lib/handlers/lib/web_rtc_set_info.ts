import * as events from "../../../../webrtc/constants";
import _ from "lodash";
import { Socket } from "socket.io-client";
import { StoreType } from "../../../../store";
import { LocalPeerProps } from "../../../../dto";

export const onWebRtcSetInfo = (
  store: StoreType,
  action: { info: LocalPeerProps; callback?: () => void },
  socket?: Socket,
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { vidEncoder, audEncoder, ...info } = action.info;
  socket?.emit(events.PROPS_SET, { values: info }, action.callback ?? _.noop);
};
