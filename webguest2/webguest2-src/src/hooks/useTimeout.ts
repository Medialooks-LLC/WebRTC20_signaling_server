import { DependencyList, useEffect } from "react";

interface Props {
  readonly delay?: number;
  readonly onOver: Function;
  readonly deps: DependencyList;
}

export const useTimeout = ({ onOver, delay = 1000, deps = [] }: Props): void => {
  useEffect(() => {
    const timeout = setTimeout(onOver, delay);

    return () => clearTimeout(timeout);
  }, [deps, delay, onOver]);
};
