import {
  audioBitRates,
  videoBitRates,
  GeneralSettingsProps,
  LocalMediaConfig,
  RemoteSettingProps,
  LocalMedia,
  GeneralSettings,
} from "../../dto";

import { en } from "../../i18n/locale/en_source";
import i18n from "../../i18n/i18n_config";
import { resolutions } from "../../config/WebRTC";
import { range } from "lodash";
import { WebRtcState } from "../../store/type";
import { frameRates } from "../../dto";
import { hasKey } from "../../lib/hasKey";

const settingOptions = (fieldName: string, state: WebRtcState) => {
  let options: { value: string | boolean | number; label: string }[] = [];
  switch (fieldName) {
    case "videoBitrate":
      options = videoBitRates.map(vbr => ({ value: vbr, label: vbr }));
      break;
    case "audioBitrate":
      options = audioBitRates.map(abr => ({ value: abr, label: abr }));
      break;
    case "frameRate":
      options = frameRates.map(fps => ({ value: fps, label: `${fps} FPS` }));
      break;
    case "encoder":
      options = state.encoders.map((e: { mimeType: string }) => ({
        value: e.mimeType,
        label: e.mimeType,
      }));
      break;
    case "resolution":
      options = Object.keys(resolutions)
        .filter(r => r !== "default")
        .map(k => ({ value: k, label: k }));
      break;
    case "audioChannels":
      options = range(1, state.maxAudioChannels + 1, 2).map((channel, i) => {
        return { value: i, label: `${channel}, ${channel + 1}` };
      });
      break;
    case "audioInput":
      options = state.mics.map((c: MediaDeviceInfo) => ({ value: c.deviceId, label: c.label }));
      break;
    case "videoInput":
      options = state.cameras.map((c: MediaDeviceInfo) => ({
        value: c.deviceId,
        label: c.label,
      }));
      break;
  }
  return options;
};

type SettingValue = string | boolean | number | undefined;
const settingValue = (fieldName: string, state: WebRtcState): SettingValue => {
  if (hasKey(state.generalSettings, fieldName))
    return state.generalSettings[fieldName] as SettingValue;
  else if (hasKey(state.localMediaConfig, fieldName))
    return state.localMediaConfig[fieldName] as SettingValue;
  else if (hasKey(state, fieldName)) return state[fieldName] as SettingValue;
};

export const serializeSettings = (state: WebRtcState) => {
  const settings: RemoteSettingProps[] = [];
  Object.keys(en.remoteSettings).forEach(fieldName => {
    let setting: RemoteSettingProps = {
      name: i18n.t(`remoteSettings.${fieldName}`),
      fieldName: fieldName,
      value: settingValue(fieldName, state),
    };
    const options = settingOptions(fieldName, state);
    if (options.length > 0) {
      setting = {
        ...setting,
        options,
      };
    }
    settings.push(setting);
  });
  return settings;
};

type TopLevelSettings = { volume?: number };
export const deserializeSettings = (
  settings: RemoteSettingProps[],
): [GeneralSettingsProps, LocalMediaConfig, TopLevelSettings] => {
  const generalSettings: { [p in keyof GeneralSettings]: any } = {};
  const localMediaConfig: Partial<LocalMedia> = {};
  const topLevelSettings: TopLevelSettings = {};
  settings.forEach(setting => {
    if (["cameraMuted", "micOff"].indexOf(setting.fieldName) >= 0) {
      localMediaConfig[setting.fieldName as keyof LocalMedia] = setting.value as boolean;
    } else if (setting.fieldName === "volume") {
      topLevelSettings.volume = setting.value as number;
    } else {
      generalSettings[setting.fieldName as keyof GeneralSettings] = setting.value;
    }
  });
  return [
    generalSettings as GeneralSettingsProps,
    localMediaConfig as LocalMediaConfig,
    topLevelSettings,
  ];
};
