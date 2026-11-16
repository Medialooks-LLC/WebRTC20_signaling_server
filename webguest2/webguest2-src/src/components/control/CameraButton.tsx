import React, { FC, useMemo, useState } from "react";

import { Tooltip } from "../ui/Tooltip";
import { IconButton } from "../ui/IconButton";
import { TooltipItem } from "../ui/TooltipItem";
import { CameraIcon } from "../icons/CameraIcon";
import { ButtonType } from "../ui/Button";
import i18n from "../../i18n/i18n_config";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const CameraButton: FC<Readonly<{
  active: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}>> = ({ className, onClick, active, disabled }) => {
  const mediaQuery = useMediaQuery();

  const [show, setShow] = useState(false);

  const tooltipTitle = useMemo(
    () => (active ? i18n.t("labels.camera.turnOff") : i18n.t("labels.camera.turnOn")),
    [active],
  );

  return (
    <div className="">
      {!mediaQuery.isMobile && (
        <TooltipItem id="CameraTooltipId" title={tooltipTitle} show={show} className="mb-3" />
      )}

      <IconButton
        onClick={onClick}
        id="CameraButtonId"
        data-cy="camera-button"
        disabled={disabled}
        className={className}
        icon={<CameraIcon active={active} />}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        buttonType={active ? ButtonType.Default : ButtonType.Danger}
      />

      {!mediaQuery.isMobile && (
        <Tooltip
          buttonId="CameraButtonId"
          options={{ placement: "top" }}
          tooltipId="CameraTooltipId"
        />
      )}
    </div>
  );
};
