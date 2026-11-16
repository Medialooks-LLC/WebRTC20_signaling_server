import React, { FC } from "react";
import { MenuItem } from "./MenuItem";
import { ChevronIcon } from "../icons/ChevronIcon";

export const MenuBackItem: FC<Readonly<{
  title: string;
  onClick: () => void;
  testId?: string;
}>> = ({ title, onClick, testId }) => (
  <MenuItem
    testId={testId}
    title={title}
    onClick={onClick}
    leftElement={<ChevronIcon className="ml-n1" />}
  />
);
