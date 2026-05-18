<?php
/**
 * login.php
 * Handles user authentication. Verifies email/password and checks if the user
 * account is active and approved by an admin before granting access.
 */
header('Content-Type: application/json');
require_once __DIR__ . '/db.php'; // Include the database connection
session_start();                  // Start a PHP session

// Only accept POST requests for security
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// Decode the JSON payload sent by the frontend
$data = json_decode(file_get_contents('php://input'), true);

$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

// Retrieve the user record from the database based on the provided email
$stmt = $pdo->prepare("SELECT id, name, email, password, role, is_active, is_approved FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Check if a user was found AND the provided password matches the hashed password in the DB
if ($user && password_verify($password, $user['password'])) {
    
    // SECURITY CHECK 1: Ensure the account hasn't been disabled by an Admin
    if (isset($user['is_active']) && !$user['is_active']) {
        echo json_encode(['success' => false, 'message' => 'Your account has been disabled. Please contact the administrator.']);
        exit;
    }

    // SECURITY CHECK 2: Ensure the account has been approved by an Admin
    if (isset($user['is_approved']) && !$user['is_approved']) {
        echo json_encode(['success' => false, 'message' => 'Your account is pending admin approval. Please wait for an administrator to approve your registration.']);
        exit;
    }

    // If both checks pass, store essential user details in the PHP session
    $_SESSION['user_id']  = $user['id'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['role']     = $user['role'];
    $_SESSION['email']    = $user['email'];

    // Return a success response to the frontend with the user details
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'id'      => $user['id'],
        'role'    => $user['role'],
        'name'    => $user['name']
    ]);
} else {
    // If user not found or password doesn't match
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
}
?>