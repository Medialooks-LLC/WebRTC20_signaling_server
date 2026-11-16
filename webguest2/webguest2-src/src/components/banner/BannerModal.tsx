import "./assets/banner-modal.scss";

import React, { FC, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import cx from "classnames";

import { BannerForm } from "./BannerForm";
import { LogoIcon } from "../icons/LogoIcon";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { BannerFormProps, WorkingMode } from "../../dto";
import { joinStream, setShowBannerForm, settingsChanged } from "../../actions";
import { WebRtcState } from "../../store/type";
import { findPeer } from "../../helpers";

export const BannerModal: FC = () => {
  const dispatch = useDispatch();
  const { isMobile, isMobilePortrait } = useMediaQuery();
  const hide = useSelector(
    (state: WebRtcState) => !state.showBannerForm || state.workingMode === WorkingMode.Publisher,
  );
  const peer = useSelector((state: WebRtcState) =>
    findPeer(state.peers, state.targetId, "publisher"),
  );
  const onChange = useCallback(
    (settings: BannerFormProps) => {
      dispatch(setShowBannerForm(false));
      const { name, location } = settings;
      dispatch(settingsChanged({ name, location }));
      if (peer) peer.run();
      else dispatch(joinStream());
    },
    [dispatch, peer],
  );

  if (hide) return null;

  return (
    <div className="d-flex flex-column align-items-center justify-content-center position-fixed auth-modal">
      <LogoIcon size={24} className="position-absolute modal-logo" />

      <div
        className={cx("br-3 px-4 py-5 modal-container", {
          "is-mobile": isMobile,
          "is-portrait": isMobilePortrait,
        })}
      >
        <BannerForm
          onSubmit={values =>
            new Promise<void>((resolve, reject) => {
              if (values.name === "error") {
                reject();
              } else {
                resolve();
              }
            }).then(() => onChange(values))
          }
        />
      </div>
    </div>
  );
};
