import React, { FC } from "react";
import { useSelector } from "react-redux";
import { WebRtcState } from "../../store/type";
import { MainVideo } from "./MainVideo";
import { WorkingMode } from "../../dto";

export const MainVideoWrapper: FC<Readonly<{
  containerClassName?: string;
}>> = ({ containerClassName }) => {
  const remoteAudioMain = useSelector((state: WebRtcState) => {
    switch (state.workingMode) {
      case WorkingMode.Preview:
        return true;
      case WorkingMode.Streamer:
        return false;
      case WorkingMode.Duplex:
        return !state.localStreamMain;
      default:
        return true;
    }
  });
  const muted = useSelector((state: WebRtcState) =>
    remoteAudioMain ? state.remoteAudioMuted : true,
  );
  const mainVideoVolume = useSelector((state: WebRtcState) => {
    if (remoteAudioMain) {
      if (state.remoteAudioMuted) return 0;
      else return state.volume / 100.0;
    } else return 0;
  });
  const mirror = useSelector((state: WebRtcState) =>
    state.localStreamMain ? state.generalSettings.mirroring ?? true : false,
  );
  const stream = useSelector((state: WebRtcState) => {
    switch (state.workingMode) {
      case WorkingMode.Preview:
        return state.remoteMediaStream;
      case WorkingMode.Streamer:
        return state.localMediaStream;
      case WorkingMode.Duplex:
      case WorkingMode.Publisher:
        if (state.localStreamMain) {
          return state.localMediaStream;
        } else {
          return state.remoteMediaStream;
        }
      default:
        return null;
    }
  });
  const showSecuredLinkSettings = useSelector(
    (state: WebRtcState) => state.showSecuredLinkSettings,
  );
  const localStreamMain = useSelector((state: WebRtcState) => state.localStreamMain);

  return (
    <MainVideo
      muted={muted}
      containerClassName={containerClassName}
      disabled={showSecuredLinkSettings}
      volume={mainVideoVolume}
      isLocal={localStreamMain}
      mirror={mirror}
      stream={stream}
    />
  );
};
