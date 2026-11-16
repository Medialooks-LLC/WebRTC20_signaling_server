import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const MinusIcon: FC<Readonly<{
  size?: number;
  color?: ColorPalette;
}> &
  SvgProps> = ({ size = 24, color = ColorPalette.White, ...svgProps }) => (
  <svg
    {...svgProps}
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 11H19V13H5V11Z" fill={color} />
  </svg>
);
