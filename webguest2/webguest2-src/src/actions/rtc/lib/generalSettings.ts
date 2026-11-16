import { GeneralSettingsProps, LocalMediaConfig, WorkingMode } from "../../../dto";
import { DispatchType, WebRtcState } from "../../../store/type";
import { updateLocalMediaConfig } from "./mediaConstraints";
import { switchLocalMediaDevice } from "./localStream";
import { toggleCamera, toggleMute } from "./media";
import { changeRemoteDescription } from "./peers";
import { hasKey } from "../../../lib/hasKey";
import { prepareMediaConstraints } from "../../../webrtc/lib";
import { updateAudioChannelsSettings } from "./audioChannels";
import { prepareLocalPeerInfo } from "../../../helpers";
import { setLocalPeerInfo } from "./setLocalPeerInfo";
import * as constants from "../constants";
import {
  WEB_RTC_SET_DEFAULT_MEDIA_CONSTRAINTS,
  WEB_RTC_UPDATE_GENERAL_SETTINGS,
  WEB_RTC_UPDATE_MEDIA_CONSTRAINTS,
} from "../constants";

const fieldChanged = (
  fieldName: keyof GeneralSettingsProps,
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => fieldName in newSettings && newSettings[fieldName] !== oldSettings[fieldName];

export const audioInputChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("audioInput", newSettings, oldSettings);
};

export const videoInputChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("videoInput", newSettings, oldSettings);
};

export const resolutionChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("resolution", newSettings, oldSettings);
};

export const frameRateChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("frameRate", newSettings, oldSettings);
};

export const nameChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("name", newSettings, oldSettings);
};

export const locationChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("location", newSettings, oldSettings);
};

export const echoCancellationChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("audioEnhancements", newSettings, oldSettings);
};

export const videoEncoderChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("encoder", newSettings, oldSettings);
};

export const audioBitrateChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("audioBitrate", newSettings, oldSettings);
};

export const audioChannelsChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("audioChannels", newSettings, oldSettings);
};

export const otherChannelsChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("otherChannels", newSettings, oldSettings);
};

export const videoBitrateChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) => {
  return fieldChanged("videoBitrate", newSettings, oldSettings);
};

export const deviceSettingChanged = (
  newSettings: GeneralSettingsProps,
  oldSettings: GeneralSettingsProps,
) =>
  audioInputChanged(newSettings, oldSettings) ||
  videoInputChanged(newSettings, oldSettings) ||
  resolutionChanged(newSettings, oldSettings) ||
  frameRateChanged(newSettings, oldSettings) ||
  echoCancellationChanged(newSettings, oldSettings);

const storeGeneralSettings = (settings: GeneralSettingsProps, saveDeviceIds: boolean) => {
  Object.keys(settings).forEach(k => {
    const save = saveDeviceIds || !["videoInput", "audioInput"].includes(k);
    if (save && hasKey(settings, k) && typeof settings[k] !== "undefined") {
      localStorage.setItem(k, settings[k] as string);
    }
  });
};

export const saveMediaConstraints = (constraints: MediaStreamConstraints | null) => ({
  type: constants.WEB_RTC_SET_PREV_MEDIA_STREAM_CONSTRAINTS,
  constraints,
});

export const setIgnorePrevConstraints = (ignore: boolean) => ({
  type: constants.WEB_RTC_SET_IGNORE_PREV_CONSTRAINTS,
  ignore,
});

export const updateLocalStreamConstraints = (constraints: MediaStreamConstraints) => (
  dispatch: DispatchType,
  getState: () => WebRtcState,
) => {
  const state = getState();
  dispatch(saveMediaConstraints(state.media));
  dispatch({
    type: WEB_RTC_UPDATE_MEDIA_CONSTRAINTS,
    constraints,
  });
};

export const setDefaultLocalStreamConstraints = (constraints: MediaStreamConstraints) => (
  dispatch: DispatchType,
) => {
  dispatch({
    type: WEB_RTC_SET_DEFAULT_MEDIA_CONSTRAINTS,
    constraints,
  });
};

