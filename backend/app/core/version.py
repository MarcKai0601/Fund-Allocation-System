# app/core/version.py

# Version format: MAJOR.MINOR.PATCH
VERSION = "5.0.0"

# Set a recognizable prefix if requested by the build process, e.g. R20260312
VERSION_PREFIX = "R20260312"

# Date of the current release build
RELEASE_DATE = "2026-03-12"

# A brief description of this release
DESCRIPTION = "SSO Authentication & i18n Refactoring"

def get_full_version() -> str:
    """Returns the full formatted version string."""
    # if VERSION_PREFIX:
    #     return f"{VERSION_PREFIX}v{VERSION}"
    return f"v{VERSION}"
