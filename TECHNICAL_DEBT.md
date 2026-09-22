# Technical debt

## Closed

### MOP-TD-20260920-TIMEZONE-LABELS

**Closed:** 22 September 2026
**Owner:** MauticLocaleFixBundle
**Release:** 1.0.43

Added one timezone-label format selector for scheduled date/time controls:
UTC offset, short international abbreviation, or hidden. The runtime appends the
visual suffix inside the date/time control and leaves submitted and stored values
unchanged. Browser fallback strings such as `GMT+3` resolve to standard
abbreviations for supported common IANA zones, including `MSK` for
`Europe/Moscow` and DST-aware `CET`/`CEST` for central-European zones.

Operations accepted the UI scope on Bigartmail, Mautic 7.2.0 / PHP 8.4.25, using
candidate archive SHA-256 `2192d8ab3072cb8469d2bbbf6efe95c4d4e02877d6608c8be26b7c4468c64dfc`:
`UTC+03:00`, `MSK`, and hidden mode rendered inline; no redundant setting or
label attachment appeared; the observed campaign value stayed unchanged. The
operator explicitly limited acceptance to this UI scope, so campaign-event and
save/reopen flows are not claimed as tested.
