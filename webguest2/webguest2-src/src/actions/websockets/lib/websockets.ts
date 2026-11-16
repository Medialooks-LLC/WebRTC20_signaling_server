import { DispatchType, WebRtcState } from "../../../store/type";
import { setHasInternet, setNotAuthorized } from "../../ui";
import * as actions from "../../index";
import * as constants from "../constants";
import { iceServerUpdate } from "../../../lib";

export const wsConnect = () => ({
  type: constants.WS_CONNECT,
});

export const wsConnecting = (host?: string) => ({ type: constants.WS_CONNECTING, host });

export const wsConnected = () => (dispatch: DispatchType) => {
  dispatch(actions.setHasInternet(true));
  dispatch({ type: constants.WS_CONNECTED });
  dispatch(actions.testReadiness());
};

export const wsConnectionInfo = (connectionInfo: any) => (
  dispatch: DispatchType,
  getState: () => WebRtcState,
) => {
  const state = getState();
  dispatch(
    actions.setIceServers(
      iceServerUpdate(connectionInfo.server_metadata, state.peerConnectionConfig?.iceServers),
    ),
  );
  dispatch({
    type: constants.WS_CONNECTION_INFO,
    connectionInfo,
  });
};

export const wsDisconnected = () => ({ type: constants.WS_DISCONNECTED });

export const wsConnectError = (error: Error & { data?: { event: string } }) => (
  dispatch: DispatchType,
) => {
  if (error.data?.event === "not_authorized") {
    dispatch(setNotAuthorized(error));
  } else {
    dispatch(setHasInternet(false));
  }
  dispatch({ type: constants.WS_CONNECT_ERROR, error });
};

export const wsConnectTimeout = (error: any) => (dispatch: DispatchType) => {
  dispatch(setHasInternet(false));
  dispatch({ type: constants.WS_CONNECT_TIMEOUT, error });
};
