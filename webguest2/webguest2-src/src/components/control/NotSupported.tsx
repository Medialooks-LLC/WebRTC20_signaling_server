import "./assets/no-connection.scss";

import React, { FC } from "react";
import i18n from "../../i18n/i18n_config";

export const NotSupported: FC = () => (
  <div className="d-flex flex-column flex-1 align-items-center justify-content-center position-absolute no-connection">
    <span className="text-white text-center text-uppercase font-weight-semi-bold">
      {i18n.t("labels.webRtc.notSupported")}
    </span>
  </div>
);
