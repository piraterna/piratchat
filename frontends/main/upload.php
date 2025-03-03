<?php
$uploadDir = 'uploads/';
$maxAge = 3600;

if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    
    foreach ($files as $file) {
        $filePath = $uploadDir . $file;
        if (is_file($filePath)) {
            $fileAge = time() - filemtime($filePath);
            if ($fileAge > $maxAge) {
                unlink($filePath);
            }
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $file = $_FILES['image'];
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExts = ['gif', 'jpg', 'jpeg', 'png'];
    
    if (!in_array($fileExt, $allowedExts)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type']);
        exit;
    }

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $randomFileName = uniqid('img_', true) . '.' . $fileExt;
    $targetPath = $uploadDir . $randomFileName;

    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'File upload failed']);
        exit;
    }

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
        exit;
    }

    echo json_encode(['url' => 'https://chat.piraterna.org/' . $targetPath]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
}
?>
