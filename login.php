<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT id, name, email, password, role FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password'])) {
    
    $_SESSION['user_id']  = $user['id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['role']     = $user['role'];
    $_SESSION['email']    = $user['email'];

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'id'      => $user['id'],
        'role'    => $user['role'],
        'name'    => $user['name']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
}
?>