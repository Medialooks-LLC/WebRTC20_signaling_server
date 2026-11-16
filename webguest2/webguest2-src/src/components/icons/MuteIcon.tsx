import React, { FC } from "react";

import { ColorPalette } from "../../theme/ColorPalette";

type SvgProps = React.SVGProps<SVGSVGElement>;

export enum IconLevel {
  Low = "low",
  Medium = "medium",
  High = "high",
}

export const MuteIcon: FC<Readonly<{
  size?: number;
  active?: boolean;
  color?: ColorPalette;
  level?: IconLevel;
}> &
  SvgProps> = ({
  size = 24,
  active,
  color = ColorPalette.White,
  level = IconLevel.Low,
  ...svgProps
}) => {
  const isLowLevel = level === IconLevel.Low;
  const isMediumLevel = level === IconLevel.Medium;
  const isHighLevel = level === IconLevel.High;

  return (
    <svg
      {...svgProps}
      fill="none"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {active && (
        <>
          <path d="M9 6L4.55556 9.71429H1V15.2857H4.55556L9 19V6Z" stroke={color} strokeWidth="2" />

          {isLowLevel && (
            <path
              stroke={color}
              strokeWidth="2"
              d="M13 9.24512C13.8181 10.1072 14.2777 11.2762 14.2777 12.4951C14.2777 13.714 13.8181 14.8831 13 15.7451"
            />
          )}

          {isMediumLevel && (
            <path
              stroke={color}
              strokeWidth="2"
              d="M16.5 8C18.1362 9.72409 18.6362 10.8672 18.6362 12.5C18.6362 14.1328 18.1362 15.7759 16.5 17.5M13 9.2454C13.8181 10.1074 14.2777 11.2765 14.2777 12.4954C14.2777 13.7143 13.8181 14.8834 13 15.7454"
            />
          )}

          {isHighLevel && (
            <path
              stroke={color}
              strokeWidth="2"
              d="M16.5 8C18.1362 9.72409 18.6362 10.8672 18.6362 12.5C18.6362 14.1328 18.1362 15.7759 16.5 17.5M13 9.2454C13.8181 10.1074 14.2777 11.2765 14.2777 12.4954C14.2777 13.7143 13.8181 14.8834 13 15.7454M20.4447 6C22.0808 7.72409 23 10.0621 23 12.5C23 14.9379 22.0808 17.2759 20.4447 19"
            />
          )}
        </>
      )}

      {!active && (
        <>
          <path d="M9 6L4.55556 9.71429H1V15.2857H4.55556L9 19V6Z" stroke="white" strokeWidth="2"/>
          <path d="M20 10L14 16" stroke="white" strokeWidth="2"/>
          <path d="M14 10L20 16" stroke="white" strokeWidth="2"/>
        </>
      )}
    </svg>
  );
};
