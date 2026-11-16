import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export const LogoIcon: FC<Readonly<{
  size?: number;
  color?: ColorPalette;
}> &
  SvgProps> = ({ size = 32, color = ColorPalette.White, ...svgProps }) =>
  process.env.REACT_APP_IS_LOGO === "true" ? (
    <svg
      {...svgProps}
      fill="none"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id="mask0" maskUnits="userSpaceOnUse" x="0" y="4" width="32" height="24">
        <rect y="4" width="32" height="24" fill="url(#pattern0)" />
      </mask>
      <g mask="url(#mask0)">
        <rect x="1.96924" y="4" width="30.0308" height="22.0408" fill={color} />
      </g>
      <defs>
        <pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
          <use href="#image0" transform="translate(0 -0.0025641) scale(0.0153846 0.0205128)" />
        </pattern>
        <image
          id="image0"
          width="65"
          height="49"
          href="data:image/png;base64,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"
        />
      </defs>
    </svg>
  ) : null;
