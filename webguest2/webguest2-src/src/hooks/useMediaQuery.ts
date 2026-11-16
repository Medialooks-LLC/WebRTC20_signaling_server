import { useEffect, useState } from "react";

export enum OrientationType {
  Portrait = "portrait",
  Landscape = "landscape",
  Undetermined = "undetermined",
}

export enum DeviceType {
  Mobile = "mobile",
  Tablet = "tablet",
  Desktop = "desktop",
  Undetermined = "undetermined",
  LargeDesktop = "large-desktop",
  ExtraLargeDesktop = "extra-large-desktop",
}

export interface MediaQueryProps {
  readonly isMobile: boolean;
  readonly isMobilePortrait: boolean;
  readonly isMobileLandscape: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly isLargeDesktop: boolean;
  readonly isExtraLargeDesktop: boolean;
  readonly device: DeviceType;
  readonly orientation: OrientationType;
}

const readMediaQuery = (): MediaQueryProps => {
  const width = window.innerWidth;
  const orientation = window.matchMedia("(orientation: portrait)").matches
    ? OrientationType.Portrait : OrientationType.Landscape;
  // iPadOS can present a desktop Mac user agent. Its touch input still needs the
  // mobile controls and touch drag/drop backend.
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && navigator.platform === "MacIntel") ||
    (navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches);
  const device = width < 768 ? DeviceType.Mobile : width <= 1024 ? DeviceType.Tablet :
    width <= 1200 ? DeviceType.Desktop : width <= 1600 ? DeviceType.LargeDesktop : DeviceType.ExtraLargeDesktop;
  return {
    isMobile,
    isMobilePortrait: isMobile && orientation === OrientationType.Portrait,
    isMobileLandscape: isMobile && orientation === OrientationType.Landscape,
    isTablet: device === DeviceType.Tablet,
    isDesktop: device === DeviceType.Desktop,
    isLargeDesktop: device === DeviceType.LargeDesktop,
    isExtraLargeDesktop: device === DeviceType.ExtraLargeDesktop,
    device,
    orientation,
  };
};

export const useMediaQuery = (): MediaQueryProps => {
  const [state, setState] = useState<MediaQueryProps>(readMediaQuery);
  useEffect(() => {
    const refresh = () => {
      const next = readMediaQuery();
      setState(previous => previous.device === next.device && previous.orientation === next.orientation &&
        previous.isMobile === next.isMobile ? previous : next);
    };
    const queries = [window.matchMedia("(orientation: portrait)"), window.matchMedia("(pointer: coarse)")];
    window.addEventListener("resize", refresh);
    queries.forEach(query => {
      if (query.addEventListener) query.addEventListener("change", refresh);
      else query.addListener(refresh);
    });
    refresh();
    return () => {
      window.removeEventListener("resize", refresh);
      queries.forEach(query => {
        if (query.removeEventListener) query.removeEventListener("change", refresh);
        else query.removeListener(refresh);
      });
    };
  }, []);
  return state;
};
