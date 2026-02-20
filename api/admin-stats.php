<?php
/**
 * Admin stats API. Requires authentication via session (set by admin-auth.php).
 * Returns ratings, completions by day, submissions count, and other stats.
 */
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (empty($_SESSION['admin_authenticated'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$ratingsFile = sys_get_temp_dir() . '/stepwords-ratings.json';
$completionsFile = sys_get_temp_dir() . '/stepwords-puzzle-completions.log';
$submissionsDir = __DIR__ . '/submissions';

$out = [
    'ratings' => [],
    'completions_by_day' => [],
    'completions_by_puzzle' => [],
    'completions_by_mode' => [],
    'submissions' => [],
    'summary' => [],
];

// --- Ratings ---
$ratingsRaw = ['ratings' => []];
if (file_exists($ratingsFile)) {
    $raw = file_get_contents($ratingsFile);
    $decoded = json_decode($raw, true);
    if (is_array($decoded) && isset($decoded['ratings']) && is_array($decoded['ratings'])) {
        $ratingsRaw = $decoded;
    }
}

// Dedupe ratings: latest per (puzzle_id, mode, user_id)
$byKey = [];
foreach ($ratingsRaw['ratings'] as $r) {
    if (!isset($r['user_id'], $r['puzzle_id'], $r['rating'], $r['ts'])) continue;
    $rating = max(1, min(5, (int) $r['rating']));
    $key = $r['puzzle_id'] . '|' . ($r['mode'] ?? 'main') . '|' . $r['user_id'];
    if (!isset($byKey[$key]) || $r['ts'] > $byKey[$key]['ts']) {
        $byKey[$key] = [
            'puzzle_id' => $r['puzzle_id'],
            'mode' => $r['mode'] ?? 'main',
            'user_id' => $r['user_id'],
            'rating' => $rating,
            'ts' => $r['ts'],
        ];
    }
}

// Aggregate by puzzle
$aggregates = [];
foreach ($byKey as $r) {
    $k = $r['puzzle_id'] . '|' . $r['mode'];
    if (!isset($aggregates[$k])) {
        $aggregates[$k] = ['puzzle_id' => $r['puzzle_id'], 'mode' => $r['mode'], 'sum' => 0, 'count' => 0, 'by_rating' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]];
    }
    $aggregates[$k]['sum'] += $r['rating'];
    $aggregates[$k]['count']++;
    $aggregates[$k]['by_rating'][$r['rating']] = ($aggregates[$k]['by_rating'][$r['rating']] ?? 0) + 1;
}

foreach ($aggregates as $k => &$agg) {
    $agg['avg'] = $agg['count'] > 0 ? round($agg['sum'] / $agg['count'], 2) : 0;
    unset($agg['sum']);
}
unset($agg);

$out['ratings'] = [
    'by_puzzle' => array_values($aggregates),
    'total_count' => array_sum(array_column($aggregates, 'count')),
    'raw_count' => count($ratingsRaw['ratings']),
];

// Sort by avg desc, then count desc
usort($out['ratings']['by_puzzle'], function ($a, $b) {
    if (abs(($a['avg'] ?? 0) - ($b['avg'] ?? 0)) < 0.01) {
        return ($b['count'] ?? 0) - ($a['count'] ?? 0);
    }
    return ($b['avg'] ?? 0) > ($a['avg'] ?? 0) ? 1 : -1;
});

// --- Completions ---
$completionsByDay = [];
$completionsByPuzzle = [];
$completionsByMode = ['main' => 0, 'quick' => 0, 'other' => 0];

if (file_exists($completionsFile)) {
    $lines = file($completionsFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $entry = json_decode(trim($line), true);
        if (!is_array($entry) || !isset($entry['ts'])) continue;
        $mode = $entry['mode'] ?? 'main';
        $puzzleId = $entry['puzzle_id'] ?? 'unknown';
        $date = date('Y-m-d', (int) $entry['ts']);
        $completionsByDay[$date] = ($completionsByDay[$date] ?? 0) + 1;
        $completionsByPuzzle[$puzzleId] = ($completionsByPuzzle[$puzzleId] ?? 0) + 1;
        if (in_array($mode, ['main', 'quick', 'other'], true)) {
            $completionsByMode[$mode]++;
        }
    }
}

ksort($completionsByDay);
arsort($completionsByPuzzle);

$out['completions_by_day'] = $completionsByDay;
$out['completions_by_puzzle'] = $completionsByPuzzle;
$out['completions_by_mode'] = $completionsByMode;
$out['completions_total'] = array_sum($completionsByDay);

// --- Submissions ---
$submissionCount = 0;
$submissionList = [];
if (is_dir($submissionsDir)) {
    $files = glob($submissionsDir . '/submission-*.json');
    $submissionCount = count($files);
    foreach (array_slice($files, -20) as $f) {
        $raw = @file_get_contents($f);
        if ($raw === false) continue;
        $data = json_decode($raw, true);
        $submissionList[] = [
            'filename' => basename($f),
            'author' => $data['author'] ?? null,
            'email' => $data['email'] ?? null,
            'submittedAt' => $data['submittedAt'] ?? null,
        ];
    }
    $submissionList = array_reverse($submissionList);
}

$out['submissions'] = [
    'total' => $submissionCount,
    'recent' => $submissionList,
];

// --- Summary ---
$out['summary'] = [
    'total_ratings' => $out['ratings']['total_count'],
    'total_completions' => $out['completions_total'],
    'total_submissions' => $submissionCount,
    'unique_days_with_completions' => count($completionsByDay),
    'unique_puzzles_rated' => count($aggregates),
];

echo json_encode($out);
