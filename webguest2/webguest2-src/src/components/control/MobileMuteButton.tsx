import "./assets/mute-button.scss";

import cx from "classnames";
import { Placement } from "@popperjs/core/lib/enums";
import React, { useEffect, useMemo, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import i18n from "../../i18n/i18n_config";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { ButtonProps, ButtonType } from "../ui/Button";
import { IconLevel, MuteIcon } from "../icons/MuteIcon";
import { WorkingMode } from "../../dto";

export interface MobileMuteButtonProps extends Omit<ButtonProps, "children"> {
  visible: boolean;
  tooltipHidden?: boolean;
  workingMode?: WorkingMode;
  muted: boolean;
  showMyCamera: boolean;
}

export const MobileMuteButton = ({
  workingMode,
  visible,
  tooltipHidden,
  muted,
  className,
  showMyCamera,
  ...props
}: MobileMuteButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const placement: Placement = useMemo(() => {
    if (workingMode === WorkingMode.Preview) {
      return "top";
    }

    if (!showMyCamera) {
      return "right";
    }

    return "top-start";
  }, [workingMode, showMyCamera]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (visible) {
      timeout = setTimeout(() => {
        setShowTooltip(true);
      }, 100);
    } else {
      setShowTooltip(false);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [visible]);

  return (
    <div className="mute-button">
      <TooltipItem
        show={showTooltip}
        id="MuteTooltipId"
        showMobile={true}
        title={i18n.t("labels.sound.turnOn")}
        hidden={tooltipHidden || !muted}
        className={cx({
          "ml-3": placement === "right",
          "mb-3": placement === "top-start" || placement === "top",
        })}
      />
      <IconButton
        {...props}
        buttonType={!muted ? ButtonType.Default : ButtonType.Danger}
        id="PlayButtonId"
        data-cy="mute-remote-button"
        aria-describedby="tooltip"
        icon={<MuteIcon active={!muted} level={IconLevel.High} />}
        className={cx("button", className)}
      />
      <Tooltip buttonId="PlayButtonId" options={{ placement }} tooltipId="MuteTooltipId" />
    </div>
  );
};
