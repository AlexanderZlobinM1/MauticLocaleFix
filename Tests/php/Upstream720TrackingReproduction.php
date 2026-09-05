<?php
// Only persistence/configuration/cache boundaries are substituted.
namespace Mautic\CoreBundle\Entity {
    class IpAddressRepository {
        public function findOneByIpAddress($ip) { return new IpAddress($ip); }
        public function saveEntity($entity) { throw new \RuntimeException('Unexpected DB write'); }
    }
}
namespace {
    require getenv('LOCALE_FIX_TEST_AUTOLOAD') ?: dirname(__DIR__, 2).'/vendor/autoload.php';
    if ('6.5.0.0' !== \Composer\InstalledVersions::getVersion('matomo/device-detector')) {
        throw new \RuntimeException('Use Matomo 6.5.0 from the Mautic 7.2.0 lock file');
    }
    $root = rtrim((string) getenv('MAUTIC_720_SOURCE'), '/').'/';
    foreach ([
        'CoreBundle/Helper/IpLookupHelper.php' => 'ddf67f36364106074e9d487825545118d3f22630836074bd9f032ace215825f3',
        'CoreBundle/Entity/IpAddress.php' => 'ed5f143210813716102c80f89ffb0c4be716afb7f388199893d64daf7068aa16',
        'EmailBundle/Model/EmailModel.php' => '1b17cd09272258b0511b030717a86be7f7686dd3d69c1241a941c055d108cfb0',
    ] as $file => $sha256) {
        if ($sha256 !== hash_file('sha256', $root.$file)) {
            throw new \RuntimeException('Not the audited Mautic 7.2.0 source: '.$file);
        }
    }
    // Verify the real email-open entry point still returns at this exact guard.
    $emailModel = file_get_contents($root.'EmailBundle/Model/EmailModel.php');
    if (!str_contains($emailModel, 'if (!$this->ipLookupHelper->isRequestTrackable()) {'."\n".'            return;')) {
        throw new \RuntimeException('Email tracking guard changed; re-audit the complete path');
    }
    foreach (['CoreBundle/Entity/IpAddress.php', 'CoreBundle/Helper/CoreParametersHelper.php', 'LeadBundle/Tracker/Factory/DeviceDetectorFactory/DeviceDetectorFactoryInterface.php', 'CoreBundle/Helper/IpLookupHelper.php'] as $file) { require $root.$file; }
    $params = new class extends \Mautic\CoreBundle\Helper\CoreParametersHelper {
        public function __construct() {}
        public function get($name, $default = null) {
            return match ($name) {
                'do_not_track_ips', 'do_not_track_bots', 'do_not_track_internal_ips' => [],
                'track_private_ip_ranges' => true,
                'anonymize_ip' => false,
                default => $default,
            };
        }
    };
    $factory = new class implements \Mautic\LeadBundle\Tracker\Factory\DeviceDetectorFactory\DeviceDetectorFactoryInterface {
        public function create($userAgent): \DeviceDetector\DeviceDetector {
            return new \DeviceDetector\DeviceDetector((string) $userAgent);
        }
    };
    foreach ([
        'browser' => 'Mozilla/5.0',
        'GoogleImageProxy' => 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)',
        'GmailImageProxy (upstream test)' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) GmailImageProxy',
    ] as $label => $ua) {
        $request = \Symfony\Component\HttpFoundation\Request::create('/email/abc123.gif', 'GET', [], [], [], ['REMOTE_ADDR'=>'8.8.4.4','HTTP_USER_AGENT'=>$ua]);
        $stack = new \Symfony\Component\HttpFoundation\RequestStack();
        $stack->push($request);
        $helper = new \Mautic\CoreBundle\Helper\IpLookupHelper($stack, new \Mautic\CoreBundle\Entity\IpAddressRepository(), $params, $factory);
        $helper->reset();
        $trackable = $helper->isRequestTrackable();
        printf("%s: isRequestTrackable=%s; IP isTrackable=%s\n", $label, $trackable?'true':'false', $helper->getIpAddress()->isTrackable()?'true':'false');
        if ($trackable !== ('browser' === $label)) { throw new \RuntimeException('Unexpected result'); }
    }
}
