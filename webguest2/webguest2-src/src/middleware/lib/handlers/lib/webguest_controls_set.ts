// import { changeSoundLevel, remoteSettingsChanged, setRemoteAudioMuted } from "../../../../actions";
import { remoteSettingsChanged } from "../../../../actions";
import { deserializeSettings } from "../../../../webrtc/lib";
import { RemoteSettingProps } from "../../../../dto";
import { StoreType } from "../../../../store";

export const onWebguestControlsSet = (
  store: StoreType,
  { message, cb }: { message: { command: { settings: RemoteSettingProps[] } }; cb: () => void },
) => {
  try {
    const [generalSettings, localMediaSettings] = deserializeSettings(message.command.settings);
    store.dispatch(remoteSettingsChanged(generalSettings, localMediaSettings));
    // store.dispatch(changeSoundLevel(volume as number));
    // store.dispatch(setRemoteAudioMuted(volume === 0));
    cb();
    // eslint-disable-next-line no-empty
  } catch (e) {}
};
