"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhTW from "../locales/zh-TW.json";
import en from "../locales/en.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";

const resources = {
    "zh-TW": { translation: zhTW },
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "zh-TW",
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        detection: {
            order: ["querystring", "cookie", "localStorage", "sessionStorage", "navigator", "htmlTag", "path", "subdomain"],
            caches: ["localStorage", "cookie"],
        },
    });

export default i18n;
