export enum VideoOrientation {
  Vertical = "vertical",
  Horizontal = "horizontal",
}

export type CameraResolutions =
  | "default"
  | "320x240"
  | "640x360"
  | "640x480"
  | "1280x720"
  | "1920x1080";

export const videoBitRates = [
  "0.5M",
  "0.75M",
  "1.0M",
  "1.5M",
  "2.5M",
  "5M",
  "7.5M",
  "10M",
  "12.5M",
  "15M",
  "20M",
];

export interface GeneralSettings {
  name?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  encoder?: string;
  location?: string;
  mirroring?: boolean;
  resolution?: CameraResolutions;
  audioChannels?: number;
  otherChannels?: string;
  audioInput?: ConstrainDOMString;
  videoInput?: ConstrainDOMString;
  screenShare?: boolean;
  selfie?: boolean;
  id?: string;
  frameRate?: number;
  audioEnhancements?: boolean;
}

export type GeneralSettingsProps = Readonly<GeneralSettings>;

export interface ConfigProps {
  readonly camera?: string;
  readonly mic?: string;
}

export interface LocalMedia {
  micOff: boolean;
  cameraMuted: boolean;
  autostart?: boolean;
}

export type LocalMediaConfig = Readonly<LocalMedia>;
