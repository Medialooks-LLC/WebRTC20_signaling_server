import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const PlayIcon: FC<Readonly<{
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
      d="M17.1319 12L9.41408 6.92885V17.0711L17.1319 12ZM20.7313 12.4949L7.93787 20.9004C7.84699 20.96 7.7414 20.9942 7.63236 20.9993C7.52332 21.0045 7.4149 20.9804 7.31866 20.9296C7.22242 20.8788 7.14195 20.8032 7.08584 20.711C7.02972 20.6187 7.00006 20.5131 7 20.4055V3.59448C7.00006 3.48689 7.02972 3.38133 7.08584 3.28905C7.14195 3.19676 7.22242 3.12121 7.31866 3.07042C7.4149 3.01964 7.52332 2.99554 7.63236 3.00068C7.7414 3.00582 7.84699 3.04001 7.93787 3.09962L20.7313 11.5051C20.814 11.5595 20.8817 11.633 20.9286 11.7194C20.9755 11.8057 21 11.9021 21 12C21 12.0979 20.9755 12.1943 20.9286 12.2806C20.8817 12.367 20.814 12.4405 20.7313 12.4949Z"
    />
  </svg>
);
