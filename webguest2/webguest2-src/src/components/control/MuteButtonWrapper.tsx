import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { WebRtcState } from "../../store/type";
import { changeSoundLevel, setRemoteAudioMuted } from "../../actions";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { MuteButton, MuteButtonProps } from "./MuteButton";
import { MobileMuteButton, MobileMuteButtonProps } from "./MobileMuteButton";

export function MuteButtonWrapper(
  props: Omit<MobileMuteButtonProps, "muted"> &
    Pick<MuteButtonProps, "onShowSoundSettings" | "isFriend">,
) {
  const dispatch = useDispatch();
  const { isMobile } = useMediaQuery();

  const volume = useSelector((state: WebRtcState) => state.volume);
  const remoteAudioMuted = useSelector((state: WebRtcState) => state.remoteAudioMuted);
  const onClick = useCallback(() => {
    const muted = !remoteAudioMuted;
    dispatch(setRemoteAudioMuted(muted));
    if (muted) dispatch(changeSoundLevel(0));
    else if (volume === 0) dispatch(changeSoundLevel(100));
  }, [dispatch, remoteAudioMuted, volume]);

  return isMobile ? (
    <MobileMuteButton {...props} muted={remoteAudioMuted} onClick={onClick} />
  ) : (
    <MuteButton
      {...props}
      muted={remoteAudioMuted}
      onClick={onClick}
      volume={volume}
      onChangeSoundLevel={level => {
        dispatch(changeSoundLevel(level));
        dispatch(setRemoteAudioMuted(level === 0));
      }}
    />
  );
}
