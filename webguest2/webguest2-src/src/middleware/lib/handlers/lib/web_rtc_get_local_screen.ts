import {
  logMessage,
  processLocalMediaStream,
  setAwaiting,
  setLoading,
  setLocalMediaStreamError,
  settingsChanged,
} from "../../../../actions";
import { StoreType } from "../../../../store";
import { cameraToReturnTo } from "../../../../helpers/screenShare";

// getDisplayMedia rejects the camera constraints (exact deviceId, min frame rate), so screen
// capture gets its own: up to 1080p / 30 fps, the browser picks what is being shared.
const DISPLAY_CONSTRAINTS = {
  video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { ideal: 30, max: 30 } },
  audio: false,
};

const returnToCamera = (store: StoreType) => {
  const state = store.getState();
  if (state.generalSettings.videoInput !== "screenShare") return;
  const camera = cameraToReturnTo(state.cameras);
  // Same path as picking a camera in Settings (updates settings and switches the device)
  if (camera) store.dispatch(settingsChanged({ ...state.generalSettings, videoInput: camera }));
};

export const onWebRtcGetLocalScreen = (store: StoreType) => {
  store.dispatch(setAwaiting(true));
  store.dispatch(setLoading(true));
  const state = store.getState();
  navigator.mediaDevices
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    .getDisplayMedia(DISPLAY_CONSTRAINTS)
    .then((stream: MediaStream) => {
      stream.getVideoTracks().forEach(track => {
        // Keep text sharp: the encoder protects resolution for "detail" content
        if ("contentHint" in track) track.contentHint = "detail";
        // The browser's own "Stop sharing" bar ends the track -> go back to the camera
        track.addEventListener("ended", () => returnToCamera(store));
      });

      if (state.media.audio && state.mics.length > 0) {
        navigator.mediaDevices
          .getUserMedia({ audio: state.media.audio })
          .then(audioStream => {
            const audioTracks = audioStream.getAudioTracks();
            if (audioTracks.length > 0) audioTracks.forEach(t => stream.addTrack(t));
            store.dispatch(processLocalMediaStream(stream));
          })
          .catch(error => {
            store.dispatch(logMessage("getLocalScreen get audio error", { error }));
            store.dispatch(processLocalMediaStream(stream));
          });
      } else {
        store.dispatch(processLocalMediaStream(stream));
      }
    })
    .catch((error: Error) => {
      store.dispatch(setLocalMediaStreamError(error));
      store.dispatch(setAwaiting(false));
      store.dispatch(setLoading(false));
      // Picker cancelled or not allowed: don't leave the guest without video
      returnToCamera(store);
    });
};
