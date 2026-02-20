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

// Build completions by (puzzle_id, mode) and avg solve time/hints for ratings enrichment (before we output ratings)
$completionsByPuzzleMode = [];
$avgElapsedByPuzzleMode = []; // key => ['sum' => n, 'count' => n]
$avgHintsByPuzzleMode = [];   // key => ['sum' => n, 'count' => n]
if (file_exists($completionsFile)) {
    $lines = file($completionsFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $entry = json_decode(trim($line), true);
        if (!is_array($entry) || !isset($entry['ts'])) continue;
        $mode = $entry['mode'] ?? 'main';
        $puzzleId = (string) ($entry['puzzle_id'] ?? 'unknown');
        $key = $puzzleId . '|' . $mode;
        $completionsByPuzzleMode[$key] = ($completionsByPuzzleMode[$key] ?? 0) + 1;
        if (isset($entry['elapsed_ms']) && $entry['elapsed_ms'] >= 0) {
            if (!isset($avgElapsedByPuzzleMode[$key])) $avgElapsedByPuzzleMode[$key] = ['sum' => 0, 'count' => 0];
            $avgElapsedByPuzzleMode[$key]['sum'] += (int) $entry['elapsed_ms'];
            $avgElapsedByPuzzleMode[$key]['count']++;
        }
        if (isset($entry['hint_count']) && $entry['hint_count'] >= 0) {
            if (!isset($avgHintsByPuzzleMode[$key])) $avgHintsByPuzzleMode[$key] = ['sum' => 0, 'count' => 0];
            $avgHintsByPuzzleMode[$key]['sum'] += (int) $entry['hint_count'];
            $avgHintsByPuzzleMode[$key]['count']++;
        }
    }
}

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

// Enrich with date from manifests (try multiple paths for different deployment setups)
$dateLookup = [];
$manifestConfig = [
    'main' => [
        __DIR__ . '/../public/puzzles/index.json',
        __DIR__ . '/../dist/puzzles/index.json',
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/puzzles/index.json' : null),
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/dist/puzzles/index.json' : null),
    ],
    'quick' => [
        __DIR__ . '/../public/quick/index.json',
        __DIR__ . '/../dist/quick/index.json',
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/quick/index.json' : null),
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/dist/quick/index.json' : null),
    ],
    'other' => [
        __DIR__ . '/../public/other/index.json',
        __DIR__ . '/../dist/other/index.json',
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/other/index.json' : null),
        (!empty($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/dist/other/index.json' : null),
    ],
];
foreach ($manifestConfig as $modeKey => $paths) {
    foreach ($paths as $path) {
        if ($path && file_exists($path)) {
            $manifest = @json_decode(file_get_contents($path), true);
            if (is_array($manifest)) {
                foreach ($manifest as $p) {
                    if (isset($p['id'], $p['date'])) {
                        $dateLookup[(string) $p['id'] . '|' . $modeKey] = $p['date'];
                    }
                }
                break;
            }
        }
    }
}
foreach ($aggregates as $k => &$agg) {
    $pid = (string) ($agg['puzzle_id'] ?? '');
    $mode = $agg['mode'] ?? 'main';
    $agg['date'] = $dateLookup[$pid . '|' . $mode] ?? null;
    $agg['completions'] = $completionsByPuzzleMode[$k] ?? 0;
    $elapsed = $avgElapsedByPuzzleMode[$k] ?? null;
    $agg['avg_solve_time_ms'] = ($elapsed && $elapsed['count'] > 0) ? (int) round($elapsed['sum'] / $elapsed['count']) : null;
    $hints = $avgHintsByPuzzleMode[$k] ?? null;
    $agg['avg_hints_used'] = ($hints && $hints['count'] > 0) ? round($hints['sum'] / $hints['count'], 2) : null;
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
$completionsByDay = []; // date => ['main' => n, 'quick' => n, 'other' => n]
$completionsByPuzzle = [];
$completionsByPuzzleMode = [];
$completionsByMode = ['main' => 0, 'quick' => 0, 'other' => 0];
$elapsedSum = 0;
$elapsedCount = 0;
$hintSum = 0;
$hintCount = 0;

$et = new DateTimeZone('America/New_York');
if (file_exists($completionsFile)) {
    $lines = file($completionsFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $entry = json_decode(trim($line), true);
        if (!is_array($entry) || !isset($entry['ts'])) continue;
        $mode = $entry['mode'] ?? 'main';
        $puzzleId = (string) ($entry['puzzle_id'] ?? 'unknown');
        $dt = (new DateTime('@' . (int) $entry['ts']))->setTimezone($et);
        $date = $dt->format('Y-m-d');
        if (!isset($completionsByDay[$date])) {
            $completionsByDay[$date] = ['main' => 0, 'quick' => 0, 'other' => 0];
        }
        $m = in_array($mode, ['main', 'quick', 'other'], true) ? $mode : 'other';
        $completionsByDay[$date][$m] = ($completionsByDay[$date][$m] ?? 0) + 1;
        $completionsByPuzzle[$puzzleId] = ($completionsByPuzzle[$puzzleId] ?? 0) + 1;
        if (in_array($mode, ['main', 'quick', 'other'], true)) {
            $completionsByMode[$mode]++;
        }
        if (isset($entry['elapsed_ms']) && $entry['elapsed_ms'] >= 0) {
            $elapsedSum += (int) $entry['elapsed_ms'];
            $elapsedCount++;
        }
        if (isset($entry['hint_count']) && $entry['hint_count'] >= 0) {
            $hintSum += (int) $entry['hint_count'];
            $hintCount++;
        }
    }
}

ksort($completionsByDay);
arsort($completionsByPuzzle);

// Output completions_by_puzzle as explicit array of {puzzle_id, count} to avoid
// PHP json_encode converting associative array to JSON array (losing keys)
$completionsByPuzzleList = [];
foreach ($completionsByPuzzle as $pid => $cnt) {
    $completionsByPuzzleList[] = ['puzzle_id' => $pid, 'count' => $cnt];
}

$out['completions_by_day'] = $completionsByDay;
$out['completions_by_puzzle'] = $completionsByPuzzleList;
$out['completions_by_mode'] = $completionsByMode;
$out['completions_total'] = array_sum(array_map(fn($d) => ($d['main'] ?? 0) + ($d['quick'] ?? 0) + ($d['other'] ?? 0), $completionsByDay));

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
            'id' => basename($f, '.json'),
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
$avgElapsedMs = $elapsedCount > 0 ? round($elapsedSum / $elapsedCount) : null;
$avgHintsUsed = $hintCount > 0 ? round($hintSum / $hintCount, 2) : null;

$out['summary'] = [
    'total_ratings' => $out['ratings']['total_count'],
    'total_completions' => $out['completions_total'],
    'total_submissions' => $submissionCount,
    'unique_puzzles_rated' => count($aggregates),
    'avg_solve_time_ms' => $avgElapsedMs,
    'avg_hints_used' => $avgHintsUsed,
    'completions_with_solve_time' => $elapsedCount,
    'completions_with_hints' => $hintCount,
];

echo json_encode($out);
