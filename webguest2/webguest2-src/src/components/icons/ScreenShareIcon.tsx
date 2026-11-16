import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

// Monitor with an up arrow (share) or a cross (stop sharing)
export const ScreenShareIcon: FC<Readonly<{
  size?: number;
  sharing?: boolean;
  color?: string;
}> &
  SvgProps> = ({ size = 24, sharing, color = ColorPalette.White, ...svgProps }) => (
  <svg
    {...svgProps}
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="3.5" width="20" height="13.5" rx="2" />
    <path d="M8 21h8M12 17v4" />
    {sharing ? <path d="M9.5 7.75l5 5M14.5 7.75l-5 5" /> : <path d="M12 13.5V7.5M9.25 10.25L12 7.5l2.75 2.75" />}
  </svg>
);
