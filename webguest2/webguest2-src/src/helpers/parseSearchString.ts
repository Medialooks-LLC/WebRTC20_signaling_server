import { GeneralSettings, GeneralSettingsProps, LocalMedia, LocalMediaConfig } from "../dto";
import qs from "qs";
import {
  DEFAULT_AUDIO_BITRATE,
  DEFAULT_FRAME_RATE,
  DEFAULT_LOCATION,
  DEFAULT_MIRRORING,
  DEFAULT_SELFIE,
  DEFAULT_VIDEO_BITRATE,
  DEFAULT_VIDEO_ENCODER,
} from "../config/DefaultParams";
import { nanoid } from "@reduxjs/toolkit";
import { getPageRoute } from "./pageRoute";

const defaultValues: Required<Omit<
  GeneralSettingsProps,
  | "audioInput"
  | "videoInput"
  | "audioChannels"
  | "otherChannels"
  | "screenShare"
  | "id"
  | "resolution"
>> = {
  name: `Guest${Math.trunc(Math.random() * 10000)}`,
  location: DEFAULT_LOCATION,
  videoBitrate: DEFAULT_VIDEO_BITRATE,
  audioBitrate: DEFAULT_AUDIO_BITRATE,
  encoder: DEFAULT_VIDEO_ENCODER,
  mirroring: DEFAULT_MIRRORING,
  selfie: DEFAULT_SELFIE,
  frameRate: DEFAULT_FRAME_RATE,
  audioEnhancements: true,
};

const parseBool = (val?: string) => Boolean(val && ["1", "true", "t"].includes(val));

const initLocalStorage = (query: qs.ParsedQs) => {
  if (!localStorage.name || localStorage.name.length === 0) {
    localStorage.name = defaultValues.name;
  }
  if (!localStorage.location || localStorage.location.length === 0) {
    localStorage.location = defaultValues.location;
  }

  if (query.guest_login) {
    const creds = localStorage.credentials ? JSON.parse(localStorage.credentials) : {};
    const id = accessId();
    creds[id] = { ...(creds[id] ?? {}), login: query.guest_login };
  }
};

const storedResolution = () => {
  const resolution = localStorage.resolution;
  if (resolution === "undefined" || resolution === "default") return;
  return resolution;
};

const frameRate = (query: qs.ParsedQs): number => {
  if (query.frameRate) {
    return parseInt(query.frameRate as string);
  } else if (localStorage.frameRate && new RegExp(/\d+/).test(localStorage.frameRate)) {
    return parseInt(localStorage.frameRate);
  } else return defaultValues.frameRate;
};

const storedField = (fieldName: string) => {
  if (localStorage[fieldName] === "undefined" || localStorage[fieldName] === "null") return;
  return localStorage[fieldName];
};

const sessionField = (fieldName: string) => {
  if (sessionStorage[fieldName] === "undefined" || sessionStorage[fieldName] === "null") return;
  return sessionStorage[fieldName];
};

const storedId = () => sessionField("id");

const storedSelfie = (): string | undefined => {
  return storedField("selfie");
};

const storedMirroring = (): string | undefined => {
  return storedField("mirroring");
};

const storedAudioEnhancements = (): string | undefined => {
  return storedField("audioEnhancements");
};

const id = () => storedId() ?? nanoid();

const selfie = (query: qs.ParsedQs): boolean => {
  if (query.selfie) {
    return parseBool(query.selfie as string);
  } else if (storedSelfie()) {
    return parseBool(storedSelfie());
  } else {
    return defaultValues.selfie;
  }
};

const mirroring = (query: qs.ParsedQs): boolean => {
  if (query.mirroring) {
    return parseBool(query.mirroring as string);
  } else if (storedMirroring()) {
    return parseBool(storedMirroring());
  } else {
    return defaultValues.mirroring;
  }
};

const audioEnhancements = (query: qs.ParsedQs): boolean => {
  if (query.audioEnhancements) {
    return parseBool(query.audioEnhancements as string);
  } else if (storedAudioEnhancements()) {
    return parseBool(storedAudioEnhancements());
  } else {
    return defaultValues.audioEnhancements;
  }
};

const autoJoin = (query: qs.ParsedQs): boolean => {
  if (query.autojoin) {
    return parseBool(query.autojoin as string);
  } else {
    return false;
  }
};

export const accessId = (): string => {
  return getPageRoute().targetId;
};

const storedCredentials = () => {
  const credentials = localStorage.credentials ? JSON.parse(localStorage.credentials) : {};
  const currentCreds = credentials[accessId()] ?? {};
  const login = currentCreds.login;
  const password = currentCreds.password;
  return login && login.length > 0 && password && password.length > 0 ? [login, password] : [];
};

interface ParsedProps {
  generalSettings: GeneralSettingsProps;
  localMediaConfig: LocalMediaConfig;
  autoJoin: boolean;
  guestLogin?: string;
  guestPassword?: string;
  remoteAudioMuted: boolean;
  signalingUrl?: string;
}

const parseGeneralSettings = (query: qs.ParsedQs): GeneralSettings => {
  const generalSettings: GeneralSettings = {
    name: query.name ?? localStorage.name,
    location: query.location ?? localStorage.location,
    videoBitrate:
      query.videoBitrate ??
      localStorage.videoBitrate ??
      localStorage.bitrate ??
      defaultValues.videoBitrate,
    audioBitrate: query.audioBitrate ?? localStorage.audioBitrate ?? defaultValues.audioBitrate,
    encoder: query.videoEncoder?.toString() ?? defaultValues.encoder,
    mirroring: mirroring(query),
    resolution: query.resolution ?? storedResolution(),
    selfie: selfie(query),
    frameRate: frameRate(query),
    audioEnhancements: audioEnhancements(query),
    id: id(),
  };
  if (parseBool(query.screen as string)) generalSettings.videoInput = "screenShare";
  return generalSettings;
};

const parseMediaConfig = (query: qs.ParsedQs): LocalMedia => {
  return {
    micOff: parseBool(query.micOff as string),
    cameraMuted: parseBool(query.camOff as string),
    autostart: parseBool(query.autostart as string),
  };
};

export const parseSearchString = (paramsString: string): ParsedProps => {
  const query = qs.parse(paramsString, { ignoreQueryPrefix: true });
  initLocalStorage(query);
  const [guestLogin, guestPassword] = storedCredentials();
  return {
    generalSettings: parseGeneralSettings(query),
    localMediaConfig: parseMediaConfig(query),
    autoJoin: autoJoin(query),
    guestLogin: query.guest_login?.toString() ?? guestLogin,
    guestPassword,
    remoteAudioMuted: query.audio ? !parseBool(query.audio.toString()) : true,
    signalingUrl: query.signaling?.toString(),
  };
};
