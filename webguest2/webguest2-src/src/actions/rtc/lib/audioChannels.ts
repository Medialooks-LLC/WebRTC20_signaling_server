import { DispatchType } from "../../../store/type";
import { WEB_RTC_UPDATE_AUDIO_CHANNELS_SETTINGS } from "../constants";
import { prepareUsedChannels } from "../../../webrtc/lib";
import { setLocalPeerInfo } from "./setLocalPeerInfo";
import { createAction } from "@reduxjs/toolkit";

export const updateAudioChannelsSettings = (audioChannels?: number, otherChannels?: string) => {
  return (dispatch: DispatchType) => {
    dispatch({
      type: WEB_RTC_UPDATE_AUDIO_CHANNELS_SETTINGS,
      audioChannels,
      otherChannels,
    });
    dispatch(
      setLocalPeerInfo({
        // eslint-disable-next-line @typescript-eslint/camelcase
        audio_channels_mask: prepareUsedChannels(audioChannels, otherChannels),
      }),
    );
  };
};

export const setMaxAudioChannels = createAction<number>("audio-channels/max/set");
