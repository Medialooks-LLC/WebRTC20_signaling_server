import { setMaxAudioChannels } from "../../../../actions";
import { StoreType } from "../../../../store";

export const onWebRtcPeerPropsSet = (
  store: StoreType,
  { payload }: { payload: Readonly<{ id: string; audio_channels?: string }> },
) => {
  if (payload.id === store.getState().targetId && payload.audio_channels) {
    const audioChannels = parseInt(payload.audio_channels);
    store.dispatch(setMaxAudioChannels(audioChannels));
  }
};
