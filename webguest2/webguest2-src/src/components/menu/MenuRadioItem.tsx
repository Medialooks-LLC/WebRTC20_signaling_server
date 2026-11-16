import "./assets/menu-radio-item.scss";

import React, { FC } from "react";

import cx from "classnames";
import { MenuItem } from "./MenuItem";
import { CheckIcon } from "../icons/CheckIcon";

export const MenuRadioItem: FC<Readonly<{
  title: string;
  selected: boolean;
  onChange: () => void;
  disabled: boolean;
  testId?: string;
}>> = ({ title, selected, onChange, disabled, testId }) => (
  <MenuItem
    testId={testId}
    title={title}
    onClick={onChange}
    className="mr-n1 align-items-center menu-radio-item"
    rightElement={<CheckIcon className={cx("mr-n1 check-icon", { active: selected })} />}
    disabled={disabled}
  />
);
