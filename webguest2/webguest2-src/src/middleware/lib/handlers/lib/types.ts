// Reconstructed: the original type-only module was not part of the build output.
export type ExactVideoConstraints = MediaTrackConstraints & {
  deviceId?: { exact: ConstrainDOMString };
  width?: { exact: number };
  height?: { exact: number };
  frameRate?: { exact: number };
};

export type ExactAudioConstraints = MediaTrackConstraints & {
  deviceId?: { exact: ConstrainDOMString };
};

export interface ExactMediaConstraints {
  video?: boolean | ExactVideoConstraints;
  audio?: boolean | ExactAudioConstraints;
}
