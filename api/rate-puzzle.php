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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$puzzleId = isset($input['puzzle_id']) ? (string) $input['puzzle_id'] : '';
$mode = isset($input['mode']) ? (string) $input['mode'] : 'main';
$rating = isset($input['rating']) ? (int) $input['rating'] : 0;
$userId = isset($input['user_id']) ? (string) $input['user_id'] : '';

if (!$puzzleId || $rating < 1 || $rating > 5 || !$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid puzzle_id, rating (1-5), or user_id']);
    exit;
}

$mode = in_array($mode, ['main', 'quick', 'other'], true) ? $mode : 'main';

// Use temp dir (usually writable); same pattern as puzzle-complete.php
$dataFile = sys_get_temp_dir() . '/stepwords-ratings.json';
$ts = time();
$entry = [
    'user_id' => $userId,
    'puzzle_id' => $puzzleId,
    'mode' => $mode,
    'rating' => $rating,
    'ts' => $ts,
];

$data = ['ratings' => []];
if (file_exists($dataFile)) {
    $raw = @file_get_contents($dataFile);
    if ($raw) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded) && isset($decoded['ratings']) && is_array($decoded['ratings'])) {
            $data = $decoded;
        }
    }
}

// Append new rating (we keep history; latest per user per puzzle is used for aggregates)
$data['ratings'][] = $entry;

// Write with lock
$fp = fopen($dataFile, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
    flock($fp, LOCK_UN);
    fclose($fp);
} else {
    if ($fp) fclose($fp);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save rating']);
    exit;
}

echo json_encode(['ok' => true]);
