import React, { FC, useMemo, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { MicIcon } from "../icons/MicIcon";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { ButtonType } from "../ui/Button";
import i18n from "../../i18n/i18n_config";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const MicButton: FC<Readonly<{
  active: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, active, disabled }) => {
  const mediaQuery = useMediaQuery();

  const [show, setShow] = useState(false);

  const tooltipTitle = useMemo(
    () => (active ? i18n.t("labels.mic.turnOff") : i18n.t("labels.mic.turnOn")),
    [active],
  );

  return (
    <div>
      {!mediaQuery.isMobile && (
        <TooltipItem id="MicTooltipId" title={tooltipTitle} show={show} className="mb-3" />
      )}

      <IconButton
        id="MicButtonId"
        data-cy="mic-button"
        onClick={onClick}
        disabled={disabled}
        className={className}
        icon={<MicIcon active={active} />}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        buttonType={active ? ButtonType.Default : ButtonType.Danger}
      />

      {!mediaQuery.isMobile && (
        <Tooltip buttonId="MicButtonId" options={{ placement: "top" }} tooltipId="MicTooltipId" />
      )}
    </div>
  );
};
