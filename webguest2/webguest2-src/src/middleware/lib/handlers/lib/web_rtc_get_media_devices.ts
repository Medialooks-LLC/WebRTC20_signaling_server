import { getStreamCamera, getStreamMic } from "../../../../helpers";
import { StoreType } from "../../../../store";
import * as actions from "../../../../actions";

const selectDefaultId = (
  constraints?: MediaStreamConstraints,
  defaultCamera?: string,
  defaultMic?: string,
) => {
  return [
    (constraints?.video as { deviceId: { exact: string } })?.deviceId?.exact ?? defaultCamera,
    (constraints?.audio as { deviceId: { exact: string } })?.deviceId?.exact ?? defaultMic,
  ];
};

export const onWebRtcGetMediaDevices = (store: StoreType) => {
  const state = store.getState();
  store.dispatch(actions.setLoading(true));
  store.dispatch(actions.setAwaiting(true));
  navigator.mediaDevices
    .enumerateDevices()
    .then(devices => {
      const kinds = devices.map(d => d.kind);
      const basicConstraints = {
        video: kinds.includes("videoinput"),
        audio: kinds.includes("audioinput"),
      };
      store.dispatch(actions.setDefaultLocalStreamConstraints(basicConstraints));
      if (basicConstraints.video || basicConstraints.audio) {
        navigator.mediaDevices
          .getUserMedia(basicConstraints)
          .then(stream => {
            const [defaultCamera, defaultMic] = selectDefaultId(
              state.media,
              getStreamCamera(stream),
              getStreamMic(stream),
            );
            stream.getTracks().forEach(track => track.stop());
            store.dispatch(actions.enumerateDevices(defaultCamera, defaultMic));
          })
          .catch(error => {
            store.dispatch(actions.logMessage("getMediaDevices error", error));
            store.dispatch(actions.enumerateDevices());
          });
      } else {
        store.dispatch(actions.logMessage("No media inputs"));
        store.dispatch(actions.setEmptyDevices());
      }
    })
    .catch(error => {
      store.dispatch(actions.logMessage("enumerateDevices error", { error }));
      store.dispatch(actions.setEmptyDevices());
    });
};
