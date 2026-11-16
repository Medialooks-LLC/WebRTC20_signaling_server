import React, { FC } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import i18n from "../../i18n/i18n_config";

export const EncoderSettings: FC<Readonly<{
  value?: string;
  onBack: () => void;
  onChange: (value: string) => void;
  encoders: { mimeType: string }[];
  disabled: boolean;
}>> = ({ value, onBack, onChange, encoders, disabled }) => (
  <>
    <MenuBackItem
      testId="back-item"
      title={i18n.t("forms.encoderSettings.title")}
      onClick={onBack}
    />
    {encoders.map(encoder => {
      return (
        <MenuRadioItem
          testId="encoder-radio-button"
          key={encoder.mimeType}
          title={encoder.mimeType}
          selected={value === encoder.mimeType}
          onChange={() => onChange(encoder.mimeType)}
          disabled={disabled}
        />
      );
    })}
  </>
);
