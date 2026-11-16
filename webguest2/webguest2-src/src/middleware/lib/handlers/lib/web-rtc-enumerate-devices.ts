import {
  logMessage,
  setCameras,
  setEmptyDevices,
  setMics,
  switchLocalMediaDevice,
  updateGeneralSettings,
} from "../../../../actions";
import { StoreType } from "../../../../store";

const filterDevices = (type: string, devices: MediaDeviceInfo[]) =>
  devices.filter(device => {
    return device.kind === type && device.deviceId.length > 0;
  });

const audioDevices = (devices: MediaDeviceInfo[]) => filterDevices("audioinput", devices);
const videoDevices = (devices: MediaDeviceInfo[]) => filterDevices("videoinput", devices);

const targetOrDefault = (devices: MediaDeviceInfo[], targetId?: string) => {
  return devices && devices.length > 0
    ? devices.find(c => c?.deviceId === targetId)?.deviceId ??
        devices[Math.floor(Math.random() * devices.length)].deviceId
    : undefined;
};

export const onWebRtcEnumerateDevices = (
  store: StoreType,
  { defaultCam, defaultMic }: { defaultCam?: string; defaultMic?: string },
) => {
  navigator.mediaDevices
    .enumerateDevices()
    .then(devices => {
      const cameras = videoDevices(devices);
      const mics = audioDevices(devices);
      store.dispatch(setCameras(cameras));
      store.dispatch(setMics(mics));
      const state = store.getState();
      if (state.generalSettings.videoInput === "screenShare") {
        store.dispatch(switchLocalMediaDevice(true));
      } else {
        store.dispatch(
          updateGeneralSettings({
            videoInput: targetOrDefault(cameras, defaultCam),
            audioInput: targetOrDefault(mics, defaultMic),
          }),
        );
        store.dispatch(switchLocalMediaDevice());
      }
    })
    .catch(error => {
      store.dispatch(logMessage("enumerateDevices error", { error }));
      store.dispatch(setEmptyDevices());
    });
};
