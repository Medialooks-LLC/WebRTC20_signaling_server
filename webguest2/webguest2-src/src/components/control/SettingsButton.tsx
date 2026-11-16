import React, { FC, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { SettingsIcon } from "../icons/SettingsIcon";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const SettingsButton: FC<Readonly<{
  active: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, active, disabled }) => {
  const mediaQuery = useMediaQuery();

  const [show, setShow] = useState(false);

  return (
    <div>
      {!mediaQuery.isMobile && (
        <TooltipItem id="SettingsTooltipId" title="Settings" show={show} className="mb-3" />
      )}

      <IconButton
        active={active}
        onClick={onClick}
        disabled={disabled}
        id="SettingsButtonId"
        data-cy="settings-button"
        className={className}
        icon={<SettingsIcon />}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />

      {!mediaQuery.isMobile && (
        <Tooltip
          buttonId="SettingsButtonId"
          options={{ placement: "top" }}
          tooltipId="SettingsTooltipId"
        />
      )}
    </div>
  );
};
