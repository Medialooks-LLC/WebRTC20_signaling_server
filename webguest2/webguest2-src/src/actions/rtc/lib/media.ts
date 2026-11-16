import { setLocalPeerInfo } from "./setLocalPeerInfo";
import * as constants from "../constants";
import { DispatchType, WebRtcState } from "../../../store/type";
import { setAwaiting, setLoading } from "../../ui";
import { wsConnect } from "../../websockets";

export const setCameras = (cameras: MediaDeviceInfo[]) => ({
  type: constants.WEB_RTC_SET_CAMERAS,
  cameras,
});

export const setMics = (mics: MediaDeviceInfo[]) => ({
  type: constants.WEB_RTC_SET_MICS,
  mics,
});

export const setCodecs = (codecs: { mimeType: string }[]) => ({
  type: constants.WEB_RTC_SET_ENCODERS,
  codecs,
});

export const toggleMute = (muted: boolean) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const localStream = getState().localMediaStream;
    const audioTrack = localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !muted;
      dispatch({
        type: constants.WEB_RTC_MIC_TOGGLED,
        muted,
      });
    }
  };
};

export const toggleCamera = (muted: boolean) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    const localStream = getState().localMediaStream;
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !muted;
      dispatch({
        type: constants.WEB_RTC_CAM_TOGGLED,
        muted,
      });
    }
    // A disabled track still sends black frames, so tell the host explicitly whether there is a
    // picture (also "off" without any camera); it shows a "camera is off" placeholder instead.
    const camera = videoTrack && !muted ? "on" : "off";
    if (getState().localPeerInfo.camera !== camera) dispatch(setLocalPeerInfo({ camera }));
  };
};

export const setEmptyDevices = () => (dispatch: DispatchType) => {
  dispatch(setCameras([]));
  dispatch(setMics([]));
  dispatch(wsConnect());
  dispatch(setLoading(false));
  dispatch(setAwaiting(false));
};
