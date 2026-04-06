<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$fullname = trim($data['fullname'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (empty($fullname) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

if (!str_ends_with(strtolower($email), '@bicnepal.edu.np')) {
    echo json_encode(['success' => false, 'message' => 'Only @bicnepal.edu.np email is allowed']);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Email already registered']);
    exit;
}

// Hash the password before storing it in the database
$hashed = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, 'user')");
if ($stmt->execute([$fullname, $email, $hashed])) {
    echo json_encode(['success' => true, 'message' => 'Registration successful! You can now login.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
?>