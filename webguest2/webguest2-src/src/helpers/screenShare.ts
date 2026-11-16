// Screen sharing: which camera to return to when sharing stops.
export const SCREEN_SHARE = "screenShare";

let lastCamera: string | undefined;

export const canShareScreen = (): boolean =>
  Boolean(
    navigator.mediaDevices &&
      (navigator.mediaDevices as MediaDevices & { getDisplayMedia?: unknown }).getDisplayMedia,
  );

export const rememberCamera = (deviceId?: ConstrainDOMString) => {
  if (typeof deviceId === "string" && deviceId && deviceId !== SCREEN_SHARE) lastCamera = deviceId;
};

// The camera used before sharing, else the one picked in the lobby, else the first camera.
export const cameraToReturnTo = (cameras: MediaDeviceInfo[]): string | undefined => {
  let lobbyCamera: string | null = null;
  try {
    lobbyCamera = localStorage.getItem("lobby.camId");
  } catch (e) {
    // storage blocked
  }
  const known = (id?: string | null) => Boolean(id && cameras.some(c => c.deviceId === id));
  if (known(lastCamera)) return lastCamera;
  if (known(lobbyCamera)) return lobbyCamera as string;
  return cameras[0]?.deviceId;
};
