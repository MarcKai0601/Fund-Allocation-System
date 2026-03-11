"use client";

import React from "react";
import "@/i18n/config"; // 將 i18n 初始化移到 Client Component 執行

export default function I18nProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
