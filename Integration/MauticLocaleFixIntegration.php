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

    public const CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD = 'campaign_datetime_utc_submit';

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
        return 'mautic.integration.mauticlocalefix.description';
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
                        ? (bool) $data[self::CALENDAR_ENABLED_FIELD]
                        : true,
                    'attr'  => [
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
                        'class'   => 'form-control',
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
                        'class'   => 'form-control',
                        'tooltip' => 'mautic.integration.mauticlocalefix.calendar_date_format.tooltip',
                    ],
                ]
            )
            ->add(
                self::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD,
                YesNoButtonGroupType::class,
                [
                    'label' => 'mautic.integration.mauticlocalefix.campaign_datetime_utc_submit',
                    'data'  => array_key_exists(self::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD, $data)
                        ? (bool) $data[self::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD]
                        : true,
                    'attr'  => [
                        'tooltip' => 'mautic.integration.mauticlocalefix.campaign_datetime_utc_submit.tooltip',
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
        if (!array_key_exists(self::CALENDAR_ENABLED_FIELD, $this->keys)) {
            return true;
        }

        return (bool) $this->keys[self::CALENDAR_ENABLED_FIELD];
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

    public function isCampaignDateTimeUtcSubmitEnabled(): bool
    {
        if (!array_key_exists(self::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD, $this->keys)) {
            return true;
        }

        return (bool) $this->keys[self::CAMPAIGN_DATETIME_UTC_SUBMIT_FIELD];
    }
}
