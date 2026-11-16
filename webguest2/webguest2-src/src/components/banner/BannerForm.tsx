import { object, string } from "yup";
import { Form, Formik } from "formik";
import React, { FC, useMemo, useState } from "react";

import { BannerError } from "./BannerError";
import { InputField } from "../form/InputField";
import { BannerFormProps } from "../../dto";
import { Button, ButtonType } from "../ui/Button";
import i18n from "../../i18n/i18n_config";
import { useSelector } from "react-redux";
import { WebRtcState } from "../../store/type";

const validationSchema = object<BannerFormProps>({
  name: string().required("Please provide name"),
  location: string().required("Please provide location"),
});

export const BannerForm: FC<Readonly<{
  onSubmit: (values: BannerFormProps) => Promise<void>;
}>> = ({ onSubmit }) => {
  const [authError, setAuthError] = useState<string | undefined>();
  const generalSettings = useSelector((state: WebRtcState) => state.generalSettings);
  const initialValues = useMemo(
    () => ({
      name: generalSettings.name,
      location: generalSettings.location,
    }),
    [generalSettings.location, generalSettings.name],
  );

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values, formikHelpers) =>
        onSubmit(values).catch(() => {
          formikHelpers.setErrors({
            name: i18n.t("formErrors.wrongName"),
            location: i18n.t("formErrors.wrongLocation"),
          });

          setAuthError(i18n.t("formErrors.noInternetConnection"));
        })
      }
    >
      {({ handleSubmit, isSubmitting }) => (
        <Form onSubmit={handleSubmit}>
          <div className="mb-3">
            <InputField
              data-cy="banner-name-input"
              name="name"
              label="Name"
              className="mb-3"
              disabled={isSubmitting}
              placeholder={i18n.t("forms.auth.enterYourName")}
            />
            <InputField
              data-cy="banner-location-input"
              name="location"
              label="Location"
              className="mb-3"
              placeholder={i18n.t("forms.auth.enterYourLocation")}
              disabled={Boolean(isSubmitting)}
            />

            {Boolean(authError) && (
              <BannerError title={authError!} onCloseClick={() => setAuthError(undefined)} />
            )}
          </div>

          <div className="d-flex flex-column">
            <Button
              className="mb-2"
              fluid={true}
              type="submit"
              loading={isSubmitting}
              buttonType={ButtonType.Success}
              data-cy="connect-button"
            >
              Connect
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};
