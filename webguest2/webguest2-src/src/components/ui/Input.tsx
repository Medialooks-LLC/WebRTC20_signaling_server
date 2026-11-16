import "./assets/input.scss";

import cx from "classnames";
import { isString } from "lodash";
import React, { FC, isValidElement, ReactNode } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type NativeInputProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

export interface InputProps extends Omit<NativeInputProps, "value" | "onChange" | "className"> {
  label?: string | ReactNode;

  hintText?: string;

  value: string;
  onChange: (value: string) => void;

  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  hintTextClassName?: string;
  testId?: string;
}

export const Input: FC<Readonly<InputProps>> = ({
  value,
  label,
  hintText,
  onChange,
  className,
  inputClassName,
  labelClassName,
  hintTextClassName,
  ...inputProps
}) => {
  const { isMobile } = useMediaQuery();

  return (
    <div className={cx("d-flex flex-column custom-input", className)}>
      {Boolean(label) && (
        <div className="d-flex mb-2">
          {isString(label) && (
            <span className={cx("text-white text-uppercase label", labelClassName)}>{label}</span>
          )}

          {isValidElement(label) && label}
        </div>
      )}

      <input
        {...inputProps}
        value={value}
        className={cx(
          "border-0 outline-none overflow-hidden px-3 text-white input",
          {
            "mobile-input": isMobile,
            "mb-2": Boolean(hintText),
            "disabled-input": inputProps.disabled,
          },
          inputClassName,
        )}
        onChange={({ target }) => onChange(target.value)}
      />

      {Boolean(hintText) && (
        <span className={cx("input-hint-text", hintTextClassName)}>{hintText}</span>
      )}
    </div>
  );
};
