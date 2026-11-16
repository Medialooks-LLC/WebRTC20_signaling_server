import React, { FC, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { ChatIcon } from "../icons/ChatIcon";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const ChatButton: FC<Readonly<{
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, disabled }) => {
  const mediaQuery = useMediaQuery();

  const [show, setShow] = useState(false);

  return (
    <div>
      {!mediaQuery.isMobile && (
        <TooltipItem id="ChatTooltipId" title="Chat" show={show} className="mb-3" />
      )}

      <IconButton
        id="ChatButtonId"
        onClick={onClick}
        icon={<ChatIcon />}
        disabled={disabled}
        className={className}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />

      {!mediaQuery.isMobile && (
        <Tooltip buttonId="ChatButtonId" options={{ placement: "top" }} tooltipId="ChatTooltipId" />
      )}
    </div>
  );
};
