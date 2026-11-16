import { RefObject, useCallback, useEffect } from "react";

interface Props {
  readonly active: boolean;
  readonly ref: RefObject<any>;
  readonly onClick: () => void;
}

export const useOutsideClick = ({ ref, onClick, active }: Props) => {
  const handleClickOutside = useCallback(
    event => {
      if (active && ref.current && !ref.current.contains(event.target)) {
        onClick();
      }
    },
    [active, ref, onClick],
  );

  useEffect(() => {
    if (active) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [active, handleClickOutside]);
};
