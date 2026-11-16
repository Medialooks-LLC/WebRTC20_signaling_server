import React, { FC, useMemo } from "react";

import { MenuBackItem } from "../menu/MenuBackItem";
import { MenuRadioItem } from "../menu/MenuRadioItem";
import { Input } from "../ui/Input";
import { range } from "lodash";
import cx from "classnames";
import { OrientationType, useMediaQuery } from "../../hooks/useMediaQuery";
import i18n from "../../i18n/i18n_config";
import { useSelector } from "react-redux";
import { WebRtcState } from "../../store/type";

export const AudioChannelSettings: FC<Readonly<{
  value?: number;
  onBack: () => void;
  onChange: (value: number) => void;
  onOtherChannelsChange: (value: string) => void;
  otherChannels?: string;
  disabled: boolean;
}>> = ({ value, onBack, onChange, onOtherChannelsChange, otherChannels, disabled }) => {
  const { isMobile, orientation } = useMediaQuery();

  const isMobileLandscape = useMemo(() => isMobile && orientation === OrientationType.Landscape, [
    isMobile,
    orientation,
  ]);

  const maxAudioChannels = useSelector((state: WebRtcState) => state.maxAudioChannels);

  return (
    <>
      <MenuBackItem title={i18n.t("forms.audioChannels.title")} onClick={onBack} />
      {Boolean(maxAudioChannels) &&
        range(1, maxAudioChannels + 1, 2).map((channel, i) => {
          return (
            <MenuRadioItem
              testId="audio-channel-radio-button"
              key={i}
              title={`${channel}, ${channel + 1}`}
              selected={value === i}
              onChange={() => onChange(i)}
              disabled={disabled}
            />
          );
        })}
      <MenuRadioItem
        title={i18n.t("remoteSettings.otherChannels")}
        selected={value === -1}
        onChange={() => onChange(-1)}
        disabled={disabled}
      />
      <div
        className={cx("px-3", {
          "pt-4": !isMobileLandscape,
          "main-landscape-item": isMobileLandscape,
        })}
      >
        <div className="d-flex flex-1 flex-column ">
          <Input
            className="mb-3"
            value={otherChannels ?? ""}
            onChange={(val: string) => onOtherChannelsChange(val)}
            disabled={value !== -1}
            placeholder={i18n.t("forms.audioChannels.otherChannelsPlaceholder")}
          />
        </div>
      </div>
    </>
  );
};
