# Changelog

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
