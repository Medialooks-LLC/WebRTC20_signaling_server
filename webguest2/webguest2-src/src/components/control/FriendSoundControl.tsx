import "./assets/friend-sound-control.scss";

import React from "react";

import { Slider } from "../ui/Slider";
import i18n from "i18next";

interface Props {
  readonly value: number;
  readonly onChangeSoundLevel?: (level: number) => void;
}

export function FriendSoundControl({ value, onChangeSoundLevel }: Props) {
  return (
    <div className="friend-sound-control">
      <div className="control-container">
        <div className="d-flex justify-content-between control-title-container">
          <span className="control-title">{i18n.t("labels.sound.volume")}</span>
          <span className="control-title">{value}</span>
        </div>

        <Slider value={value} onChange={onChangeSoundLevel} />
      </div>
    </div>
  );
}
