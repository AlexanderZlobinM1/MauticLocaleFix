# Changelog

## 1.0.41 - 2026-09-05

- Retained the Gmail/Google image proxy workaround and its switch on Mautic
  7.2.0: the official core still rejects proxy requests in `IpLookupHelper`
  before email-open processing, despite the related merged upstream PR.
- Added regression coverage for the existing Google tracking controls and
  runtime on 7.1.3 and 7.2.0, including disabled and unpublished states and
  preservation of independent regional settings.
- Added a reproducible check of the exact Mautic 7.2.0 tracking gate with its
  locked Matomo 6.5.0 dependency. No runtime or UI behavior changed.

## 1.0.40 - 2026-08-27

- Fixed import count links in every UI locale by normalizing the translated
  `import_id` and `import_action` search commands before Mautic parses them.
- Kept normalization dynamic: the active translation catalog is used, so new
  locales do not require hard-coded aliases or Mautic core changes.

## 1.0.39 - 2026-08-26

- Fixed integration toggle rendering when Mautic supplies the persisted
  `enabled` or `disabled` strings directly to the form. The UI now uses the
  same strict boolean normalization as runtime execution, so a disabled
  feature is displayed as disabled and remains available for manual enabling.

## 1.0.38 - 2026-08-26

- Stopped loading the Locale Fix runtime asset while the integration is
  unpublished. Disabled integrations now only clear any runtime left from an
  earlier enabled state and do not execute feature code.

## 1.0.37 - 2026-08-26

- Changed unset feature toggles to disabled so publishing the integration never
  activates calendar or Gmail proxy behavior implicitly.
- Extended the configuration command with `--calendar-enabled`; automation can
  now publish the integration while explicitly selecting each behavior.

## 1.0.36 - 2026-08-26

- Added `mautic:locale-fix:configure` so automation can publish or unpublish the
  integration and enable or disable Gmail image proxy opens through Mautic's
  encrypted integration settings API.
- This keeps the same explicit on/off behavior as the UI and avoids direct
  database writes to encrypted integration keys.

## 1.0.35 - 2026-08-26

- Restored the integration publication gate for Gmail image proxy open
  handling: the workaround now runs only when the integration is published and
  `gmail_image_proxy_open` is enabled.
- Mautic 6 to 7 migrations are expected to install and enable this integration
  through the MCD upgrade workflow instead of bypassing its disabled state.

## 1.0.34 - 2026-08-26

- Fixed Gmail and Google image proxy opens on Mautic 7 after migrations where
  the Mautic Locale Fix integration exists but remains unpublished.
- Kept the workaround limited to `GET /email/*.gif` requests and preserved an
  explicitly disabled `gmail_image_proxy_open` setting.
- No Mautic core files are modified and other bot, privacy, page-hit, asset,
  prefetch, DNT, and Sec-GPC filtering remains unchanged.
