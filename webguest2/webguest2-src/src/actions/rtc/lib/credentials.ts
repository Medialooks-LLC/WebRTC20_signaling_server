import { DispatchType, WebRtcState } from "../../../store/type";
import * as constants from "../constants";
import { joinRoom } from "./room";
import { setLocalPeerInfo } from "./setLocalPeerInfo";
import { showNotification } from "../../support";
import i18n from "../../../i18n/i18n_config";
import { setShowBannerForm, setShowSecuredLinkSettings } from "../../ui";
import { GuestDisconnectedReason } from "../../../dto";
import { Peer } from "../../../webrtc";
import { accessId } from "../../../helpers";
import { createAction } from "@reduxjs/toolkit";

export const setCredentials = (guestLogin: string, guestPassword: string) => {
  return (dispatch: DispatchType) => {
    const creds: { [url: string]: { login: string; password: string } } = localStorage.credentials
      ? JSON.parse(localStorage.credentials)
      : {};
    creds[accessId()] = { login: guestLogin, password: guestPassword };
    localStorage.credentials = JSON.stringify(creds);
    dispatch({
      type: constants.WEB_RTC_SET_CREDENTIALS,
      guestLogin,
      guestPassword,
    });
    dispatch(
      setLocalPeerInfo(
        {
          // eslint-disable-next-line @typescript-eslint/camelcase
          guest_login: guestLogin,
          // eslint-disable-next-line @typescript-eslint/camelcase
          guest_password: guestPassword,
        },
        () => {
          dispatch(joinRoom());
        },
      ),
    );
  };
};

export const clearCredentials = () => {
  return (dispatch: DispatchType) => {
    const credentials = localStorage.credentials ? JSON.parse(localStorage.credentials) : {};
    delete credentials[accessId()];
    if (Object.keys(credentials).length === 0) localStorage.removeItem("credentials");
    else localStorage.credentials = JSON.stringify(credentials);
    dispatch({
      type: constants.WEB_RTC_CLEAR_CREDENTIALS,
    });
  };
};

const errorReason = (reason: GuestDisconnectedReason, errorName?: string) => {
  if (reason === GuestDisconnectedReason.AuthValidateConnectionFailed) {
    return `${reason}.${errorName}`;
  } else {
    return reason;
  }
};

export const connectionRejected = (
  disconnectReason: GuestDisconnectedReason,
  errorName?: string,
) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    dispatch(clearCredentials());
    const reason = errorReason(disconnectReason, errorName);
    let notification = i18n.t(`securedClient.disconnectReasons.${reason}`);
    const state = getState();
    const localMediaSettings = state.localMediaConfig;
    if (reason === GuestDisconnectedReason.DuplicatedName) {
      notification = notification.replace("[name]", state.generalSettings.name ?? "");
    }
    showNotification(i18n.t("errors.connectivity.title"), notification);
    if (
      localMediaSettings.autostart &&
      ![
        GuestDisconnectedReason.AuthValidateConnectionFailed,
        GuestDisconnectedReason.MaxConnectionsExceeded,
      ].includes(reason as GuestDisconnectedReason)
    ) {
      if (state.securedPeer) dispatch(setShowSecuredLinkSettings(true));
      else dispatch(setShowBannerForm(true));
    }
    state.peers.forEach(p => p.end(false));
  };
};

export const setGuestLogin = (guestLogin: string) => ({
  type: constants.WEB_RTC_SET_GUEST_LOGIN,
  guestLogin,
});

export const setSecuredPeer = createAction<Peer>("secured-peer/set");
