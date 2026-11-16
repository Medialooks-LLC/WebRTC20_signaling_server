import { COMMAND_RESPONSE, CONTROL_GET } from "../../../../webrtc/constants";
import { serializeSettings } from "../../../../webrtc/lib";
import { StoreType } from "../../../../store";
import { RemoteSettingProps } from "../../../../dto";

export const onWebguestControlsGet = (
  store: StoreType,
  {
    cb,
  }: {
    cb: (
      error: string | null,
      payload: { type: string; command: { type: string }; response: RemoteSettingProps[] },
    ) => void;
  },
) => {
  const packet = {
    type: COMMAND_RESPONSE,
    command: { type: CONTROL_GET },
    response: serializeSettings(store.getState()),
  };
  cb(null, packet);
};
