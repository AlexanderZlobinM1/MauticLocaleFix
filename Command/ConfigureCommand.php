<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\Command;

use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class ConfigureCommand extends Command
{
    private const COMMAND_NAME = 'mautic:locale-fix:configure';

    protected static $defaultName = self::COMMAND_NAME;

    public function __construct(private IntegrationHelper $integrationHelper)
    {
        parent::__construct(self::COMMAND_NAME);
    }

    protected function configure(): void
    {
        $this
            ->setDescription('Configure the Mautic Locale Fix integration through Mautic services.')
            ->addOption('published', null, InputOption::VALUE_REQUIRED, 'Publish the integration: 1 or 0')
            ->addOption(
                'gmail-image-proxy-open',
                null,
                InputOption::VALUE_REQUIRED,
                'Count Gmail image proxy opens: 1 or 0'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $integration = $this->integrationHelper->getIntegrationObject(MauticLocaleFixIntegration::NAME);
        if (!$integration instanceof MauticLocaleFixIntegration) {
            $output->writeln('<error>Mautic Locale Fix integration is not registered.</error>');

            return Command::FAILURE;
        }

        $settings = $integration->getIntegrationSettings();
        if (null === $settings) {
            $output->writeln('<error>Mautic Locale Fix integration settings are unavailable.</error>');

            return Command::FAILURE;
        }

        $changed = false;
        $published = $this->parseBooleanOption($input, 'published');
        if (null !== $published) {
            $settings->setIsPublished($published);
            $changed = true;
        }

        $gmailProxyOpen = $this->parseBooleanOption($input, 'gmail-image-proxy-open');
        if (null !== $gmailProxyOpen) {
            $keys = $integration->getDecryptedApiKeys($settings);
            $keys[MauticLocaleFixIntegration::GMAIL_IMAGE_PROXY_OPEN_FIELD] = $gmailProxyOpen;
            $integration->encryptAndSetApiKeys($keys, $settings);
            $changed = true;
        }

        if ($changed) {
            $integration->persistIntegrationSettings();
        }

        $output->writeln(sprintf(
            '<info>Mautic Locale Fix configured: published=%s gmail_image_proxy_open=%s</info>',
            $settings->getIsPublished() ? '1' : '0',
            $integration->isGmailImageProxyOpenEnabled() ? '1' : '0'
        ));

        return Command::SUCCESS;
    }

    private function parseBooleanOption(InputInterface $input, string $name): ?bool
    {
        $raw = $input->getOption($name);
        if (null === $raw) {
            return null;
        }

        $normalized = strtolower(trim((string) $raw));
        if (in_array($normalized, ['1', 'true', 'yes', 'on', 'enabled'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off', 'disabled'], true)) {
            return false;
        }

        throw new \InvalidArgumentException(sprintf('--%s must be 1 or 0.', $name));
    }
}
