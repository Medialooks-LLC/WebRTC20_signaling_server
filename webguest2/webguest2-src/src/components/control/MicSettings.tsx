import "./assets/video-settings.scss";

import React, { FC } from "react";

import { MenuRadioItem } from "../menu/MenuRadioItem";
import { MenuBackItem } from "../menu/MenuBackItem";
import i18n from "../../i18n/i18n_config";

export const MicSettings: FC<Readonly<{
  value?: ConstrainDOMString;
  devices: MediaDeviceInfo[];
  onBack: () => void;
  onChange: (deviceId: string, deviceLabel: string) => void;
  disabled: boolean;
}>> = ({ value, devices, onBack, onChange, disabled }) => (
  <>
    <MenuBackItem title={i18n.t("forms.micSettings.title")} onClick={onBack} />
    {devices.map(device => {
      return (
        <MenuRadioItem
          testId="audio-input-radio-button"
          key={device.deviceId}
          title={device.label}
          selected={value === device.deviceId}
          onChange={() => onChange(device.deviceId, device.label)}
          disabled={disabled}
        />
      );
    })}
  </>
);
