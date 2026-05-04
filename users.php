<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';
header('Content-Type: application/json');

function sanitizeInput($data) {
    if (!$data) return '';
    return htmlspecialchars(stripslashes(trim($data)));
}

function jsonResponse($status, $message, $data = null) {
    echo json_encode(["status" => $status, "success" => ($status === 'success'), "message" => $message, "data" => $data]);
    exit;
}

$sessionUser = getSessionUser();
if (!$sessionUser || $sessionUser['role'] !== 'Admin') {
    jsonResponse("error", "Unauthorized access.");
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.role, u.is_active, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.created_at DESC");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse("success", "Users retrieved", $users);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
        $name = sanitizeInput($data['name']);
        $email = sanitizeInput($data['email']);
        $password = $data['password'];
        $role = $data['role'];
        $dept_id = isset($data['department_id']) && $data['department_id'] !== '' ? intval($data['department_id']) : NULL;
        
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->rowCount() > 0) {
            jsonResponse("error", "Email already exists");
        } else {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?)");
            if ($stmt->execute([$name, $email, $hashed_password, $role, $dept_id])) {
                jsonResponse("success", "User created successfully");
            } else {
                jsonResponse("error", "Failed to create user");
            }
        }
    } elseif ($action === 'update') {
        $id = intval($data['id']);
        $name = sanitizeInput($data['name']);
        $email = sanitizeInput($data['email']);
        $role = $data['role'];
        $dept_id = isset($data['department_id']) && $data['department_id'] !== '' ? intval($data['department_id']) : NULL;

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check->execute([$email, $id]);
        if ($check->rowCount() > 0) {
            jsonResponse("error", "Email already exists");
        }

        if (!empty($data['password'])) {
            $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, department_id = ? WHERE id = ?");
            $res = $stmt->execute([$name, $email, $hashed_password, $role, $dept_id, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ?, department_id = ? WHERE id = ?");
            $res = $stmt->execute([$name, $email, $role, $dept_id, $id]);
        }
        
        if ($res) {
            jsonResponse("success", "User updated successfully");
        } else {
            jsonResponse("error", "Failed to update user");
        }
    } elseif ($action === 'toggle_status') {
        $id = intval($data['id']);
        if ($id === $sessionUser['user_id']) {
            jsonResponse("error", "You cannot disable your own account");
        }
        // Get current status
        $check = $pdo->prepare("SELECT is_active FROM users WHERE id = ?");
        $check->execute([$id]);
        $current = $check->fetchColumn();
        $newStatus = $current ? 0 : 1;
        $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        if ($stmt->execute([$newStatus, $id])) {
            $label = $newStatus ? 'enabled' : 'disabled';
            jsonResponse("success", "User {$label} successfully");
        } else {
            jsonResponse("error", "Failed to update user status");
        }
    }
}

jsonResponse("error", "Invalid request");
?>
