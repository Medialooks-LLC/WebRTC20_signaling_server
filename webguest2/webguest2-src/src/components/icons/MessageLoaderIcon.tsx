import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type NativeSvgProps = React.SVGProps<SVGSVGElement>;

export interface SvgProps extends NativeSvgProps {
  readonly size?: number;
  readonly color?: ColorPalette;
}

export const MessageLoaderIcon: FC<SvgProps> = ({
  size = 12,
  color = ColorPalette.White,
  ...svgProps
}) => (
  <svg
    {...svgProps}
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 12 12"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill={color}
      d="M9.182 2.81792L8.475 3.52492C7.90246 2.95232 7.14908 2.59596 6.34325 2.51654C5.53741 2.43713 4.72897 2.63959 4.05567 3.08942C3.38237 3.53925 2.88587 4.20862 2.65077 4.98348C2.41567 5.75834 2.45651 6.59074 2.76634 7.33886C3.07617 8.08699 3.63581 8.70454 4.34991 9.08629C5.06402 9.46804 5.8884 9.59039 6.68259 9.43247C7.47678 9.27455 8.19165 8.84614 8.70538 8.22024C9.21912 7.59433 9.49994 6.80966 9.5 5.99992H10.5C10.5 7.04102 10.139 8.04991 9.47852 8.85468C8.81805 9.65946 7.89897 10.2103 6.87787 10.4134C5.85678 10.6165 4.79685 10.4593 3.87868 9.96851C2.96052 9.47774 2.24093 8.68378 1.84253 7.72193C1.44413 6.76008 1.39156 5.68984 1.69378 4.69357C1.996 3.69731 2.63431 2.83665 3.49996 2.25825C4.36561 1.67986 5.40502 1.4195 6.44111 1.52156C7.47719 1.62361 8.44584 2.08175 9.182 2.81792Z"
    />
  </svg>
);
