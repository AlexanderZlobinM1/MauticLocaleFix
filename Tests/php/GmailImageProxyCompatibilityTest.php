<?php

declare(strict_types=1);

// Run in a separate PHP process per version because MAUTIC_VERSION is constant.
// Mautic service doubles keep this regression runnable without a database.
namespace Mautic\PluginBundle\Integration {
    class AbstractIntegration
    {
        protected array $keys = [];
        public bool $published = true;

        public function getIntegrationSettings(): array
        {
            return ['isPublished' => $this->published];
        }
    }
}

namespace Mautic\PluginBundle\Helper {
    class IntegrationHelper
    {
        public function __construct(private object $integration) {}
        public function getIntegrationObject(string $name): object { return $this->integration; }
    }
}

namespace {
    $autoload = getenv('LOCALE_FIX_TEST_AUTOLOAD') ?: dirname(__DIR__, 2).'/vendor/autoload.php';
    require $autoload;
    spl_autoload_register(static function (string $class): void {
        $prefix = 'MauticPlugin\\MauticLocaleFixBundle\\';
        if (str_starts_with($class, $prefix)) {
            require dirname(__DIR__, 2).'/'.str_replace('\\', '/', substr($class, strlen($prefix))).'.php';
        }
    });

    use MauticPlugin\MauticLocaleFixBundle\EventListener\EmailImageProxySubscriber;
    use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
    use Symfony\Component\HttpFoundation\Request;
    use Symfony\Component\HttpKernel\Event\RequestEvent;
    use Symfony\Component\HttpKernel\HttpKernelInterface;

    $version = $argv[1] ?? '7.2.0';
    $expected = true;
    if ('undefined' !== $version) {
        define('MAUTIC_VERSION', $version);
    }
    $assertions = 0;
    $check = static function (bool $condition, string $message) use (&$assertions, $version): void {
        ++$assertions;
        if (!$condition) { throw new \RuntimeException($version.': '.$message); }
    };
    $integration = new class extends MauticLocaleFixIntegration {
        public function setKeys(array $keys): void { $this->keys = $keys; }
    };
    $saved = [
        'gmail_image_proxy_open' => 'enabled',
        'calendar_enabled' => 'enabled',
        'calendar_week_start' => 0,
        'calendar_date_format' => 'iso',
        'time_display_format' => '24h',
    ];
    $integration->setKeys($saved);
    $builder = new class {
        public array $fields = [];
        public function add(string $name, string $type, array $options): self {
            $this->fields[$name] = $options;
            return $this;
        }
    };
    $integration->appendToForm($builder, $saved, 'keys');
    $check(isset($builder->fields['gmail_image_proxy_open']) === $expected, 'Google switch visibility');
    foreach (['calendar_enabled', 'calendar_week_start', 'calendar_date_format', 'time_display_format'] as $field) {
        $check(isset($builder->fields[$field]), 'Independent field remains: '.$field);
    }
    $check($integration->isCalendarFixEnabled(), 'Calendar remains enabled');
    $check(0 === $integration->getCalendarWeekStart(), 'Week start retained');
    $check('iso' === $integration->getCalendarDateFormat(), 'Date format retained');
    $check('24h' === $integration->getTimeDisplayFormat(), 'Time format retained');
    $check(['regional_settings'] === $integration->getSupportedFeatures(), 'Regional feature remains');
    $check($expected === $integration->isGmailImageProxyOpenEnabled(), 'Saved enabled key respects version');
    $config = require dirname(__DIR__, 2).'/Config/config.php';
    $events = $config['services']['events'];
    $check(isset($events['plugin.mauticlocalefix.email_image_proxy_subscriber']) === $expected, 'Google service registration');
    foreach (['asset_subscriber', 'integration_keys_subscriber', 'import_search_subscriber'] as $service) {
        $check(isset($events['plugin.mauticlocalefix.'.$service]), 'Independent service remains: '.$service);
    }
    $check(isset($config['services']['integrations']['mautic.integration.mauticlocalefix']), 'Integration remains registered');
    $check(isset($config['services']['command']['plugin.mauticlocalefix.command.configure']), 'Configuration command remains');
    $check(([] !== EmailImageProxySubscriber::getSubscribedEvents()) === $expected, 'Google event subscription');
    $helper = new \Mautic\PluginBundle\Helper\IntegrationHelper($integration);
    $subscriber = new EmailImageProxySubscriber($helper);
    $kernel = new class implements HttpKernelInterface {
        public function handle(Request $request, int $type = self::MAIN_REQUEST, bool $catch = true): \Symfony\Component\HttpFoundation\Response {
            return new \Symfony\Component\HttpFoundation\Response();
        }
    };
    $ua = 'Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)';
    foreach ([
        ['GET', '/email/abc123.gif', true, 'enabled', HttpKernelInterface::MAIN_REQUEST, $expected],
        ['GET', '/email/abc123.gif', false, 'enabled', HttpKernelInterface::MAIN_REQUEST, false],
        ['GET', '/email/abc123.gif', true, 'disabled', HttpKernelInterface::MAIN_REQUEST, false],
        ['GET', '/email/abc123.gif', true, null, HttpKernelInterface::MAIN_REQUEST, false],
        ['HEAD', '/email/abc123.gif', true, 'enabled', HttpKernelInterface::MAIN_REQUEST, false],
        ['GET', '/page', true, 'enabled', HttpKernelInterface::MAIN_REQUEST, false],
        ['GET', '/email/abc123.gif', true, 'enabled', HttpKernelInterface::SUB_REQUEST, false],
    ] as [$method, $path, $published, $enabled, $requestType, $changed]) {
        $integration->published = $published;
        $integration->setKeys(array_replace($saved, ['gmail_image_proxy_open' => $enabled]));
        $request = Request::create($path, $method, [], [], [], ['HTTP_USER_AGENT' => $ua]);
        $before = [$request->headers->all(), $request->server->all(), $request->attributes->all()];
        // Direct invocation also models an old cached container after a core upgrade.
        $subscriber->onKernelRequest(new RequestEvent($kernel, $request, $requestType));
        if ($changed) {
            $check('Mozilla/5.0' === $request->headers->get('User-Agent'), 'Legacy workaround executes');
            $check('Mozilla/5.0' === $request->server->get('HTTP_USER_AGENT'), 'Server UA normalized');
            $check($ua === $request->attributes->get('_mautic_locale_fix_original_user_agent'), 'Original UA preserved');
        } else {
            $check($before === [$request->headers->all(), $request->server->all(), $request->attributes->all()], 'Request entirely unchanged');
        }
    }
    echo "$version: $assertions assertions passed\n";
}
