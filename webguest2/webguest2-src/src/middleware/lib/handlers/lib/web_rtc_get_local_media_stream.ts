import {
  getLocalMediaStream,
  processLocalMediaStream,
  setAwaiting,
  setIgnorePrevConstraints,
  setLoading,
  setLocalMediaStreamError,
  updateGeneralSettings,
} from "../../../../actions";
import { getStreamDeviceSettings } from "../../../../helpers";
import { CameraResolutions } from "../../../../dto";
import { ExactMediaConstraints, ExactVideoConstraints } from "./types";
import { StoreType } from "../../../../store";

type ExactDevice = Readonly<{ deviceId?: { exact: ConstrainDOMString } }>;
type ProcessableConstraints = { [p: string]: boolean | ExactDevice };

const resolutionFromConstraints = (video: ExactVideoConstraints) => {
  if (video.width?.exact && video.height?.exact) {
    return `${video.width?.exact}x${video.height?.exact}` as CameraResolutions;
  }
};

const frameRateFromConstraints = (video: ExactVideoConstraints) => {
  if (video.frameRate?.exact) {
    return video.frameRate.exact;
  }
};

const deviceIdFromConstraints = (constraints: ExactVideoConstraints) => {
  return constraints.deviceId?.exact;
};

const generalSettingsFromConstraints = (
  constraints: ExactMediaConstraints,
): [CameraResolutions | undefined, number | undefined, ConstrainDOMString | undefined] => {
  let resolution: CameraResolutions | undefined;
  let frameRate: number | undefined;
  let videoDeviceId: ConstrainDOMString | undefined;
  if (typeof constraints.video === "object") {
    resolution = resolutionFromConstraints(constraints.video);
    frameRate = frameRateFromConstraints(constraints.video);
    videoDeviceId = deviceIdFromConstraints(constraints.video);
  }
  return [resolution, frameRate, videoDeviceId];
};

const preprocessConstraints = (
  constraints: ProcessableConstraints,
  fieldName: string,
  devices: MediaDeviceInfo[],
) => {
  if (devices.length === 0) constraints[fieldName] = false;
  else if ((constraints[fieldName] as ExactDevice).deviceId?.exact) {
    const field = constraints[fieldName] as ExactDevice;
    if (!devices.find(c => c.deviceId === field.deviceId?.exact)) constraints.video = true;
  }
};

export const nextConstraints = (
  constraints: Readonly<ExactMediaConstraints>,
  defaultVideo?: boolean | MediaTrackConstraints,
  defaultAudio?: boolean | MediaTrackConstraints,
) => {
  let output: MediaStreamConstraints = { video: defaultVideo, audio: defaultAudio };
  if (typeof constraints.video === "object") {
    if (constraints.video.frameRate) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { frameRate, ...video } = constraints.video;
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      output = { ...output, video };
    } else if (constraints.video.width && constraints.video.height) {
      const video = constraints.video.deviceId
        ? { deviceId: constraints.video.deviceId }
        : defaultVideo;
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      output = { ...output, video };
    } else {
      const video = defaultVideo;
      output = { ...output, video };
    }
  } else if (constraints.video) {
    output = { ...output, video: false };
  }
  if (typeof constraints.audio === "object") {
    const audio = constraints.audio.deviceId
      ? { deviceId: constraints.audio.deviceId }
      : defaultAudio;
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    output = { ...output, audio };
  } else if (constraints.audio) {
    output = { ...output, audio: false };
  }
  return output;
};

export const onWebRtcGetLocalMediaStream = (store: StoreType) => {
  store.dispatch(setAwaiting(true));
  store.dispatch(setLoading(true));
  let state = store.getState();
  const constraints = state.media as ExactMediaConstraints;
  preprocessConstraints(constraints as ProcessableConstraints, "video", state.cameras);
  preprocessConstraints(constraints as ProcessableConstraints, "audio", state.mics);
  if (!!constraints.video || !!constraints.audio) {
    navigator.mediaDevices
      .getUserMedia(constraints as MediaStreamConstraints)
      .then(stream => {
        state = store.getState();
        const streamSettings = getStreamDeviceSettings(stream, state.cameras, state.mics);
        if (streamSettings) store.dispatch(updateGeneralSettings(streamSettings, true));
        store.dispatch(processLocalMediaStream(stream));
        store.dispatch(setIgnorePrevConstraints(false));
      })
      .catch(error => {
        store.dispatch(setAwaiting(false));
        store.dispatch(setLoading(false));
        store.dispatch(setLocalMediaStreamError(error));
        let trialConstraints;
        if (
          state.ignorePrevConstraints ||
          (constraints.video as ExactVideoConstraints)?.frameRate
        ) {
          trialConstraints = nextConstraints(
            constraints as ExactMediaConstraints,
            state.defaultMedia.video,
            state.defaultMedia.audio,
          );
        } else {
          trialConstraints = state.prevMediaStreamConstraints;
          store.dispatch(setIgnorePrevConstraints(true));
        }
        const [resolution, frameRate, videoInput] = generalSettingsFromConstraints(
          trialConstraints as ExactMediaConstraints,
        );
        store.dispatch(
          updateGeneralSettings(
            { ...state.generalSettings, resolution, frameRate, videoInput },
            false,
            trialConstraints,
          ),
        );
        store.dispatch(getLocalMediaStream());
      });
  } else {
    store.dispatch(setIgnorePrevConstraints(false));
    store.dispatch(processLocalMediaStream());
  }
};
