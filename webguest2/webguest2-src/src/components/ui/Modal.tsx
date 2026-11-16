import "./assets/modal.scss";

import cx from "classnames";
import React, { FC, ReactNode, useRef } from "react";

import { Animated } from "./Animated";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const Modal: FC<Readonly<{
  show: boolean;
  onRest?: () => void;
  className?: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}>> = ({ show, onClose, children, className, testId }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const { isMobile } = useMediaQuery();

  useOutsideClick({
    ref,
    active: show,
    onClick: () => {
      setTimeout(() => {
        if (show) {
          onClose();
        }
      }, 150);
    },
  });

  return (
    <Animated
      show={show}
      className={cx(
        "position-absolute d-flex align-items-center justify-content-center custom-modal",
        { "mobile-modal": isMobile, "flex-column": !isMobile },
      )}
      defaultStyle={{
        opacity: 0,
        bottom: -30,
        transition: `all 300ms ease-in-out`,
        transitionProperty: "bottom, opacity",
      }}
      transitionStyles={{
        entering: { opacity: 1, bottom: 0 },
        entered: { opacity: 1, bottom: 0 },
        exiting: { opacity: 0, bottom: -30 },
        exited: { opacity: 0, bottom: -30 },
      }}
    >
      <div data-cy={testId} ref={ref} className={className}>
        {children}
      </div>
    </Animated>
  );
};
