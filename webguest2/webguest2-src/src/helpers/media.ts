const getDeviceId = (tracks: MediaStreamTrack[]) => {
  if (tracks.length > 0) {
    const track = tracks[0];
    return track.getSettings().deviceId;
  }
};

export const getStreamCamera = (stream: MediaStream) => {
  const videoTracks = stream.getVideoTracks();
  return getDeviceId(videoTracks);
};

export const getStreamMic = (stream: MediaStream) => {
  const audioTracks = stream.getAudioTracks();
  return getDeviceId(audioTracks);
};

export const getStreamDeviceSettings = (
  stream: MediaStream,
  localCams: MediaDeviceInfo[],
  localMics: MediaDeviceInfo[],
) => {
  let streamSettings;
  const camId = getStreamCamera(stream);
  const camera = localCams.find(cam => cam.deviceId === camId);
  if (camera) streamSettings = { videoInput: camera.deviceId };
  const micId = getStreamMic(stream);
  const microphone = localMics.find(mic => mic.deviceId === micId);
  if (microphone)
    streamSettings = {
      ...(streamSettings ?? {}),
      audioInput: microphone.deviceId,
    };
  return streamSettings;
};
