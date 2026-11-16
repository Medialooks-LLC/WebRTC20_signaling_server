import "./assets/tooltip-item.scss";

import React, { FC, useMemo } from "react";
import cx from "classnames";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const TooltipItem: FC<Readonly<{
  id: string;
  title: string;
  show: boolean;
  hidden?: boolean;
  className?: string;
  showMobile?: boolean;
}>> = ({ id, className, hidden, title, show, showMobile }) => {
  const { isMobile } = useMediaQuery();

  const canCreate = useMemo(() => Boolean(!isMobile || (isMobile && showMobile)), [
    isMobile,
    showMobile,
  ]);

  if (!canCreate) {
    return null;
  }

  return (
    <div
      id={id}
      role="tooltip"
      data-show={show || undefined}
      data-hidden={hidden || undefined}
      className={cx("tooltip-item p-2", className)}
    >
      <span className="text-uppercase tooltip-title">{title}</span>
      <div className="tooltip-arrow" data-popper-arrow={true} />
    </div>
  );
};
