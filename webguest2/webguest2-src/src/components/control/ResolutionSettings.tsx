import React, { FC } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import { CameraResolutions } from "../../dto";

export const ResolutionSettings: FC<Readonly<{
  value?: CameraResolutions;
  onBack: () => void;
  onChange: (value: CameraResolutions) => void;
  disabled: boolean;
}>> = ({ value, onBack, onChange, disabled }) => (
  <>
    <MenuBackItem testId="back-item" title="Resolution" onClick={onBack} />
    <MenuRadioItem
      testId="resolution-1920x1080"
      title="1920 × 1080"
      selected={value === "1920x1080"}
      onChange={() => onChange("1920x1080")}
      disabled={disabled}
    />
    <MenuRadioItem
      testId="resolution-1280x720"
      title="1280 × 720"
      selected={value === "1280x720"}
      onChange={() => onChange("1280x720")}
      disabled={disabled}
    />
    <MenuRadioItem
      testId="resolution-640x480"
      title="640 × 480"
      selected={value === "640x480"}
      onChange={() => onChange("640x480")}
      disabled={disabled}
    />
    <MenuRadioItem
      testId="resolution-640x360"
      title="640 × 360"
      selected={value === "640x360"}
      onChange={() => onChange("640x360")}
      disabled={disabled}
    />
    <MenuRadioItem
      testId="resolution-320x240"
      title="320 × 240"
      selected={value === "320x240"}
      onChange={() => onChange("320x240")}
      disabled={disabled}
    />
  </>
);
