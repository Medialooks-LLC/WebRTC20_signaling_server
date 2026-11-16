import { GeneralSettingsProps, CommonPeerProps, LocalPeerProps } from "../../dto";

export const prepareCommonPeerInfo = (settings: GeneralSettingsProps): CommonPeerProps => {
  return {
    name: settings.name,
    vidEncoder: settings.encoder ?? "VP9",
    audEncoder: "opus",
    audBitrate: settings.audioBitrate,
    vidBitrate: settings.videoBitrate,
    location: settings.location,
    // eslint-disable-next-line @typescript-eslint/camelcase
    webrtc_src_fps: settings.frameRate,
  };
};

export const prepareDuplexPeerInfo = (commonPeerInfo: CommonPeerProps): LocalPeerProps => {
  return {
    ...commonPeerInfo,
    //Required for access via mp-link
    submode: "webguest_duplex",
    // mode: "sender" - DO NOT USE (appears in VT sources)
  };
};

export const prepareSenderPeerInfo = (commonPeerInfo: CommonPeerProps): LocalPeerProps => {
  return {
    ...commonPeerInfo,
    // Required for enumeration
    submode: "webguest",
    // VVB: Note: have to specify 'sender' for VT < 1.7 compatibility
    mode: "sender",
  };
};
