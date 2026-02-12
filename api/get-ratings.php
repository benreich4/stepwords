<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$puzzleId = isset($_GET['puzzle_id']) ? (string) $_GET['puzzle_id'] : '';
$mode = isset($_GET['mode']) ? (string) $_GET['mode'] : '';
$limit = isset($_GET['limit']) ? max(1, min(500, (int) $_GET['limit'])) : 100;
$minCount = isset($_GET['min_count']) ? max(0, (int) $_GET['min_count']) : 0;

// Must match rate-puzzle.php - use temp dir
$dataFile = sys_get_temp_dir() . '/stepwords-ratings.json';
if (!file_exists($dataFile)) {
    if ($puzzleId) {
        echo json_encode(['puzzle_id' => $puzzleId, 'mode' => $mode ?: 'main', 'avg' => null, 'count' => 0, 'ratings' => []]);
    } else {
        echo json_encode(['puzzles' => [], 'by_id' => (object)[]]);
    }
    exit;
}

$raw = file_get_contents($dataFile);
$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['ratings']) || !is_array($data['ratings'])) {
    $data = ['ratings' => []];
}

// Dedupe: for each (puzzle_id, mode, user_id), keep only latest (by ts)
$byKey = [];
foreach ($data['ratings'] as $r) {
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

// Aggregate by puzzle_id + mode
$aggregates = [];
foreach ($byKey as $r) {
    $k = $r['puzzle_id'] . '|' . $r['mode'];
    if (!isset($aggregates[$k])) {
        $aggregates[$k] = ['puzzle_id' => $r['puzzle_id'], 'mode' => $r['mode'], 'sum' => 0, 'count' => 0, 'ratings' => []];
    }
    $aggregates[$k]['sum'] += $r['rating'];
    $aggregates[$k]['count']++;
    $aggregates[$k]['ratings'][] = $r['rating'];
}

// Compute averages
foreach ($aggregates as $k => &$agg) {
    $agg['avg'] = $agg['count'] > 0 ? round($agg['sum'] / $agg['count'], 2) : 0;
    unset($agg['sum']);
}
unset($agg);

if ($puzzleId) {
    $m = $mode ?: 'main';
    $key = $puzzleId . '|' . $m;
    $agg = $aggregates[$key] ?? null;
    if ($agg) {
        echo json_encode([
            'puzzle_id' => $puzzleId,
            'mode' => $m,
            'avg' => $agg['avg'],
            'count' => $agg['count'],
            'ratings' => $agg['ratings'],
        ]);
    } else {
        echo json_encode(['puzzle_id' => $puzzleId, 'mode' => $m, 'avg' => null, 'count' => 0, 'ratings' => []]);
    }
} else {
    // Return all puzzles sorted by avg desc, then by count desc
    $puzzles = array_values($aggregates);
    if ($mode) {
        $puzzles = array_filter($puzzles, fn($p) => ($p['mode'] ?? 'main') === $mode);
    }
    if ($minCount > 0) {
        $puzzles = array_filter($puzzles, fn($p) => ($p['count'] ?? 0) >= $minCount);
    }
    usort($puzzles, function ($a, $b) {
        $avgA = $a['avg'] ?? 0;
        $avgB = $b['avg'] ?? 0;
        if (abs($avgA - $avgB) < 0.01) {
            return ($b['count'] ?? 0) - ($a['count'] ?? 0);
        }
        return $avgB > $avgA ? 1 : -1;
    });
    $puzzles = array_slice($puzzles, 0, $limit);

    $byId = (object)[];
    foreach ($aggregates as $agg) {
        $k = $agg['puzzle_id'] . '|' . $agg['mode'];
        $byId->{$k} = ['avg' => $agg['avg'], 'count' => $agg['count']];
    }

    echo json_encode(['puzzles' => $puzzles, 'by_id' => $byId]);
}
