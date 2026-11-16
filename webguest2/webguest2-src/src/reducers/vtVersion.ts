import { createReducer, createAction } from "@reduxjs/toolkit";

export type VtVersionState = { version: string | null; isLegacy: boolean };
export const setVtVersion = createAction<string | undefined>("vtVersion/set");

const LEGACY_VERSION_THRESHOLD = "1.9.4.985";

const isLegacyVersion = (version: string) => {
  const sep = ".";
  const thresholdChunks = LEGACY_VERSION_THRESHOLD.split(sep).map(Number);
  const versionChunks = version.split(sep).map(Number);

  for (let i = 0; i < thresholdChunks.length; i++) {
    const verChunk = versionChunks[i] ?? 0;
    const threshChunk = thresholdChunks[i];
    if (threshChunk > verChunk) {
      return true;
    } else if (threshChunk < verChunk) {
      return false;
    }
  }
  return false;
};

export default createReducer<VtVersionState>({ version: null, isLegacy: false }, builder => {
  builder.addCase(setVtVersion, (state, action) => {
    if (action.payload) {
      state.version = action.payload;
      state.isLegacy = isLegacyVersion(action.payload);
    }
  });
});
