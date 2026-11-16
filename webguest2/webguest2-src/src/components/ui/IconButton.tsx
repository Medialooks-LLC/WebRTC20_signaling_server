import "./assets/icon-button.scss";

import cx from "classnames";
import React, { FC, ReactNode } from "react";
import { Button, ButtonProps } from "./Button";

export const IconButton: FC<Readonly<{
  icon: ReactNode;
  active?: boolean;
}> &
  Omit<ButtonProps, "label" | "children">> = ({ icon, active, className, ...buttonProps }) => (
  <Button {...buttonProps} className={cx("p-0 icon-button", { active }, className)}>
    {icon}
  </Button>
);
