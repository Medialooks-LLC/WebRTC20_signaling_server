import "./assets/banner-error.scss";

import React, { FC } from "react";

import { CloseIcon } from "../icons/CloseIcon";

export const BannerError: FC<Readonly<{
  title: string;
  onCloseClick: () => void;
}>> = ({ title, onCloseClick }) => {
  return (
    <div className="d-flex br-2 bg-danger px-2 mt-5 mb-2 auth-error">
      <div className="d-flex flex-1 my-2 align-items-center">
        <span className="mx-1 text-white error-title">{title}</span>
      </div>

      <div
        role="button"
        onClick={onCloseClick}
        className="d-flex align-items-center cursor-pointer justify-content-center error-close-button"
      >
        <CloseIcon size={16} />
      </div>
    </div>
  );
};
