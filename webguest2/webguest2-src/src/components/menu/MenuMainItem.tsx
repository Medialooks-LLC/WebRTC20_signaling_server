import React, { FC } from "react";

import { MenuItem } from "./MenuItem";
import { ChevronDirection, ChevronIcon } from "../icons/ChevronIcon";
import cx from "classnames";

export const MenuMainItem: FC<Readonly<{
  title: string;
  value?: string;
  onClick: () => void;
  disabled: boolean;
  testId?: string;
}>> = ({ title, value, onClick, disabled, testId }) => (
  <MenuItem
    testId={testId}
    title={title}
    value={value}
    className={cx("mr-n1", { disabled: Boolean(disabled || !onClick) })}
    onClick={onClick}
    rightElement={!disabled && <ChevronIcon className="mr-n1" direction={ChevronDirection.Right} />}
  />
);
