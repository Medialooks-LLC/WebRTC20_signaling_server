import "./assets/switcher.scss";

import React, { FC } from "react";
import cx from "classnames";
import { animated, useSpring } from "react-spring";

import { CheckIcon } from "../icons/CheckIcon";
import { CloseIcon } from "../icons/CloseIcon";

const AnimatedCloseIcon = animated(CloseIcon);
const AnimatedCheckIcon = animated(CheckIcon);

type DivProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const Switcher: FC<Readonly<{
  value?: boolean;
  onChange: (value: boolean) => void;
}> &
  Omit<DivProps, "children" | "onClick" | "onChange" | "value">> = ({
  value,
  onChange,
  className,
  ...divProps
}) => {
  const animatedStyles = useSpring({
    left: value ? 24 : 4,
    closeOpacity: value ? 0 : 1,
    checkOpacity: value ? 1 : 0,
  });

  return (
    <div
      role="button"
      {...divProps}
      onClick={() => onChange(!value)}
      className={cx(
        "shadow-none p-0 disable-hover custom-switcher",
        {
          "bg-success": value,
          "default-button": !value,
        },
        className,
      )}
    >
      <div className="d-flex position-relative justify-content-between align-items-center switcher-container">
        {/* @ts-ignore */}
        <AnimatedCheckIcon size={14} style={{ opacity: animatedStyles.checkOpacity }} />
        {/* @ts-ignore */}
        <AnimatedCloseIcon size={14} style={{ opacity: animatedStyles.closeOpacity }} />

        <animated.div
          style={{ left: animatedStyles.left }}
          className="bg-white position-absolute switcher-pin"
        />
      </div>
    </div>
  );
};
