// src/lib/version.ts

// Version format: MAJOR.MINOR.PATCH
export const APP_VERSION = "1.1.0";

// Date of the current release build
export const RELEASE_DATE = "2026-03-12";

// A brief description of this release
export const DESCRIPTION = "SSO Authentication & i18n Refactoring";

export function getFullVersion(): string {
    return `v${APP_VERSION}`;
}
