import "./assets/button.scss";

import cx from "classnames";
import React, { FC, isValidElement, ReactNode } from "react";

import { Loader } from "./Loader";
import { isString } from "lodash";
import { BaseButton, BaseButtonProps } from "./BaseButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export enum ButtonType {
  Info = "info",
  Active = "active",
  Danger = "danger",
  Success = "success",
  Default = "default",
}

export interface ButtonProps extends BaseButtonProps {
  fluid?: boolean;
  loading?: boolean;
  className?: string;
  buttonType?: ButtonType;
  children: string | ReactNode;
}

export const Button: FC<Readonly<ButtonProps>> = ({
  fluid,
  loading,
  disabled,
  children,
  className,
  buttonType = ButtonType.Default,
  ...buttonProps
}) => {
  const { isMobile } = useMediaQuery();

  return (
    <BaseButton
      type="button"
      {...buttonProps}
      disabled={loading || disabled}
      className={cx("align-items-center justify-content-center custom-button", className, {
        "fluid-button": fluid,
        "mobile-button": isMobile,
        disabled: loading || disabled,
        "info-button": buttonType === ButtonType.Info,
        "active-button": buttonType === ButtonType.Active,
        "default-button": buttonType === ButtonType.Default,
        "bg-danger danger-button": buttonType === ButtonType.Danger,
        "bg-success success-button": buttonType === ButtonType.Success,
      })}
    >
      {loading && <Loader />}

      {Boolean(!loading && isString(children)) && (
        <span
          className={cx("font-weight-semi-bold text-uppercase custom-button-label", {
            "text-white": buttonType !== ButtonType.Active,
            "text-danger": buttonType === ButtonType.Active,
          })}
        >
          {children}
        </span>
      )}

      {Boolean(!loading && isValidElement(children)) && children}
    </BaseButton>
  );
};
