import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export enum ChevronDirection {
  Left = "left",
  Right = "right",
}

export const ChevronIcon: FC<Readonly<{
  size?: number;
  className?: string;
  color?: ColorPalette;
  direction?: ChevronDirection;
}> &
  SvgProps> = ({
  size = 24,
  color = ColorPalette.White,
  className,
  direction = ChevronDirection.Left,
  ...svgProps
}) => (
  <svg
    {...svgProps}
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {direction === ChevronDirection.Left && (
      <path
        fill={color}
        d="M11.05 12L16 7.05L14.586 5.636L8.222 12L14.586 18.364L16 16.95L11.05 12Z"
      />
    )}
    {direction === ChevronDirection.Right && (
      <path
        fill={color}
        d="M13.1719 12L8.22192 7.05L9.63592 5.636L15.9999 12L9.63592 18.364L8.22192 16.95L13.1719 12Z"
      />
    )}
  </svg>
);
