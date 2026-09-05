# Mautic 7.2.0 Google tracking audit

Audited on 5 September 2026. The workaround must remain available on 7.2.0.
This release adds evidence and regression coverage; it does not change runtime
registration, UI visibility, settings, or independent Locale Fix features.

## Exact upstream baseline

- Mautic tag `7.2.0`, commit
  [`504af18cf90d8fbe701fde55cb1a94603db9e21a`](https://github.com/mautic/mautic/tree/504af18cf90d8fbe701fde55cb1a94603db9e21a).
- Its [Composer lock](https://github.com/mautic/mautic/blob/7.2.0/composer.lock)
  pins `matomo/device-detector` to `6.5.0`.
- PR [#15870](https://github.com/mautic/mautic/pull/15870), merged as
  `b3ac8e050c878006e846f14b711b2235217339c3`, adds Matomo scoring in
  `BotRatioHelper` and a Gmail case to
  [BotRatioHelperFunctionalTest](https://github.com/mautic/mautic/blob/7.2.0/app/bundles/EmailBundle/Tests/Functional/BotRatioHelperFunctionalTest.php).
  Its merged status and test fixture do not establish that the earlier tracking
  gate accepts actual proxy requests.

## Blocking path

1. [`EmailModel::hitEmail()`](https://github.com/mautic/mautic/blob/7.2.0/app/bundles/EmailBundle/Model/EmailModel.php#L442)
   returns immediately when `IpLookupHelper::isRequestTrackable()` is false,
   before `BotRatioHelper` scoring and all email-stat updates.
2. [`IpLookupHelper::getIpAddress()`](https://github.com/mautic/mautic/blob/7.2.0/app/bundles/CoreBundle/Helper/IpLookupHelper.php#L162)
   invokes the Matomo detector and puts the requesting IP on the do-not-track
   list when `isBot()` is true. `isRequestTrackable()` returns the resulting
   `IpAddress::isTrackable()` decision.
3. Matomo 6.5.0 classifies the real `via ggpht.com GoogleImageProxy` signature
   as `Gmail Image Proxy`, and the `GmailImageProxy` signature from the upstream
   test as `Generic Bot`.

Observed results from the **actual upstream helper and IP entity**, not a
reimplementation of their decisions:

| GET tracking-pixel request | isRequestTrackable | IP isTrackable |
| --- | --- | --- |
| Normal browser (`Mozilla/5.0`) | true | true |
| GoogleImageProxy | false | false |
| GmailImageProxy from upstream test | false | false |

The fixture uses a public client IP, empty operator IP/bot exclusion lists, no
privacy headers, and a fresh helper cache per request. Only database persistence,
configuration loading, and the optional detector cache are replaced. The real
request stack, Matomo parser, `IpLookupHelper`, and `IpAddress` execute. SHA-256
checks pin the decision-making source files and `EmailModel`; the test also
checks its early-return guard. This is an isolated core tracking-gate
reproduction, not a full database-backed email delivery or browser acceptance
suite. No production instance is modified.

## Reproduce outside the workspace

Run from the plugin checkout. The source is downloaded to a temporary directory;
no third-party implementation or generated dependencies belong in this repository.

```bash
fixture=$(mktemp -d /private/tmp/locale-fix-upstream.XXXXXX)
composer require --working-dir="$fixture" --no-interaction \
  matomo/device-detector:6.5.0 symfony/http-kernel:^6.4
for file in CoreBundle/Entity/IpAddress.php \
  CoreBundle/Helper/CoreParametersHelper.php \
  LeadBundle/Tracker/Factory/DeviceDetectorFactory/DeviceDetectorFactoryInterface.php \
  CoreBundle/Helper/IpLookupHelper.php EmailBundle/Model/EmailModel.php; do
  mkdir -p "$fixture/source/$(dirname "$file")"
  curl -fsSL "https://raw.githubusercontent.com/mautic/mautic/504af18cf90d8fbe701fde55cb1a94603db9e21a/app/bundles/$file" \
    -o "$fixture/source/$file"
done
export LOCALE_FIX_TEST_AUTOLOAD="$fixture/vendor/autoload.php"
MAUTIC_720_SOURCE="$fixture/source" php Tests/php/Upstream720TrackingReproduction.php
php Tests/php/GmailImageProxyCompatibilityTest.php 7.1.3
php Tests/php/GmailImageProxyCompatibilityTest.php 7.2.0
php Tests/php/SearchFilterNormalizerTest.php
node Tests/js/locale-fix.test.js
```

The compatibility tests use small Mautic service doubles and real Symfony request
objects. They check switch visibility, service/event registration, enabled proxy
request rewriting, unpublished/disabled/unset settings, HEAD/non-pixel/subrequests,
and preservation of the regional form fields and other registered services.
Both versions must pass 27 assertions. Remove the temporary fixture after use.

Reconsider an upper version bound only after a newer core version demonstrably
accepts these requests through its complete pre-tracking gate.
