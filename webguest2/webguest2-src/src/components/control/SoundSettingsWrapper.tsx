import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { WebRtcState } from "../../store/type";
import { SoundSettings, SoundSettingsProps } from "./SoundSettings";
import { changeSoundLevel, setRemoteAudioMuted } from "../../actions";

export function SoundSettingsWrapper(
  props: Omit<SoundSettingsProps, "volume" | "onChangeLevel" | "muted">,
) {
  const dispatch = useDispatch();

  const volume = useSelector((state: WebRtcState) => state.volume);
  const remoteAudioMuted = useSelector((state: WebRtcState) => state.remoteAudioMuted);

  return (
    <SoundSettings
      {...props}
      muted={remoteAudioMuted}
      volume={volume}
      onChangeLevel={level => {
        dispatch(changeSoundLevel(level));
        dispatch(setRemoteAudioMuted(level === 0));
      }}
    />
  );
}
