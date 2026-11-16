import "./assets/slider.scss";

import React from "react";
import cx from "classnames";
import ReactSlider, { ReactSliderProps } from "react-slider";

export function Slider({ className, ...props }: ReactSliderProps) {
  return <ReactSlider {...props} className={cx("react-slider", className)} />;
}
