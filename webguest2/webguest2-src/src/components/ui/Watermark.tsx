import cx from "classnames";
import React, { FC } from "react";

import styles from "./Watermark.module.scss";

export const Watermark: FC<Readonly<{
  className?: string;
}>> = ({ className }) => {
  const watermarkUrl = process.env.REACT_APP_WATERMARK_URL;
  if (!watermarkUrl) return null;
  const watermarkOpacity = process.env.REACT_APP_WATERMARK_OPACITY || "0.3";

  return (
    <div
      className={cx(styles.watermark, className)}
      style={{
        backgroundImage: `url(${watermarkUrl})`,
        opacity: watermarkOpacity,
      }}
    />
  );
};
