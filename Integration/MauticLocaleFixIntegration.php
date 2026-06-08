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
            );
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
}

