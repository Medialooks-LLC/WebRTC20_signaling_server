import React, { FC } from "react";
import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const FullscreenIcon: FC<Readonly<{
  size?: number;
  active?: boolean;
  color?: ColorPalette;
}> &
  SvgProps> = ({ size = 24, active, color = ColorPalette.White, ...svgProps }) => (
  <svg
    {...svgProps}
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    {active && (
      <path
        d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM8 15V21H6V17H2V15H8Z"
        fill={color}
      />
    )}
    {!active && (
      <path
        d="M20 3H22V9H20V5H16V3H20ZM4 3H8V5H4V9H2V3H4ZM20 19V15H22V21H16V19H20ZM4 19H8V21H2V15H4V19Z"
        fill={color}
      />
    )}
  </svg>
);
