import { createAction } from "@reduxjs/toolkit";

export const peerPropsSet = createAction<Readonly<{ id: string; audio_channels?: string }>>(
  "peer-props/set",
);
