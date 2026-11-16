import * as constants from "./constants";
import { showNotification } from "../support";
import { DispatchType, WebRtcState } from "../../store/type";
import i18n from "../../i18n/i18n_config";
import { createAction } from "@reduxjs/toolkit";

export const setLoading = createAction<boolean>("ui/loading");

export const setAwaiting = createAction<boolean>("ui/awaiting");

export const setOnline = createAction<boolean>("ui/online");

export const setHasInternet = (hasInternet: boolean) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const hasWebRTC = getState().hasWebRTC;
    if (hasWebRTC && !hasInternet) {
      showNotification(i18n.t("errors.signaling.title"), i18n.t("errors.signaling.message"));
    }
    dispatch({
      type: constants.UI_SET_HAS_INTERNET,
      hasInternet,
    });
  };
};

export const setNotAuthorized = (error?: Error) => {
  return () => {
    let message = i18n.t("errors.unauthorized.message");
    if (error) message += `: ${error.message}`;
    showNotification(i18n.t("errors.unauthorized.title"), message);
  };
};

export const setHasWebRTC = (hasWebRTC: boolean) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const hasInternet = getState().hasInternet;
    if (hasWebRTC && !hasInternet) {
      showNotification(i18n.t("errors.signaling.title"), i18n.t("errors.signaling.message"));
    }
    dispatch({
      type: constants.UI_SET_HAS_WEB_RTC,
      hasWebRTC,
    });
  };
};

export const setLocalStreamMain = createAction<boolean>("ui/local-stream-main");

export const setShowSecuredLinkSettings = createAction<boolean>("ui/show-secured-link");

export const setShowBannerForm = createAction<boolean>("ui/show-banner");

export const setRemoteAudioMuted = createAction<boolean>("ui/remote-audio-muted");
