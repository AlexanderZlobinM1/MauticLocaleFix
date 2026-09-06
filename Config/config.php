<?php

return [
    'name'        => 'Mautic Locale Fix',
    'description' => 'Regional UI settings for Mautic without core patches.',
    'version'     => '1.0.42',
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
            'plugin.mauticlocalefix.email_image_proxy_subscriber' => [
                'class'     => MauticPlugin\MauticLocaleFixBundle\EventListener\EmailImageProxySubscriber::class,
                'arguments' => [
                    'mautic.helper.integration',
                ],
            ],
            'plugin.mauticlocalefix.integration_keys_subscriber' => [
                'class' => MauticPlugin\MauticLocaleFixBundle\EventListener\IntegrationKeysSubscriber::class,
            ],
            'plugin.mauticlocalefix.import_search_subscriber' => [
                'class'     => MauticPlugin\MauticLocaleFixBundle\EventListener\ImportSearchSubscriber::class,
                'arguments' => [
                    'mautic.helper.integration',
                    'translator',
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
                    'mauticlocalefixbundle.helper.encryption',
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
        'command' => [
            'plugin.mauticlocalefix.command.configure' => [
                'class'     => MauticPlugin\MauticLocaleFixBundle\Command\ConfigureCommand::class,
                'arguments' => [
                    'mautic.helper.integration',
                ],
                'tag'       => 'console.command',
            ],
        ],
    ],
];
