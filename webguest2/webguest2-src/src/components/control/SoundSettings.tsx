import "./assets/sound-settings.scss";

import React from "react";
import cx from "classnames";

import { Slider } from "../ui/Slider";
import { MenuGroup } from "../menu/MenuGroup";
import i18n from "i18next";

export interface SoundSettingsProps {
  readonly show: boolean;
  readonly muted: boolean;
  readonly disabled: boolean;
  readonly onClose: () => void;
  readonly volume: number;
  readonly onChangeLevel: (level: number) => void;
}

export const SoundSettings = ({
  show,
  muted,
  onClose,
  onChangeLevel,
  volume,
}: SoundSettingsProps) => {
  const value = muted ? 0 : volume;

  return (
    <MenuGroup
      show={show}
      onClose={onClose}
      testId="sound-settings"
      className={cx("sound-settings mx-0", { active: show })}
    >
      <span className="tooltip-title">{i18n.t("labels.sound.volume")}</span>

      <div className="tooltip-sound-content">
        <Slider
          className="tooltip-sound-slider mr-2"
          value={value}
          onChange={position => onChangeLevel(position)}
        />

        <span className="tooltip-sound-value tooltip-title">{value}</span>
      </div>
    </MenuGroup>
  );
};
