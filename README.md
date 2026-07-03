# Mautic Locale Fix

Mautic plugin that adds regional UI settings without patching Mautic core files.

## Current scope

- Calendar week start in Mautic date picker popups.
- Calendar language follows the current Mautic interface locale.
- Human-readable date display format choices for fields explicitly marked with
  `data-mautic-locale-fix-format="1"`.
- Date-only formatting is intentionally limited to date-only pickers so
  date/time campaign fields keep Mautic's `Y-m-d H:i` format.
- Optional campaign date/time submit workaround. When Mautic parses campaign
  event dates as UTC instead of the configured Mautic timezone, the plugin can
  submit only the campaign event `triggerDate` field as UTC while keeping the
  operator-facing value in local Mautic time.
- Optional Gmail/Google image proxy email-open workaround for Mautic 7. The
  plugin can count Gmail image proxy requests to `/email/*.gif` tracking pixels
  as email reads without changing Mautic core files. Other bot filtering remains
  untouched.
- Date-only table cells that contain a recognized standalone date are formatted
  according to the configured calendar date format. Mixed text such as campaign
  names is left unchanged.
- Dashboard date range fields are localized immediately on page load, not only
  after opening the picker. Before submit, those values are temporarily
  normalized back to Mautic's native `M j, Y` format so the backend keeps parsing
  the filter range normally.
- The browser asset is fail-closed: if the integration is disabled, it removes
  its wrappers where possible and stops touching Mautic date pickers.
- Third-party date pickers keep their own input format and callbacks unless
  they explicitly opt in with Mautic Locale Fix data attributes.
- Existing picker options are applied idempotently, avoiding repeated
  `setOptions` calls while a calendar popup is open.
- Default value: Monday.
- Supported switch values: Sunday or Monday.

## Supported Mautic versions

- Mautic 6
- Mautic 7

Mautic 5 needs a separate package or branch because its legacy integration
constructor still requires the old session service argument that is not present
in Mautic 6/7.

The plugin injects a small JavaScript asset through `VIEW_INJECT_CUSTOM_ASSETS`.
It wraps Mautic's existing jQuery `datetimepicker()` calls and applies the
configured `dayOfWeekStart`, including existing dashboard date range fields that
may have been initialized before the plugin asset finished loading. It also maps
Mautic locales to the locale names supported by the bundled datetimepicker
library. For date-only values, the plugin can apply one of the configured
human-readable date formats without requiring operators to enter raw date format
tokens.

## Install

Copy this directory to:

```text
plugins/MauticLocaleFixBundle
```

Then run:

```bash
php bin/console mautic:plugins:reload
php bin/console cache:clear
```

Enable **Mautic Locale Fix** in Mautic integrations, then set **Calendar week
start**, **Calendar date format**, and optionally **Fix campaign date/time
timezone submit** and **Count Gmail image proxy opens**.

## Notes

This plugin intentionally does not change global timezone settings or Mautic
core files. It controls the first day of the week, the calendar popup language,
selected date-only display formats, and an optional campaign builder workaround
for Mautic installations where campaign event date/time submit handling parses
local Mautic time as UTC. The Gmail image proxy workaround is limited to email
tracking pixel requests and does not disable global bot filtering for page hits,
assets, prefetch, DNT, or Sec-GPC requests.
