# Mautic Locale Fix

Mautic plugin that adds regional UI settings without patching Mautic core files.

## Current scope

- Calendar week start in Mautic date picker popups.
- Default value: Monday.
- Supported switch values: Sunday or Monday.

The plugin injects a small JavaScript asset through `VIEW_INJECT_CUSTOM_ASSETS`.
It wraps Mautic's existing jQuery `datetimepicker()` calls and adds
`dayOfWeekStart` only when the page did not already set it explicitly.

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
settings. It only controls the first day of the week in calendar popups.

