# Technical debt

## Closed

### MOP-TD-20260920-TIMEZONE-LABELS

**Closed:** 22 September 2026
**Owner:** MauticLocaleFixBundle
**Release:** 1.0.44

Added one timezone-label format selector for scheduled date/time controls:
UTC offset, short international abbreviation, or hidden. The runtime appends the
visual suffix inside the date/time control and leaves submitted and stored values
unchanged. Browser fallback strings such as `GMT+3` resolve to standard
abbreviations for supported common IANA zones, including `MSK` for
`Europe/Moscow` and DST-aware `CET`/`CEST` for central-European zones.

Release 1.0.43 used the server default timezone for the suffix even when Mautic
rendered the input in a different active-user timezone. Candidate 1.0.44 now
uses the current user timezone with the same default fallback as Mautic core.
Operations accepted candidate archive SHA-256
`50d6a178982f53ba7fa9f08d80ac8c826bc4545bf521950cb2eca371498f0b33` on
Bigartmail, Mautic 7.2.0 / PHP 8.4.25. With unchanged campaign 7 database
value `2026-04-17 05:00:00` UTC, the UI showed Moscow `08:00 MSK`, Belgrade
`07:00 CEST`, and UTC `05:00 UTC`. An unsaved winter Belgrade value showed
`06:00 CET`, then the page was reloaded without saving. The user profile was
restored to Europe/Moscow and no campaign/event was created or activated.
