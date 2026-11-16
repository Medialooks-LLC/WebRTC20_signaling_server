import { object, string } from "yup";
import { Form, Formik } from "formik";
import React, { FC, useState } from "react";

import { AuthError } from "./AuthError";
import { InputField } from "../form/InputField";
import { AuthFormProps } from "../../dto";
import { Button, ButtonType } from "../ui/Button";
import i18n from "../../i18n/i18n_config";

const validationSchema = object<AuthFormProps>({
  name: string().required("Please provide name"),
  login: string().required("Please provide login"),
  location: string().required("Please provide location"),
  password: string().required("Please provide password"),
});

export const AuthForm: FC<Readonly<{
  initialValues: AuthFormProps;
  onSubmit: (values: AuthFormProps) => Promise<void>;
}>> = ({ initialValues, onSubmit }) => {
  const [authError, setAuthError] = useState<string | undefined>();

  return (
    <Formik
      validateOnBlur={false}
      validateOnChange={false}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, formikHelpers) =>
        onSubmit(values).catch(() => {
          formikHelpers.setErrors({
            name: i18n.t("formErrors.wrongName"),
            login: i18n.t("formErrors.wrongLogin"),
            location: i18n.t("formErrors.wrongLocation"),
            password: i18n.t("formErrors.wrongPassword"),
          });

          setAuthError(i18n.t("formErrors.noInternetConnection"));
        })
      }
    >
      {({ handleSubmit, isSubmitting }) => (
        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <InputField
              name="name"
              label="Name"
              className="mb-3"
              disabled={isSubmitting}
              placeholder={i18n.t("forms.auth.enterYourName")}
            />
            <InputField
              name="location"
              label="Location"
              className="mb-3"
              placeholder={i18n.t("forms.auth.enterYourLocation")}
              disabled={Boolean(isSubmitting)}
            />
            <InputField
              name="login"
              label="Login"
              className="mb-3"
              placeholder={i18n.t("forms.auth.enterYourLogin")}
              disabled={Boolean(isSubmitting)}
            />
            <InputField
              name="password"
              type="password"
              label="Password"
              disabled={isSubmitting}
              placeholder={i18n.t("forms.auth.enterYourPassword")}
            />

            {Boolean(authError) && (
              <AuthError title={authError!} onCloseClick={() => setAuthError(undefined)} />
            )}
          </div>

          <div className="d-flex flex-column">
            <Button
              className="mb-2"
              fluid={true}
              type="submit"
              loading={isSubmitting}
              buttonType={ButtonType.Success}
            >
              Connect
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
