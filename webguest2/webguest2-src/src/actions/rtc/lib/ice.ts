import { createAction } from "@reduxjs/toolkit";

export const setIceServers = createAction<(RTCIceServer & { url?: string })[]>(
  "pc/ice/set-servers",
);

export const iceConnectionStateChanged = createAction<RTCIceConnectionState>(
  "pc/ice-connection-state-changed",
);

export const connectionStateChanged = createAction<RTCPeerConnectionState>("pc/state-changed");

export const iceGatheringStateChanged = createAction<RTCIceGatheringState>("pc/ice/state-changed");
