import * as constants from "../constants";
import { DispatchType, WebRtcState } from "../../../store/type";
import { showNotification } from "../../support";
import i18n from "../../../i18n/i18n_config";
import { ExactVideoConstraints } from "../../../middleware/lib/handlers/lib/types";
import { updateLocalStreamConstraints } from "./generalSettings";
import { setCodecs } from "./media";
import { testReadiness } from "./link";
import { WorkingMode } from "../../../dto";

export const setLocalMediaStream = (stream: MediaStream) => ({
  type: constants.WEB_RTC_SET_LOCAL_MEDIA_STREAM,
  stream,
});

export const setLocalMediaStreamError = (error: Error) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    let message = "";
    const state = getState();
    const constraints = state.media;
    if (typeof constraints.video === "object") {
      const video = constraints.video as ExactVideoConstraints;
      const videoInputLabel =
        state.cameras.find(cam => cam.deviceId === state.generalSettings.videoInput)?.label ??
        "unknown camera";
      if (video.width?.exact && video.height?.exact) {
        message = `Resolution of ${video.width.exact} x ${video.height.exact}`;
        if (video.frameRate?.exact) message += ` @ ${video.frameRate.exact} fps`;
      } else if (video.frameRate?.exact) {
        message = `Frame rate of ${video.frameRate.exact} fps`;
      }
      message += ` cannot be applied to ${videoInputLabel}`;
      if (error.message) message += `: ${error.message}`;
    } else {
      message = `Unable to get local media stream: ${error}`;
    }
    showNotification(i18n.t("errors.overconstrained.title"), message);
    dispatch({
      type: constants.WEB_RTC_SET_LOCAL_MEDIA_STREAM_ERROR,
      error,
    });
  };
};

export const processLocalMediaStream = (stream: MediaStream | null = null) => ({
  type: constants.WEB_RTC_PROCESS_LOCAL_MEDIA_STREAM,
  stream,
});

export const getLocalMediaStream = () => ({
  type: constants.WEB_RTC_GET_LOCAL_MEDIA_STREAM,
});

export const getLocalScreen = () => {
  return (dispatch: DispatchType) => {
    dispatch(updateLocalStreamConstraints({ video: true, audio: true }));
    dispatch({
      type: constants.WEB_RTC_GET_LOCAL_SCREEN,
    });
  };
};

export const switchLocalMediaDevice = (screenShare = false) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const state = getState();
    const localStream = state.localMediaStream;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
    if (screenShare) {
      dispatch(getLocalScreen());
    } else {
      dispatch(getLocalMediaStream());
    }
  };
};

export const getMediaDevices = () => ({
  type: constants.WEB_RTC_GET_MEDIA_DEVICES,
});

export const enumerateDevices = (defaultCam?: string, defaultMic?: string, screen?: boolean) => ({
  type: constants.WEB_RTC_ENUMERATE_DEVICES,
  defaultCam,
  defaultMic,
  screen,
});

export const initMedia = () => (dispatch: DispatchType) => {
  dispatch(setCodecs([{ mimeType: "VP9" }, { mimeType: "H264" }]));
  dispatch(getMediaDevices());
};

export const joinStream = () => (dispatch: DispatchType, getState: () => WebRtcState) => {
  const workingMode = getState().workingMode;
  const isDuplex = [WorkingMode.Duplex, WorkingMode.Publisher].includes(workingMode);
  const isStreamer = workingMode === WorkingMode.Streamer;
  const isPreview = workingMode === WorkingMode.Preview;
  const isSender = isDuplex || isStreamer;
  if (isSender) dispatch(initMedia());
  else if (isPreview) dispatch(testReadiness());
};
