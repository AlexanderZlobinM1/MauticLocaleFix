# Mautic Locale Fix

Mautic plugin that adds regional UI settings without patching Mautic core files.

## Current scope

- Calendar week start in Mautic date picker popups.
- Calendar language follows the current Mautic interface locale.
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
library.

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

Enable **Mautic Locale Fix** in Mautic integrations and set **Calendar week start**.

## Notes

This plugin intentionally does not change Mautic date formats or timezone
settings. It controls the first day of the week and the calendar popup language.
