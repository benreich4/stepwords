<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}
$dir = __DIR__ . '/submissions';
if (!is_dir($dir)) { echo json_encode([]); exit; }
$files = glob($dir . '/submission-*.json');
$out = [];
foreach ($files as $f) {
  $raw = @file_get_contents($f);
  if ($raw === false) continue;
  $data = json_decode($raw, true);
  $id = basename($f, '.json');
  $lastWord = null;
  if (isset($data['rows']) && is_array($data['rows']) && count($data['rows']) > 0) {
    $lastRow = end($data['rows']);
    $lastWord = isset($lastRow['answer']) ? $lastRow['answer'] : null;
  }
  
  $out[] = [
    'id' => $id,
    'filename' => basename($f),
    'author' => isset($data['author']) ? $data['author'] : null,
    'email' => isset($data['email']) ? $data['email'] : null,
    'submittedAt' => isset($data['submittedAt']) ? $data['submittedAt'] : null,
    'lastWord' => $lastWord,
  ];
}
usort($out, function($a, $b) { return strcmp($b['filename'], $a['filename']); });
echo json_encode($out);
?>


