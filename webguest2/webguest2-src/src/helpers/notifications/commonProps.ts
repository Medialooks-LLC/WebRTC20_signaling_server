import { ReactNotificationOptions } from "react-notifications-component";

export const notificationsCommonProps: ReactNotificationOptions = {
  insert: "top",
  container: "top-right",
  animationIn: ["animate__animated", "animate__fadeIn"],
  animationOut: ["animate__animated", "animate__fadeOut"],
  dismiss: {
    duration: 3000,
  },
};
