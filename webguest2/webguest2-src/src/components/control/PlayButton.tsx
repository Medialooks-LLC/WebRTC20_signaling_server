import "./assets/play-button.scss";

import cx from "classnames";
import React, { FC, useMemo } from "react";

import { StopIcon } from "../icons/StopIcon";
import { PlayIcon } from "../icons/PlayIcon";
import { Button, ButtonProps, ButtonType } from "../ui/Button";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { WorkingMode } from "../../dto";
import { ColorPalette } from "../../theme/ColorPalette";

export const PlayButton: FC<Readonly<
  {
    workingMode: WorkingMode;
    online: boolean;
  } & Omit<ButtonProps, "children">
>> = ({ online, workingMode, ...props }) => {
  const { isMobile } = useMediaQuery();

  const title = useMemo(() => {
    if (isMobile && online) {
      return <StopIcon color={ColorPalette.Red} />;
    }

    if (isMobile && !online) {
      return <PlayIcon />;
    }

    if (!isMobile && online) {
      return "Stop";
    }

    return "Start";
  }, [online, isMobile]);

  return (
    <Button
      {...props}
      buttonType={online ? ButtonType.Active : ButtonType.Success}
      className={cx({
        "flex-1": !isMobile || workingMode === WorkingMode.Streamer,
        "play-button": isMobile && workingMode !== WorkingMode.Streamer,
      })}
    >
      {title}
    </Button>
  );
};
