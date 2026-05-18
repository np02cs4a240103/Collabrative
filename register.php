<?php
/**
 * register.php
 * Handles new user registration from the frontend.
 * Validates user input, checks for duplicate emails, securely hashes the password,
 * and inserts the user into the database as a "Pending" Student.
 */
header('Content-Type: application/json');
require_once __DIR__ . '/db.php'; // Connect to the database

// Ensure this script is only accessed via a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
    exit;
}

// Decode the JSON data sent from the frontend registration form
$data = json_decode(file_get_contents('php://input'), true);

$name     = trim($data['name'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

// Basic validation: Ensure no fields were left blank
if (empty($name) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

// Basic validation: Ensure the email looks like a valid email address
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Invalid email format']);
    exit;
}

// ── Email Domain Whitelisting ──────────────────────────────────────────────
// Only @bicnepal.edu.np institutional emails are permitted to register.
// To add more approved domains in the future, add them to this array.
$allowed_domains = ['bicnepal.edu.np'];
$email_domain    = strtolower(substr(strrchr($email, '@'), 1));
if (!in_array($email_domain, $allowed_domains)) {
    echo json_encode([
        'success' => false,
        'message' => 'Registration is only allowed for BIC Nepal institutional emails (@bicnepal.edu.np). Other email addresses are not permitted.'
    ]);
    exit; // Stop execution immediately — do not proceed to DB
}
// ──────────────────────────────────────────────────────────────────────────

// Basic validation: Enforce a minimum password length for security
if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
    exit;
}

// Database Check: Prevent multiple accounts from using the same email address
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Email already registered']);
    exit;
}

// SECURITY: Hash the password using PHP's native secure password hashing algorithm (bcrypt by default)
$hashed = password_hash($password, PASSWORD_DEFAULT);

// Insert the new user into the database. 
// Note: All new public registrations are automatically assigned the 'Student' role
// AND their `is_approved` status is set to 0 (Pending) requiring admin manual approval.
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, 'Student', 0)");
if ($stmt->execute([$name, $email, $hashed])) {
    echo json_encode(['success' => true, 'message' => 'Registration successful! Your account is pending admin approval. Please wait for approval before logging in.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
?>