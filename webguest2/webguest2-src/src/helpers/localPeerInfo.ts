import { GeneralSettingsProps, WorkingMode } from "../dto";
import { prepareCommonPeerInfo, prepareDuplexPeerInfo, prepareSenderPeerInfo } from "../webrtc/lib";

export const prepareLocalPeerInfo = (state: {
  generalSettings: GeneralSettingsProps;
  workingMode: WorkingMode;
}) => {
  if (state.workingMode !== WorkingMode.Preview) {
    const localPeerInfo = prepareCommonPeerInfo(state.generalSettings);
    switch (state.workingMode) {
      case WorkingMode.Duplex:
        return prepareDuplexPeerInfo(localPeerInfo);
      case WorkingMode.Publisher:
        return prepareSenderPeerInfo(localPeerInfo);
      case WorkingMode.Streamer:
        return prepareSenderPeerInfo(localPeerInfo);
      default:
        return {};
    }
  } else return {};
};
