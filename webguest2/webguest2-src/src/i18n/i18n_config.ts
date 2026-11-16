import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locale/en_source";
import { cn } from "./locale/cn_source";

const resources = {
  en: {
    translation: en,
  },
  cn: {
    translation: cn,
  },
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "en",
  lng: process.env.REACT_APP_LOCALE ?? "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
