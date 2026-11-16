import React, { FC } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import { videoBitRates } from "../../dto";
import i18n from "../../i18n/i18n_config";

export const VideoBitrateSettings: FC<Readonly<{
  value?: string;
  onBack: () => void;
  onChange: (value: string) => void;
  disabled: boolean;
}>> = ({ value, onBack, onChange, disabled }) => {
  return (
    <>
      <MenuBackItem title={i18n.t("remoteSettings.videoBitrate")} onClick={onBack} />
      {videoBitRates.map(bitrate => {
        return (
          <MenuRadioItem
            testId="video-bitrate-radio-button"
            key={bitrate}
            title={bitrate}
            selected={value === bitrate}
            onChange={() => onChange(bitrate)}
            disabled={disabled}
          />
        );
      })}
    </>
  );
};
