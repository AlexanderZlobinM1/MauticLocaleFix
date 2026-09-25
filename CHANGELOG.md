# Changelog

## 1.0.50 — 2026-09-25

- Restore the Mautic 1.0.44 inline timezone suffix on wide scheduled fields.
- Omit timezone labels entirely on narrow controls (420 px or less), keeping
  their native width and layout. The label follows the control width when the
  page is resized.

## 1.0.49 — 2026-09-25

- Preserve the native width of narrow time-only campaign event fields when
  adding timezone labels. Display UTC and the offset on two lines without
  parentheses, giving the reclaimed label width back to the time input. Wide
  scheduled fields remain unchanged.

## 1.0.48 — 2026-09-25

- Keep timezone labels on the same line at every field width. On narrow fields,
  reduce only the field and timezone-label typography and spacing so the native
  time value remains visible beside the offset.

## 1.0.47 — 2026-09-24

- Keep Mautic's original input-group structure and inline appearance on wide
  fields; stack the timezone label only when that specific control is 420px wide
  or narrower, including when the form is resized.

## 1.0.46 — 2026-09-24

- Preserve the inline timezone label on wide scheduled date/time controls and
  move it below the native field in narrow or multi-column forms, preventing
  the time value from being clipped.

## 1.0.45 — 2026-09-23

- Add an opt-in setting that permits editing campaign activation and deactivation
  date/time controls while the campaign is inactive; the default retains Mautic's
  disabled controls and turning the setting off restores them.
- Handle this plugin's settings toggles locally to avoid duplicate core inline
  callbacks and support Mautic 7.2's direct integration settings route.
- A profile timezone change alone does not alter stored campaign schedule
  timestamps (verified on the installed Bigartmail 1.0.45 build).

## 1.0.44 — 2026-09-22

- Resolve scheduled-field timezone labels from the active Mautic user's timezone,
  falling back to the system default only when the profile has no timezone.
- Preserve the stored instant and Mautic's own user-local date/time value: changing
  the user timezone changes both the visual value and its matching inline suffix.

## 1.0.43 — 2026-09-22

- Add one operator-controlled timezone-label format for campaign
  activation/deactivation and time-based campaign event fields.
- Support a date-aware UTC offset, short international timezone abbreviation, or
  hidden label; the selected date determines the DST-aware result.
- Render the label inline in the date/time control, immediately after the value;
  no submitted, stored, API, or export value is changed. Choosing hidden or
  disabling the integration removes it.
- Add configuration-command support and focused browser/PHP regressions.

## 1.0.42 — 2026-09-06

- Support Mautic 7.2 while retaining the declared older Mautic versions.
- Use a plugin-scoped EncryptionHelper service alias; keep legacy argument parsing and the global core container unchanged.
- Add a fresh-kernel regression check that instantiates integration services and resolves form types.


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
