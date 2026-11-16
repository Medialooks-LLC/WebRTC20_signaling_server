import React, { FC } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import { audioBitRates } from "../../dto";
import i18n from "../../i18n/i18n_config";

export const AudioBitrateSettings: FC<Readonly<{
  value?: string;
  onBack: () => void;
  onChange: (value: string) => void;
  disabled: boolean;
}>> = ({ value, onBack, onChange, disabled }) => {
  return (
    <>
      <MenuBackItem title={i18n.t("remoteSettings.audioBitrate")} onClick={onBack} />
      {audioBitRates.map(bitrate => {
        return (
          <MenuRadioItem
            testId="audio-bitrate-radio-button"
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
