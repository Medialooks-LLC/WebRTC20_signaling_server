import "./assets/input.scss";

import cx from "classnames";
import { useField } from "formik";
import React, { FC, useMemo } from "react";

import { Input, InputProps } from "../ui/Input";

export const InputField: FC<Readonly<{
  name: string;
}> &
  Omit<InputProps, "value" | "onChange">> = ({ name, className, inputClassName, ...props }) => {
  const [field, meta, helpers] = useField(name);

  const showError = useMemo(() => Boolean(meta.touched && meta.error), [meta]);

  return (
    <Input
      {...props}
      {...field}
      onChange={x => helpers.setValue(x)}
      hintText={showError ? meta.error : undefined}
      inputClassName={cx({ "error-input": showError }, inputClassName)}
      className={cx("input-ui", { "error-input": showError }, className)}
      onFocus={e => {
        helpers.setError(undefined);

        if (props.onFocus) {
          props.onFocus(e);
        }
      }}
    />
  );
};
