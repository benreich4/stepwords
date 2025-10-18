<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow DELETE method
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get submission ID from query parameter
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing submission ID']);
    exit();
}

// Delete the submission file
$submissionsDir = __DIR__ . '/submissions';
$filename = $submissionsDir . '/' . $id . '.json';

// Check if file exists
if (!file_exists($filename)) {
    http_response_code(404);
    echo json_encode(['error' => 'Submission not found']);
    exit();
}

// Delete the file
if (unlink($filename)) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Submission deleted successfully',
        'id' => $id
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete submission']);
}
?>