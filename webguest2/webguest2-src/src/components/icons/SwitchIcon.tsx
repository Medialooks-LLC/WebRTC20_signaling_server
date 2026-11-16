import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const SwitchIcon: FC<Readonly<{
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
      d="M4 7.38462L8.8 2L13.6 7.38462H10.4V13.5385H7.2V7.38462H4ZM20 16.6154L15.2 22L10.4 16.6154H13.6V10.4615H16.8V16.6154H20Z"
    />
  </svg>
);
