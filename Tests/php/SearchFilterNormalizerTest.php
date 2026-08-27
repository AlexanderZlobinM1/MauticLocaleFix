<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2).'/Helper/SearchFilterNormalizer.php';

use MauticPlugin\MauticLocaleFixBundle\Helper\SearchFilterNormalizer;

$normalizer = new SearchFilterNormalizer();

$cases = [
    [
        'ID импорта:287 Действия импорта:updated',
        ['import_id' => 'ID импорта', 'import_action' => 'Действия импорта'],
        'import_id:287 import_action:updated',
    ],
    [
        'Importkennung:287 Importaktion:inserted',
        ['import_id' => 'Importkennung', 'import_action' => 'Importaktion'],
        'import_id:287 import_action:inserted',
    ],
    [
        '(ID импорта:287 OR ID импорта:288)',
        ['import_id' => 'ID импорта'],
        '(import_id:287 OR import_id:288)',
    ],
    [
        'import_id:287 import_action:updated',
        ['import_id' => 'import_id', 'import_action' => 'import_action'],
        'import_id:287 import_action:updated',
    ],
    [
        'company:"ID импорта:287"',
        ['import_id' => 'ID импорта'],
        'company:"ID импорта:287"',
    ],
    [
        'company:"prefix ID импорта:287 suffix"',
        ['import_id' => 'ID импорта'],
        'company:"prefix ID импорта:287 suffix"',
    ],
];

foreach ($cases as $index => [$search, $commands, $expected]) {
    $actual = $normalizer->normalize($search, $commands);
    if ($expected !== $actual) {
        fwrite(STDERR, sprintf("Case %d failed:\nexpected: %s\nactual:   %s\n", $index + 1, $expected, $actual));
        exit(1);
    }
}

echo "SearchFilterNormalizer tests passed\n";
