<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Create submissions directory in the api folder
    $submissionsDir = __DIR__ . '/submissions';
    if (!file_exists($submissionsDir)) {
        mkdir($submissionsDir, 0777, true);
    }
    
    // Save to file
    $timestamp = date('Y-m-d-H-i-s');
    $filename = $submissionsDir . "/submission-{$timestamp}.json";
    file_put_contents($filename, json_encode($input, JSON_PRETTY_PRINT));
    
    echo json_encode(['success' => true]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
