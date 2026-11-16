import React, { FC, useMemo, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { FullscreenIcon } from "../icons/FullscreenIcon";
import i18n from "../../i18n/i18n_config";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const FullscreenButton: FC<Readonly<{
  active: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, disabled, active }) => {
  const mediaQuery = useMediaQuery();

  const [show, setShow] = useState(false);

  const tooltipTitle = useMemo(
    () => (active ? i18n.t("labels.fullscreen.turnOff") : i18n.t("labels.fullscreen.turnOn")),
    [active],
  );

  return (
    <div>
      {!mediaQuery.isMobile && (
        <TooltipItem id="FullscreenTooltipId" title={tooltipTitle} show={show} className="mb-3" />
      )}

      <IconButton
        onClick={onClick}
        disabled={disabled}
        className={className}
        id="FullscreenButtonId"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        icon={<FullscreenIcon active={active} />}
      />

      {!mediaQuery.isMobile && (
        <Tooltip
          buttonId="FullscreenButtonId"
          options={{ placement: "top-end" }}
          tooltipId="FullscreenTooltipId"
        />
      )}
    </div>
  );
};
