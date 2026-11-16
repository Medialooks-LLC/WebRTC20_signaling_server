import "./assets/mute-button.scss";

import cx from "classnames";
import React, { useState } from "react";
import { IconLevel, MuteIcon } from "../icons/MuteIcon";
import { IconButton } from "../ui/IconButton";
import { ButtonProps, ButtonType } from "../ui/Button";
import { FriendSoundControl } from "./FriendSoundControl";

export interface MuteButtonProps extends Omit<ButtonProps, "children"> {
  onShowSoundSettings?: () => void;
  onChangeSoundLevel?: (level: number) => void;
  volume: number;
  muted: boolean;
  isFriend?: boolean;
}

export const MuteButton = ({
  onShowSoundSettings,
  volume,
  className,
  muted,
  isFriend,
  onChangeSoundLevel,
  ...props
}: MuteButtonProps) => {
  const value = muted ? 0 : volume;

  const [showControl, setShowControl] = useState(isFriend && value === 0);

  const mediumLevel = volume >= 30 && volume < 60 ? IconLevel.Medium : undefined;
  const highLevel = volume >= 60 ? IconLevel.High : undefined;

  return (
    <div
      className={cx("mute-button", { "d-flex align-items-center is-friend": isFriend })}
      onMouseEnter={() => {
        if (isFriend) {
          setShowControl(true);
        }
      }}
      onMouseLeave={() => {
        if (volume > 0 && isFriend) {
          setShowControl(false);
        }
      }}
    >
      <IconButton
        {...props}
        buttonType={!muted ? ButtonType.Default : ButtonType.Danger}
        id="PlayButtonId"
        data-cy="mute-remote-button"
        aria-describedby="tooltip"
        icon={<MuteIcon active={!muted} level={mediumLevel || highLevel} />}
        onMouseEnter={onShowSoundSettings}
        className={cx("button", className)}
      />

      {showControl && <FriendSoundControl value={value} onChangeSoundLevel={onChangeSoundLevel} />}
    </div>
  );
};
