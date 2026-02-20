<?php
/**
 * Admin authentication. POST with { "password": "..." } to login.
 * Uses PHP sessions; cookie is httpOnly for security.
 */
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$configFile = __DIR__ . '/admin-config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Admin not configured. Copy api/admin-config.example.php to api/admin-config.php and set your password.']);
    exit;
}

$config = require $configFile;
$hash = $config['password_hash'] ?? '';

if (!$hash) {
    http_response_code(500);
    echo json_encode(['error' => 'Admin password not configured.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$password = isset($input['password']) ? (string) $input['password'] : '';

if (!password_verify($password, $hash)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Invalid password']);
    exit;
}

$_SESSION['admin_authenticated'] = true;
$_SESSION['admin_ts'] = time();

echo json_encode(['ok' => true]);
