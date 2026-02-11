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
$puzzleId = isset($input['puzzle_id']) ? (string) $input['puzzle_id'] : 'unknown';
$mode = isset($input['mode']) ? (string) $input['mode'] : 'main';
$ts = isset($input['ts']) ? (int) $input['ts'] : time();

// Use temp dir (usually writable); fall back to api dir
$logFile = sys_get_temp_dir() . '/stepwords-puzzle-completions.log';

$entry = json_encode([
    'ts' => $ts,
    'puzzle_id' => $puzzleId,
    'mode' => $mode,
]) . "\n";

@file_put_contents($logFile, $entry, LOCK_EX | FILE_APPEND);

echo json_encode(['ok' => true]);
