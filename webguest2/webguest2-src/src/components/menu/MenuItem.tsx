import "./assets/menu-item.scss";

import cx from "classnames";
import { isString } from "lodash";
import React, { FC, isValidElement, ReactNode } from "react";

import { BaseButtonProps } from "../ui/BaseButton";

export const MenuItem: FC<Readonly<{
  value?: string;
  disabled?: boolean;
  onClick?: () => void;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  title: ReactNode | string;
  testId?: string;
}> &
  Omit<BaseButtonProps, "children" | "title">> = ({
  value,
  title,
  onClick,
  disabled,
  className,
  leftElement,
  rightElement,
  testId,
}) => (
  <div
    data-cy={testId}
    role="button"
    onClick={onClick}
    className={cx(
      "d-flex px-4 menu-item cursor-pointer w-100",
      { disabled: Boolean(disabled || !onClick) },
      className,
    )}
  >
    <div className="d-flex flex-grow-1 flex-shrink-1 align-items-center">
      {Boolean(leftElement) && <div className="mr-1">{leftElement}</div>}

      <div
        className={cx("d-flex flex-shrink-0 flex-grow-1", {
          "flex-1": !value,
          "mr-1": Boolean(!value && rightElement),
        })}
      >
        {isString(title) && (
          <span
            className={cx("text-uppercase font-weight-semi-bold menu-item-title", {
              "text-white": !disabled,
              "text-muted": disabled,
            })}
          >
            {title}
          </span>
        )}

        {isValidElement(title) && title}
      </div>

      {Boolean(value) && (
        <div
          className={cx("d-flex flex-shrink-1 flex-grow-0 justify-content-end value-container", {
            "mr-1": Boolean(rightElement),
          })}
        >
          <span
            className={cx("text-uppercase font-weight-semi-bold text-ellipsis", {
              "text-white": !disabled,
              "text-muted": disabled,
            })}
          >
            {value}
          </span>
        </div>
      )}

      {rightElement}
    </div>
  </div>
);