export const updateGeneralSettings = (
  settings: GeneralSettingsProps,
  saveDeviceIds = false,
  media?: MediaStreamConstraints | null,
) => {
  return (dispatch: DispatchType, getState: () => WebRtcState) => {
    storeGeneralSettings(settings, saveDeviceIds);
    const state = getState();
    const newSettings = settings;
    const oldSettings = state.generalSettings;
    const workingMode = state.workingMode;
    const defaultMedia = state.defaultMedia;
    dispatch({
      type: WEB_RTC_UPDATE_GENERAL_SETTINGS,
      settings: newSettings,
    });
    if (
      media ||
      (workingMode !== WorkingMode.Preview && deviceSettingChanged(newSettings, oldSettings))
    ) {
      const updatedSettings = getState().generalSettings;
      const streamConstraints =
        media ??
        prepareMediaConstraints(
          defaultMedia.video,
          defaultMedia.audio,
          updatedSettings.resolution,
          updatedSettings.videoInput,
          updatedSettings.audioInput,
          updatedSettings.frameRate,
          updatedSettings.audioEnhancements,
        );
      dispatch(updateLocalStreamConstraints(streamConstraints));
    }
    if (
      audioChannelsChanged(newSettings, oldSettings) ||
      otherChannelsChanged(newSettings, oldSettings)
    ) {
      dispatch(
        updateAudioChannelsSettings(
          newSettings.audioChannels ?? oldSettings.audioChannels,
          newSettings.otherChannels ?? oldSettings.otherChannels,
        ),
      );
    }
    if (
      audioBitrateChanged(newSettings, oldSettings) ||
      videoBitrateChanged(newSettings, oldSettings) ||
      videoEncoderChanged(newSettings, oldSettings) ||
      frameRateChanged(newSettings, oldSettings) ||
      nameChanged(newSettings, oldSettings) ||
      locationChanged(newSettings, oldSettings)
    ) {
      const localPeerInfo = prepareLocalPeerInfo({
        generalSettings: newSettings,
        workingMode,
      });
      if (localPeerInfo) dispatch(setLocalPeerInfo(localPeerInfo));
    }
  };
};

export const updateDeviceSettings = (newSettings: GeneralSettingsProps) => {
  return (dispatch: DispatchType) => {
    dispatch(updateGeneralSettings(newSettings));
    dispatch(switchLocalMediaDevice(newSettings.videoInput === "screenShare"));
  };
};

const updateNonDeviceSettings = (newSettings: GeneralSettingsProps) => (
  dispatch: DispatchType,
  getState: () => WebRtcState,
) => {
  const state = getState();
  dispatch(updateGeneralSettings(newSettings));
  if (
    audioBitrateChanged(newSettings, state.generalSettings) ||
    videoBitrateChanged(newSettings, state.generalSettings) ||
    videoEncoderChanged(newSettings, state.generalSettings)
  ) {
    dispatch(changeRemoteDescription(state.peers));
  }
};

const processSettings = (
  newSettings: GeneralSettingsProps,
  localMediaSettings?: LocalMediaConfig,
) => (dispatch: DispatchType, getState: () => WebRtcState) => {
  if (localMediaSettings) dispatch(updateLocalMediaConfig(localMediaSettings));
  const state = getState();
  const oldSettings = state.generalSettings;
  if (deviceSettingChanged(newSettings, oldSettings)) {
    dispatch(updateDeviceSettings(newSettings));
  } else {
    if (localMediaSettings) {
      dispatch(toggleCamera(localMediaSettings.cameraMuted));
      dispatch(toggleMute(localMediaSettings.micOff));
    }
    dispatch(updateNonDeviceSettings(newSettings));
  }
};

export const remoteSettingsChanged = (
  generalSettings: GeneralSettingsProps,
  localMediaSettings: LocalMediaConfig,
) => processSettings(generalSettings, localMediaSettings);

export const settingsChanged = (generalSettings: GeneralSettingsProps) =>
  processSettings(generalSettings);
