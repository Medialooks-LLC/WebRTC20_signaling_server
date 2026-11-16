import { store as notificationsStore } from "react-notifications-component";
import { notificationsCommonProps } from "../../helpers";
import { LOG_MESSAGE } from "./constants";

export const showNotification = (
  title: string,
  message: string,
  type: "success" | "danger" | "info" | "default" | "warning" = "danger",
) => {
  notificationsStore.addNotification({
    title: title,
    message: message,
    type: type,
    ...notificationsCommonProps,
  });
};

export const logMessage = (message: string, data = {}, level = "info") => ({
  type: LOG_MESSAGE,
  message,
  level,
  data,
});
