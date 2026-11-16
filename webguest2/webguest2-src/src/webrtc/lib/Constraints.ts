import { CameraResolutions } from "../../dto";
import { resolutions } from "../../config/WebRTC";

const deviceIdSettings = (deviceId: ConstrainDOMString) => {
  return { deviceId: { exact: deviceId } };
};

export const mergeDeviceId = (
  deviceId: ConstrainDOMString,
  constraints?: boolean | MediaTrackConstraints,
): MediaTrackConstraints => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  //@ts-ignore
  return { ...(typeof constraints === "object" ? constraints : {}), ...deviceIdSettings(deviceId) };
};

export const prepareMediaConstraints = (
  defaultVideo: boolean,
  defaultAudio: boolean,
  resolution?: CameraResolutions,
  videoDeviceId?: ConstrainDOMString,
  audioDeviceId?: ConstrainDOMString,
  fps?: number,
  echoCancellation?: boolean,
): MediaStreamConstraints => {
  // "Auto" asks for Full HD as a preference (falls back to the camera's best mode): plain
  // `video: true` makes most browsers open the camera at 640x480, which the app then remembers.
  const autoVideo: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  let video;
  if (resolution) {
    const [width, height] = resolutions[resolution];
    video =
      resolution === "default" ? autoVideo : { width: { exact: width }, height: { exact: height } };
  } else {
    video = defaultVideo ? autoVideo : defaultVideo;
  }
  if (fps) {
    // Not exact (cameras report 29.97/25 fps and would fail an exact 30), but with a floor:
    // with only `ideal`, webcams drop to 15 fps in dim light and Chrome may pick a low-res mode.
    // If a camera can't meet the floor, getUserMedia fails and the app retries without frameRate.
    video = {
      ...(typeof video === "object" ? video : {}),
      frameRate: { ideal: fps, min: Math.min(fps, 24) },
    };
  }
  const constraints: MediaStreamConstraints = {
    video,
    audio: defaultAudio
      ? typeof echoCancellation !== "undefined"
        ? { echoCancellation }
        : defaultAudio
      : defaultAudio,
  };
  if (videoDeviceId) {
    constraints.video = mergeDeviceId(videoDeviceId, constraints.video);
  }
  if (audioDeviceId) {
    constraints.audio = mergeDeviceId(audioDeviceId, constraints.audio);
  }
  return constraints;
};

export const prepareUsedChannels = (audioChannels?: number, otherChannels?: string) => {
  let channels;
  if (audioChannels === undefined || audioChannels < 0) {
    channels = otherChannels ?? "";
  } else {
    channels = `${audioChannels * 2 + 1},${audioChannels * 2 + 2}`;
  }
  return channels;
};
