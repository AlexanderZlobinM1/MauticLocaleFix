# Compatibility index

Last reviewed: 22 September 2026.

Current published release: `1.0.42` (`3ab6e11`). Candidate `1.0.43` adds one plugin integration selector and browser-side,
inline labels for scheduled campaign date/time fields; it has passed focused
browser regression and PHP form/config checks on the Mautic 6.0.9 and 7.2.0
dependency trees. Operations accepted the 1.0.43 UI scope on Bigartmail (Mautic 7.2.0 / PHP
8.4.25); publication is in progress. The acceptance does not cover
save/reopen or campaign-event flows.
Declared support: Mautic 6.x, 7.x; PHP >=8.1.

| Mautic | Status | Confirmed scope |
| --- | --- | --- |
| 5.2.10 | — | Outside declared range |
| 6.0.9 | ✓ | Runtime integration plus 27 assertions, 22 Sep 2026 |
| 7.1.3 | ✓ | Runtime integration plus 27 assertions, 6 Sep 2026 |
| 7.2.0 | ✓ | Runtime integration plus 29 assertions, 22 Sep 2026 |

Release 1.0.43 preserves this matrix. Its
new UI uses only the existing asset-injection and integration-form APIs. Its
UTC offset/short-abbreviation suffix is inside the date/time control and it has no
schema, migration, stored-value, API, or export change.

The Mautic 7 image-proxy switch and Mautic 6 disabled path retain regression coverage. Update this file and the workspace `../../COMPATIBILITY_INDEX.md` row with every plugin-related change or review.
