<?php

return [
    'name'        => 'Mautic Locale Fix',
    'description' => 'Regional UI settings for Mautic without core patches.',
    'version'     => '1.0.7',
    'author'      => 'Sales Snap',
    'services'    => [
        'events' => [
            'plugin.mauticlocalefix.asset_subscriber' => [
                'class'     => MauticPlugin\MauticLocaleFixBundle\EventListener\AssetSubscriber::class,
                'arguments' => [
                    'mautic.helper.integration',
                    'mautic.helper.user',
                    'mautic.helper.core_parameters',
                ],
            ],
        ],
        'integrations' => [
            'mautic.integration.mauticlocalefix' => [
                'class'     => MauticPlugin\MauticLocaleFixBundle\Integration\MauticLocaleFixIntegration::class,
                'arguments' => [
                    'event_dispatcher',
                    'mautic.helper.cache_storage',
                    'doctrine.orm.entity_manager',
                    'request_stack',
                    'router',
                    'translator',
                    'logger',
                    'mautic.helper.encryption',
                    'mautic.lead.model.lead',
                    'mautic.lead.model.company',
                    'mautic.helper.paths',
                    'mautic.core.model.notification',
                    'mautic.lead.model.field',
                    'mautic.plugin.model.integration_entity',
                    'mautic.lead.model.dnc',
                    'mautic.lead.field.fields_with_unique_identifier',
                ],
            ],
        ],
    ],
];
