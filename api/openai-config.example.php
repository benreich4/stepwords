<?php
/**
 * OpenAI configuration for clue suggestions.
 * Copy to openai-config.php and set your API key:
 *
 *   cp api/openai-config.example.php api/openai-config.php
 */
return [
    'api_key' => 'sk-your-openai-api-key-here',
    // Optional override (gpt-5.5 for best quality; gpt-4o-mini for cheaper/faster)
    'model' => 'gpt-5.5',
];
