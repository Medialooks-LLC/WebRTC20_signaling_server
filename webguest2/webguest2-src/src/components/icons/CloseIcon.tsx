import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const CloseIcon: FC<Readonly<{
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
    <path
      fill={color}
      d="M12 10.586L16.95 5.636L18.364 7.05L13.414 12L18.364 16.95L16.95 18.364L12 13.414L7.04999 18.364L5.63599 16.95L10.586 12L5.63599 7.05L7.04999 5.636L12 10.586Z"
    />
  </svg>
);
