import "./assets/custom-loader.scss";

import React, { FC } from "react";
import cx from "classnames";

import { LoaderIcon } from "../icons/LoaderIcon";
import { MessageLoaderIcon } from "../icons/MessageLoaderIcon";

export enum LoaderType {
  System = "system",
  Message = "message",
}

export const Loader: FC<Readonly<{
  type?: LoaderType;
  className?: string;
}>> = ({ type = LoaderType.System, className }) => {
  if (type === LoaderType.Message) {
    return <MessageLoaderIcon className={cx("custom-loader", className)} />;
  }

  return <LoaderIcon className={cx("custom-loader", className)} />;
};
