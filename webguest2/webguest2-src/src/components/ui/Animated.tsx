import cx from "classnames";
import React, { FC, ReactNode } from "react";
import { Transition } from "react-transition-group";

import { Dict } from "../../dto";

export const Animated: FC<Readonly<{
  show: boolean;
  className?: string;
  children: ReactNode;
  defaultStyle: Dict<string | number>;
  transitionStyles: {
    exited: Dict<string | number>;
    entered: Dict<string | number>;
    exiting: Dict<string | number>;
    entering: Dict<string | number>;
  };
}>> = ({ show, children, className, defaultStyle, transitionStyles }) => (
  <div>
    <Transition in={show} timeout={300}>
      {state => (
        <div
          className={cx(className, { disabled: show })}
          style={{
            ...defaultStyle,
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            ...transitionStyles[state],
          }}
        >
          {children}
        </div>
      )}
    </Transition>
  </div>
);
