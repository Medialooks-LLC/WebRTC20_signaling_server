import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const StopIcon: FC<Readonly<{
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
      d="M6.28571 6.28571V17.7143H17.7143V6.28571H6.28571ZM5.14286 4H18.8571C19.1602 4 19.4509 4.12041 19.6653 4.33474C19.8796 4.54906 20 4.83975 20 5.14286V18.8571C20 19.1602 19.8796 19.4509 19.6653 19.6653C19.4509 19.8796 19.1602 20 18.8571 20H5.14286C4.83975 20 4.54906 19.8796 4.33474 19.6653C4.12041 19.4509 4 19.1602 4 18.8571V5.14286C4 4.83975 4.12041 4.54906 4.33474 4.33474C4.54906 4.12041 4.83975 4 5.14286 4V4Z"
    />
  </svg>
);
