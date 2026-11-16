import React, { FC, useEffect } from "react";
import { VideoContainer } from "./VideoContainer";
import { GeneralSettingsProps, LocalMediaConfig, WorkingMode } from "../dto";
import { setPageTitle } from "../helpers";
import ReactNotification from "react-notifications-component";
import "react-notifications-component/dist/theme.css";

import { useDispatch } from "react-redux";
import * as actions from "../actions";
import { SIGNALING_SERVER_URL } from "../config/WebRTC";
import { updateLocalMediaConfig } from "../actions/rtc/lib/mediaConstraints";

export const WebRtcContainer: FC<Readonly<{
  workingMode: WorkingMode;
  targetId: string;
  generalSettings: GeneralSettingsProps;
  localMediaConfig: LocalMediaConfig;
  guestLogin?: string;
  guestPassword?: string;
  signalingUrl?: string;
  autoJoin: boolean;
  remoteAudioMuted: boolean;
}>> = ({
  workingMode,
  targetId,
  generalSettings,
  localMediaConfig,
  guestLogin,
  guestPassword,
  autoJoin,
  remoteAudioMuted,
  signalingUrl,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    setPageTitle(workingMode);
    dispatch(actions.setLocalStreamMain(workingMode === WorkingMode.Streamer));
    dispatch(actions.setSignalingUrl(signalingUrl ?? SIGNALING_SERVER_URL));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      dispatch(actions.setHasWebRTC(false));
    } else {
      dispatch(actions.setWorkingMode(workingMode));
      dispatch(actions.setAutoJoin(autoJoin));

      if (targetId) dispatch(actions.setTargetId(targetId));

      if (guestLogin && guestLogin.length > 0 && guestPassword && guestPassword.length > 0) {
        dispatch(actions.setCredentials(guestLogin, guestPassword));
      } else if (guestLogin && guestLogin.length > 0) {
        dispatch(actions.setGuestLogin(guestLogin));
      }

      dispatch(actions.updateGeneralSettings(generalSettings));
      // Camera / microphone off from the link or the lobby (camOff / micOff). This was parsed but
      // never applied, so guests joined with camera and mic on. (autostart keeps its default.)
      dispatch(
        updateLocalMediaConfig({
          cameraMuted: localMediaConfig.cameraMuted,
          micOff: localMediaConfig.micOff,
        }),
      );
      dispatch(actions.setRemoteAudioMuted(remoteAudioMuted));
      dispatch(actions.changeSoundLevel(remoteAudioMuted ? 0 : 100));

      dispatch(actions.joinStream());
    }
  }, [
    dispatch,
    generalSettings,
    localMediaConfig,
    guestLogin,
    autoJoin,
    targetId,
    workingMode,
    remoteAudioMuted,
    signalingUrl,
    guestPassword,
  ]);

  return (
    <React.Fragment>
      <ReactNotification />
      <VideoContainer />
    </React.Fragment>
  );
};
