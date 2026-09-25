# Compatibility index

Last reviewed: 25 September 2026.

Current published release: `1.0.45` (`55c16dc`, tag `v1.0.45`). Canonical main is
`1.0.50` (`d48118f`). The
1.0.50 change restores the 1.0.44 suffix-style timezone label on wide scheduled
controls and omits the label entirely at widths of 420 px or less. JavaScript
regressions cover wide rendering, narrow omission, and width changes; PHP syntax
and diff checks pass. A local browser emulation using Mautic 7.2 compiled CSS
showed the 1.0.44 suffix on the wide controls and no added labels on the 248 px
event-time controls. No live Mautic or Operations acceptance was run for 1.0.50.
Compatibility marks remain tied to 1.0.45. Preceding release `1.0.44` is
`8961bcb`. Release `1.0.45` adds an opt-in inactive-campaign schedule editor; its
default preserves Mautic's disabled date/time inputs. Local PHP and JavaScript
regression checks pass on Mautic 6.0.9 and 7.2.0 dependency trees.
The operator manually accepted the campaign editor UI checks on Bigartmail. The
Operations database-only check passed on the installed 1.0.45 tree: changing
only the user's timezone from UTC to Europe/Belgrade left stored activation and
deactivation timestamps unchanged; timezone was restored to UTC and the final
database values matched baseline. This evidence does not identify the installed
tree as local candidate R6: the installed `AssetSubscriber.php` and
`settings-toggle-compat.js` hashes differed from the R6 archive, SHA-256
`49a98574d7c2903340b6ce965c6aab1cf56abdd7ed3d08dd4ed2ff7b8ac81f92`. The
operator explicitly directed publication after verifying the current installed
version and manually accepted UI; the database evidence is attributed only to
that installed tree. An earlier, separate Operations attempt mistakenly saved
the campaign after a timezone change, temporarily changing the stored time;
they restored the original 05:00Z instant through the UI and independently
confirmed it before the no-save timezone-only check. No schema or migration is
included.
Declared support: Mautic 6.x, 7.x; PHP >=8.1.

| Mautic | Status | Confirmed scope |
| --- | --- | --- |
| 5.2.10 | — | Outside declared range |
| 6.0.9 | ✓ | PHP compatibility regression: 29 assertions, 23 Sep 2026; 1.0.44 runtime integration retained |
| 7.1.3 | ✓ | Runtime integration plus 27 assertions, 6 Sep 2026 |
| 7.2.0 | ✓ | PHP compatibility regression: 31 assertions; operator-confirmed editor UI; timezone-only DB check on installed 1.0.45 tree (not exact local candidate), 23 Sep 2026 |

The first Operations attempt saved a campaign date and changed its stored
instant; Operations restored the original campaign value and independently
verified the later timezone-only test without opening/saving the campaign.
Changing the profile timezone alone does not rewrite stored schedule values;
saving a changed campaign date does update the stored instant as expected. The
operator explicitly accepted the UI result and authorized publication after the
timezone-only DB check on the installed 1.0.45 tree. This does not constitute
exact-artifact DB acceptance for local R6. No schema or migration is included.

The Mautic 7 image-proxy switch and Mautic 6 disabled path retain regression coverage. Update this file and the workspace `../../COMPATIBILITY_INDEX.md` row with every plugin-related change or review.


Current main note (25 September 2026): 1.0.50 restores the suffix text and
native inline position used by 1.0.44 on controls wider than 420 px. At 420 px or
less the plugin does not insert a timezone label, leaving Mautic's narrow
controls untouched. JavaScript regression tests pass; no live UI acceptance was
run for this change. Compatibility marks remain tied to release 1.0.45.
