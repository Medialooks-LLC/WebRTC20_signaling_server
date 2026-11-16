import "./assets/video-settings.scss";

import React, { FC } from "react";
import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import i18n from "../../i18n/i18n_config";

export const CameraSettings: FC<Readonly<{
  onBack: () => void;
  currentDeviceId?: ConstrainDOMString;
  devices: MediaDeviceInfo[];
  onChange: (deviceId: string, deviceLabel: string) => void;
  disabled: boolean;
}>> = ({ currentDeviceId, onBack, devices, onChange, disabled }) => (
  <>
    <MenuBackItem title={i18n.t("forms.cameraSettings.title")} onClick={onBack} />
    {devices.map(device => {
      return (
        <MenuRadioItem
          testId="video-input-radio-button"
          key={device.deviceId}
          title={device.label}
          selected={currentDeviceId === device.deviceId}
          onChange={() => onChange(device.deviceId, device.label)}
          disabled={disabled}
        />
      );
    })}
    <MenuRadioItem
      testId="video-input-radio-button"
      title={i18n.t("forms.cameraSettings.screenLabel")}
      selected={currentDeviceId === "screenShare"}
      onChange={() => onChange("screenShare", "Screen")}
      disabled={disabled}
    />
  </>
);
