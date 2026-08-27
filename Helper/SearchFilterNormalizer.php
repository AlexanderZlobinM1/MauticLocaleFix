<?php

declare(strict_types=1);

namespace MauticPlugin\MauticLocaleFixBundle\Helper;

final class SearchFilterNormalizer
{
    /**
     * @param array<string, string> $localizedCommands Canonical command => translated command.
     */
    public function normalize(string $search, array $localizedCommands): string
    {
        $commands = [];
        foreach ($localizedCommands as $canonical => $localized) {
            $localized = trim($localized);
            if ('' === $localized || $canonical === $localized) {
                continue;
            }

            $commands[$localized.':'] = $canonical.':';
        }

        if ([] === $commands) {
            return $search;
        }

        $normalized = '';
        $inQuotes   = false;
        $length     = strlen($search);

        for ($offset = 0; $offset < $length; ++$offset) {
            $character = $search[$offset];
            if ('"' === $character && (0 === $offset || '\\' !== $search[$offset - 1])) {
                $inQuotes = !$inQuotes;
                $normalized .= $character;

                continue;
            }

            $previous = 0 === $offset ? '' : $search[$offset - 1];
            $boundary = 0 === $offset || '(' === $previous || ctype_space($previous);
            if (!$inQuotes && $boundary) {
                foreach ($commands as $localized => $canonical) {
                    if (0 === substr_compare($search, $localized, $offset, strlen($localized))) {
                        $normalized .= $canonical;
                        $offset += strlen($localized) - 1;

                        continue 2;
                    }
                }
            }

            $normalized .= $character;
        }

        return $normalized;
    }
}
