import "./assets/menu-group.scss";

import cx from "classnames";
import React, { FC, ReactNode } from "react";

import { Modal } from "../ui/Modal";

export const MenuGroup: FC<Readonly<{
  show: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}>> = ({ show, onClose, className, children, testId }) => (
  <Modal
    testId={testId}
    show={show}
    onClose={onClose}
    className={cx(
      "d-flex flex-column mx-3 align-self-center overflow-hidden menu-group",
      className,
    )}
  >
    {children}
  </Modal>
);
