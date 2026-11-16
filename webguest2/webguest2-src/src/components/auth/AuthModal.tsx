import "./assets/auth-modal.scss";

import React, { FC, useCallback } from "react";
import cx from "classnames";

import { AuthForm } from "./AuthForm";
import { LogoIcon } from "../icons/LogoIcon";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { AuthFormProps } from "../../dto";
import { useDispatch, useSelector } from "react-redux";
import {
  setCredentials,
  setShowBannerForm,
  setShowSecuredLinkSettings,
  settingsChanged,
} from "../../actions";
import { WebRtcState } from "../../store/type";

export const AuthModal: FC = () => {
  const dispatch = useDispatch();
  const { isMobile, isMobilePortrait } = useMediaQuery();

  const guestLogin = useSelector((state: WebRtcState) => state.guestLogin);
  const show = useSelector((state: WebRtcState) => state.showSecuredLinkSettings);
  const generalSettings = useSelector((state: WebRtcState) => state.generalSettings);

  const onChange = useCallback(
    (settings: AuthFormProps) => {
      dispatch(setShowSecuredLinkSettings(false));
      const { login, password, name, location } = settings;
      dispatch(settingsChanged({ ...generalSettings, name, location }));
      dispatch(setCredentials(login, password));
      dispatch(setShowBannerForm(false));
    },
    [dispatch, generalSettings],
  );

  if (!show) return null;

  return (
    <div className="d-flex flex-column align-items-center justify-content-center position-fixed auth-modal">
      <LogoIcon size={24} className="position-absolute modal-logo" />

      <div
        className={cx("br-3 px-4 py-5 modal-container", {
          "is-mobile": isMobile,
          "is-portrait": isMobilePortrait,
        })}
      >
        <AuthForm
          onSubmit={values =>
            new Promise<void>((resolve, reject) => {
              if (values.name === "error") {
                reject();
              } else {
                resolve();
              }
            }).then(() => onChange(values))
          }
          initialValues={{
            name: generalSettings.name,
            location: generalSettings.location,
            login: guestLogin ?? "",
            password: "",
          }}
        />
      </div>
    </div>
  );
};
