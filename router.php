<?php
// router.php

$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];
$dbFile = __DIR__ . '/database.json';

// CORS for development
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($method === 'OPTIONS') {
    exit(0);
}

// API Endpoints
if ($path === '/api/decks') {
    header('Content-Type: application/json');
    
    if ($method === 'GET') {
        if (file_exists($dbFile)) {
            echo file_get_contents($dbFile);
        } else {
            echo "[]";
        }
    } elseif ($method === 'POST') {
        $input = file_get_contents('php://input');
        if ($input) {
            file_put_contents($dbFile, $input);
            echo json_encode(['status' => 'saved']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'No data']);
        }
    }
    exit;
}

// Static File Serving
if ($path === '/' || $path === '/index.html') {
    $file = __DIR__ . '/index.html';
    if (file_exists($file)) {
        header('Content-Type: text/html');
        readfile($file);
        exit;
    }
}

// Serve other static files directly
$filePath = __DIR__ . $path;
if (file_exists($filePath) && !is_dir($filePath)) {
    // Basic Mime Type assumption
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    switch ($ext) {
        case 'css': header('Content-Type: text/css'); break;
        case 'js':  header('Content-Type: application/javascript'); break;
        case 'png': header('Content-Type: image/png'); break;
        case 'jpg': header('Content-Type: image/jpeg'); break;
        case 'json': header('Content-Type: application/json'); break;
    }
    readfile($filePath);
} else {
    http_response_code(404);
    echo "404 Not Found";
}
