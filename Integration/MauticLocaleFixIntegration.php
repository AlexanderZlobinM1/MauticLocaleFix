<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\Integration;

use Mautic\CoreBundle\Form\Type\YesNoButtonGroupType;
use Mautic\PluginBundle\Integration\AbstractIntegration;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Form;
use Symfony\Component\Form\FormBuilder;

class MauticLocaleFixIntegration extends AbstractIntegration
{
    public const NAME = 'MauticLocaleFix';

    public const CALENDAR_ENABLED_FIELD = 'calendar_enabled';

    public const CALENDAR_WEEK_START_FIELD = 'calendar_week_start';

    public const CALENDAR_DATE_FORMAT_FIELD = 'calendar_date_format';

    public const TIME_DISPLAY_FORMAT_FIELD = 'time_display_format';

    public const GMAIL_IMAGE_PROXY_OPEN_FIELD = 'gmail_image_proxy_open';

    public function getName()
    {
        return self::NAME;
    }

    public function getDisplayName()
    {
        return 'Mautic Locale Fix';
    }

    public function getDescription()
    {
        return 'Regional UI settings for Mautic without core patches.';
    }

    public function getAuthenticationType()
    {
        return 'none';
    }

    public function getIcon()
    {
        return 'plugins/MauticLocaleFixBundle/Assets/img/mauticlocalefix.svg';
    }

    public function getPriority()
    {
        return 0;
    }

    public function getSupportedFeatures()
    {
        return [
            'regional_settings',
        ];
    }

    public function getRequiredKeyFields()
    {
        return [];
    }

    /**
     * @param FormBuilder|Form $builder
     * @param array            $data
     * @param string           $formArea
     */
    public function appendToForm(&$builder, $data, $formArea): void
    {
        if ('keys' !== $formArea) {
            return;
        }

        $builder
            ->add(
                self::CALENDAR_ENABLED_FIELD,
                YesNoButtonGroupType::class,
                [
                    'label' => 'mautic.integration.mauticlocalefix.calendar_enabled',
                    'data'  => array_key_exists(self::CALENDAR_ENABLED_FIELD, $data)
                        ? self::normalizeToggleValue($data[self::CALENDAR_ENABLED_FIELD], false)
                        : false,
                    'attr'  => [
                        'class'   => 'mauticlocalefix-calendar-toggle',
                        'tooltip' => 'mautic.integration.mauticlocalefix.calendar_enabled.tooltip',
                    ],
                ]
            )
            ->add(
                self::CALENDAR_WEEK_START_FIELD,
                ChoiceType::class,
                [
                    'label'       => 'mautic.integration.mauticlocalefix.calendar_week_start',
                    'required'    => true,
                    'choices'     => [
                        'mautic.integration.mauticlocalefix.week_start.sunday' => 0,
                        'mautic.integration.mauticlocalefix.week_start.monday' => 1,
                    ],
                    'data'        => $data[self::CALENDAR_WEEK_START_FIELD] ?? 1,
                    'placeholder' => false,
                    'attr'        => [
                        'class'   => 'form-control mauticlocalefix-calendar-dependent',
                        'data-mauticlocalefix-dependent' => 'calendar',
                        'tooltip' => 'mautic.integration.mauticlocalefix.calendar_week_start.tooltip',
                    ],
                ]
            )
            ->add(
                self::CALENDAR_DATE_FORMAT_FIELD,
                ChoiceType::class,
                [
                    'label'       => 'mautic.integration.mauticlocalefix.calendar_date_format',
                    'required'    => true,
                    'choices'     => [
                        'mautic.integration.mauticlocalefix.date_format.locale_medium' => 'locale_medium',
                        'mautic.integration.mauticlocalefix.date_format.locale_long'   => 'locale_long',
                        'mautic.integration.mauticlocalefix.date_format.iso'           => 'iso',
                        'mautic.integration.mauticlocalefix.date_format.numeric_dmy'   => 'numeric_dmy',
                        'mautic.integration.mauticlocalefix.date_format.numeric_mdy'   => 'numeric_mdy',
                    ],
                    'data'        => $data[self::CALENDAR_DATE_FORMAT_FIELD] ?? 'locale_medium',
                    'placeholder' => false,
                    'attr'        => [
                        'class'   => 'form-control mauticlocalefix-calendar-dependent',
                        'data-mauticlocalefix-dependent' => 'calendar',
                        'tooltip' => 'mautic.integration.mauticlocalefix.calendar_date_format.tooltip',
                    ],
                ]
            )
            ->add(
                self::TIME_DISPLAY_FORMAT_FIELD,
                ChoiceType::class,
                [
                    'label'       => 'mautic.integration.mauticlocalefix.time_display_format',
                    'required'    => true,
                    'choices'     => [
                        'mautic.integration.mauticlocalefix.time_format.native' => 'native',
                        'mautic.integration.mauticlocalefix.time_format.12h' => '12h',
                        'mautic.integration.mauticlocalefix.time_format.24h' => '24h',
                    ],
                    'data'        => $data[self::TIME_DISPLAY_FORMAT_FIELD] ?? 'native',
                    'placeholder' => false,
                    'attr'        => [
                        'class'   => 'form-control mauticlocalefix-feature-select',
                        'tooltip' => 'mautic.integration.mauticlocalefix.time_display_format.tooltip',
                    ],
                ]
            );

        if (!$this->isGmailImageProxyOpenSupported()) {
            return;
        }

        $builder->add(
            self::GMAIL_IMAGE_PROXY_OPEN_FIELD,
            YesNoButtonGroupType::class,
            [
                'label' => 'mautic.integration.mauticlocalefix.gmail_image_proxy_open',
                'data'  => array_key_exists(self::GMAIL_IMAGE_PROXY_OPEN_FIELD, $data)
                    ? self::normalizeToggleValue($data[self::GMAIL_IMAGE_PROXY_OPEN_FIELD], false)
                    : false,
                'attr'  => [
                    'class'   => 'mauticlocalefix-feature-toggle',
                    'tooltip' => 'mautic.integration.mauticlocalefix.gmail_image_proxy_open.tooltip',
                ],
            ]
        );
    }

