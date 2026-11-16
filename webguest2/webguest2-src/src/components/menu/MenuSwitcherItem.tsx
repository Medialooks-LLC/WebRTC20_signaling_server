import React, { FC } from "react";
import { noop } from "lodash";

import { MenuItem } from "./MenuItem";
import { Switcher } from "../ui/Switcher";

export const MenuSwitcherItem: FC<Readonly<{
  title: string;
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
  testId?: string;
}>> = ({ title, value, onChange, disabled, testId }) => (
  <MenuItem
    testId={testId}
    role="checkbox"
    title={title}
    onClick={() => onChange(!value)}
    rightElement={<Switcher value={value} onChange={noop} />}
    disabled={disabled}
  />
);
