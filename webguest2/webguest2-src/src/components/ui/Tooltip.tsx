import { FC, ReactNode, useEffect } from "react";
import { createPopper } from "@popperjs/core";
import { Modifier, OptionsGeneric } from "@popperjs/core/lib/types";

export const Tooltip: FC<Readonly<{
  tooltipId: string;
  buttonId: ReactNode;
  options?: Partial<OptionsGeneric<Partial<Modifier<any, any>>>>;
}>> = ({ tooltipId, buttonId, options }) => {
  useEffect(() => {
    const button = document.querySelector<any>(`#${buttonId}`);
    const tooltip = document.querySelector<any>(`#${tooltipId}`);

    if (button && tooltip) {
      createPopper(button, tooltip, options);
    }
  }, [tooltipId, buttonId, options]);

  return null;
};
