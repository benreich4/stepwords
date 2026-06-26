<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

function parse_clue_lines($text) {
    $lines = preg_split('/\r\n|\r|\n/', $text);
    $clues = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') continue;
        $line = preg_replace('/^\d+[\.\)]\s*/', '', $line);
        $line = preg_replace('/^[-*•]\s*/', '', $line);
        $line = trim($line);
        if ($line !== '') {
            $clues[] = $line;
        }
        if (count($clues) >= 10) break;
    }
    return $clues;
}

function openai_chat_completion($apiKey, $model, $payload) {
    if (function_exists('curl_init')) {
        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 45,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            return ['ok' => false, 'httpCode' => 502, 'error' => 'Failed to reach OpenAI: ' . $curlError];
        }

        return ['ok' => true, 'httpCode' => $httpCode, 'body' => $response];
    }

    if (!filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        return [
            'ok' => false,
            'httpCode' => 503,
            'error' => 'Server PHP is missing the curl extension and allow_url_fopen is disabled. Install php-curl for your PHP-FPM version (e.g. apt install php8.3-curl).',
        ];
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$apiKey}\r\n",
            'content' => $payload,
            'timeout' => 45,
            'ignore_errors' => true,
        ],
    ]);

    $response = @file_get_contents('https://api.openai.com/v1/chat/completions', false, $ctx);
    if ($response === false) {
        $err = error_get_last();
        $msg = is_array($err) && isset($err['message']) ? $err['message'] : 'unknown error';
        return ['ok' => false, 'httpCode' => 502, 'error' => 'Failed to reach OpenAI: ' . $msg];
    }

    $httpCode = 200;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $headerLine) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/', $headerLine, $m)) {
                $httpCode = (int) $m[1];
                break;
            }
        }
    }

    return ['ok' => true, 'httpCode' => $httpCode, 'body' => $response];
}

$configFile = __DIR__ . '/openai-config.php';
if (!file_exists($configFile)) {
    http_response_code(503);
    echo json_encode(['error' => 'Clue suggestions are not configured on this server.']);
    exit;
}

$config = require $configFile;
if (!is_array($config)) {
    http_response_code(503);
    echo json_encode(['error' => 'openai-config.php must return an array.']);
    exit;
}

$apiKey = isset($config['api_key']) ? trim((string) $config['api_key']) : '';
$model = isset($config['model']) ? trim((string) $config['model']) : 'gpt-4o-mini';

if ($apiKey === '' || $apiKey === 'sk-your-openai-api-key-here') {
    http_response_code(503);
    echo json_encode(['error' => 'OpenAI API key is not configured.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$answer = isset($input['answer']) ? trim((string) $input['answer']) : '';

if ($answer === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing answer']);
    exit;
}

if (strlen($answer) > 80) {
    http_response_code(400);
    echo json_encode(['error' => 'Answer is too long']);
    exit;
}

$prompt = <<<PROMPT
You are an expert crossword constructor writing NYT-quality clues. Given an answer, generate 10 clue options. Match the answer's tense, part of speech, plurality, person, and register exactly. Avoid using any word from the answer in the clue. Include a mix of clean definitions, idioms/fill-in-the-blanks, pop-culture or trivia references, and clever misdirecting "?" clues. Prefer short, elegant clues that are fair, specific, and satisfying. Flag any clue that may be grammatically loose, obscure, dated, or factually risky. Answer ONLY with the clue list with a newline separating each clue.

Answer: {$answer}
PROMPT;

$payload = json_encode([
    'model' => $model,
    'messages' => [
        ['role' => 'user', 'content' => $prompt],
    ],
    'temperature' => 0.8,
]);

$result = openai_chat_completion($apiKey, $model, $payload);
if (!$result['ok']) {
    http_response_code($result['httpCode']);
    echo json_encode(['error' => $result['error']]);
    exit;
}

$data = json_decode($result['body'], true);
$httpCode = (int) $result['httpCode'];
if ($httpCode < 200 || $httpCode >= 300) {
    $msg = 'OpenAI request failed';
    if (is_array($data) && isset($data['error']['message'])) {
        $msg = (string) $data['error']['message'];
    }
    http_response_code(502);
    echo json_encode(['error' => $msg]);
    exit;
}

$content = '';
if (is_array($data) && isset($data['choices'][0]['message']['content'])) {
    $content = trim((string) $data['choices'][0]['message']['content']);
}

$clues = parse_clue_lines($content);

if (count($clues) === 0) {
    http_response_code(502);
    echo json_encode(['error' => 'No clues returned from OpenAI']);
    exit;
}

echo json_encode(['clues' => $clues]);
