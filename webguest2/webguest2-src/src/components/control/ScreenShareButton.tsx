import React, { FC, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { ScreenShareIcon } from "../icons/ScreenShareIcon";
import { ButtonType } from "../ui/Button";

// Share screen / stop sharing. Sharing replaces the camera in the outgoing video.
export const ScreenShareButton: FC<Readonly<{
  sharing: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, sharing, disabled }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="">
      <TooltipItem
        id="ScreenShareTooltipId"
        title={sharing ? "Stop sharing" : "Share screen"}
        show={show}
        className="mb-3"
      />

      <IconButton
        onClick={onClick}
        id="ScreenShareButtonId"
        data-cy="screen-share-button"
        disabled={disabled}
        className={className}
        icon={<ScreenShareIcon sharing={sharing} color={sharing ? "#0b0d12" : undefined} />}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        buttonType={sharing ? ButtonType.Active : ButtonType.Default}
      />

      <Tooltip
        buttonId="ScreenShareButtonId"
        options={{ placement: "top" }}
        tooltipId="ScreenShareTooltipId"
      />
    </div>
  );
};
