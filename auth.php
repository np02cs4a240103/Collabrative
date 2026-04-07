<?php
require_once '../includes/db.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'login') {
        $email = sanitizeInput($data['email']);
        $password = $data['password'];

        $stmt = $conn->prepare("SELECT id, name, password, role FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            if (password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['name'] = $user['name'];
                $_SESSION['role'] = $user['role'];
                
                jsonResponse("success", "Login successful", ["name" => $user['name'], "role" => $user['role']]);
            } else {
                jsonResponse("error", "Invalid email or password");
            }
        } else {
            jsonResponse("error", "Invalid email or password");
        }
    } 
    elseif ($action === 'register') {
        $name = sanitizeInput($data['name']);
        $email = sanitizeInput($data['email']);
        $password = $data['password'];
        $role = $data['role']; 
        $dept_id = isset($data['department_id']) && $data['department_id'] !== '' ? intval($data['department_id']) : NULL;
        
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $check->bind_param("s", $email);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            jsonResponse("error", "Email already exists");
        } else {
            $stmt = $conn->prepare("INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $name, $email, $hashed_password, $role, $dept_id);
            
            if ($stmt->execute()) {
                jsonResponse("success", "Registration successful");
            } else {
                jsonResponse("error", "Registration failed");
            }
        }
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'logout') {
        session_destroy();
        jsonResponse("success", "Logged out successfully");
    }
    elseif ($action === 'me') {
        if (isLoggedIn()) {
            jsonResponse("success", "Authenticated", [
                "id" => $_SESSION['user_id'],
                "name" => $_SESSION['name'],
                "role" => $_SESSION['role']
            ]);
        } else {
            jsonResponse("error", "Not authenticated");
        }
    }
}

jsonResponse("error", "Invalid request");
?>
