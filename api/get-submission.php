<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}
$id = isset($_GET['id']) ? basename($_GET['id']) : '';
if ($id === '') { http_response_code(400); echo json_encode(['error' => 'Missing id']); exit; }
$path = __DIR__ . '/submissions/' . $id . '.json';
if (!is_file($path)) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
$raw = @file_get_contents($path);
if ($raw === false) { http_response_code(500); echo json_encode(['error' => 'Read error']); exit; }
echo $raw;
?>


