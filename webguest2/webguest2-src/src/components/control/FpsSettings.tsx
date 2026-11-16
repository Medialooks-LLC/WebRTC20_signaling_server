import React, { FC } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import i18n from "../../i18n/i18n_config";
import { frameRates } from "../../dto";

export const FpsSettings: FC<Readonly<{
  value?: number;
  onBack: () => void;
  onChange: (value: number) => void;
  disabled: boolean;
}>> = ({ value, onBack, onChange, disabled }) => {
  return (
    <>
      <MenuBackItem title={i18n.t("remoteSettings.frameRate")} onClick={onBack} />
      {frameRates.map(f => {
        return (
          <MenuRadioItem
            key={f}
            title={`${f} fps`}
            selected={value === f}
            onChange={() => onChange(f)}
            disabled={disabled}
          />
        );
      })}
    </>
  );
};