    public function getFormNotes($section)
    {
        if ('custom' === $section) {
            return [
                'custom'     => true,
                'template'   => '@MauticLocaleFix/Integration/footer.html.twig',
                'parameters' => [],
            ];
        }

        return parent::getFormNotes($section);
    }

    public function isCalendarFixEnabled(): bool
    {
        return $this->isToggleEnabled(self::CALENDAR_ENABLED_FIELD, false);
    }

    public function getCalendarWeekStart(): int
    {
        $weekStart = (int) ($this->keys[self::CALENDAR_WEEK_START_FIELD] ?? 1);

        return $weekStart >= 0 && $weekStart <= 6 ? $weekStart : 1;
    }

    public function getCalendarDateFormat(): string
    {
        $format = (string) ($this->keys[self::CALENDAR_DATE_FORMAT_FIELD] ?? 'locale_medium');
        $allowed = [
            'locale_medium',
            'locale_long',
            'iso',
            'numeric_dmy',
            'numeric_mdy',
        ];

        return in_array($format, $allowed, true) ? $format : 'locale_medium';
    }

    public function getTimeDisplayFormat(): string
    {
        $format = (string) ($this->keys[self::TIME_DISPLAY_FORMAT_FIELD] ?? 'native');

        return in_array($format, ['native', '12h', '24h'], true) ? $format : 'native';
    }

    public function isGmailImageProxyOpenEnabled(): bool
    {
        return $this->isGmailImageProxyOpenSupported() &&
            $this->isToggleEnabled(self::GMAIL_IMAGE_PROXY_OPEN_FIELD, false);
    }

    public function isGmailImageProxyOpenSupported(): bool
    {
        return 7 === self::getMauticMajorVersion();
    }

    private static function getMauticMajorVersion(): ?int
    {
        $version = defined('MAUTIC_VERSION') ? (string) MAUTIC_VERSION : '';
        if (!preg_match('/^(\d+)/', $version, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }

    private function isToggleEnabled(string $field, bool $default): bool
    {
        if (!array_key_exists($field, $this->keys)) {
            return $default;
        }

        return self::normalizeToggleValue($this->keys[$field], $default);
    }

    private static function normalizeToggleValue(mixed $value, bool $default): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower(trim((string) $value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on', 'enabled'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'no', 'off', 'disabled', ''], true)) {
            return false;
        }

        return (bool) $value;
    }
}
