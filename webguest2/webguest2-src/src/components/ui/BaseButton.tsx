import "./assets/base-button.scss";

import cx from "classnames";
import React, { FC, ReactNode } from "react";

type NativeButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export interface BaseButtonProps extends NativeButtonProps {
  children: ReactNode;
}

export const BaseButton: FC<Readonly<BaseButtonProps>> = ({
  children,
  className,
  ...buttonProps
}) => (
  <button
    {...buttonProps}
    className={cx(
      "d-flex border-0 outline-none base-button",

      className,
    )}
  >
    {children}
  </button>
);
