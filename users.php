<?php
/**
 * users.php
 * Administrative API endpoint for User Management.
 * Handles listing users, viewing specific user details, creating new users (by admin),
 * updating user details, toggling active/disabled status, and approving new registrants.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';
header('Content-Type: application/json');

// Utility function to sanitize inputs against XSS
function sanitizeInput($data) {
    if (!$data) return '';
    return htmlspecialchars(stripslashes(trim($data)));
}

// Utility function to standardize JSON responses
function jsonResponse($status, $message, $data = null) {
    echo json_encode(["status" => $status, "success" => ($status === 'success'), "message" => $message, "data" => $data]);
    exit;
}

// 1. Authenticate user AND strictly enforce Admin Role Authorization
$sessionUser = getSessionUser();
if (!$sessionUser || $sessionUser['role'] !== 'Admin') {
    jsonResponse("error", "Unauthorized access. Only Admins can manage users.");
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// ============================================================================
// HANDLE GET REQUESTS
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // --- ACTION: LIST ALL USERS ---
    if ($action === 'list') {
        // Fetch all users and join with the departments table to get the text name of the department
        $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_approved, u.created_at, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.created_at DESC");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse("success", "Users retrieved", $users);
    }
    
    // --- ACTION: GET SPECIFIC USER DETAILS ---
    elseif ($action === 'detail') {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if (!$id) jsonResponse("error", "User ID required");

        $stmt = $pdo->prepare("SELECT u.id, u.name, u.email, u.role, u.is_active, u.is_approved, u.created_at, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) jsonResponse("error", "User not found");
        jsonResponse("success", "User details", $user);
    }
} 

// ============================================================================
// HANDLE POST REQUESTS
// ============================================================================
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // --- ACTION: CREATE A NEW USER (Admin Action) ---
    if ($action === 'create') {
        $name = sanitizeInput($data['name']);
        $email = sanitizeInput($data['email']);
        $password = $data['password'];
        $role = $data['role'];
        
        // Departments are only applicable to Staff
        $dept_id = isset($data['department_id']) && $data['department_id'] !== '' ? intval($data['department_id']) : NULL;
        
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Ensure email isn't already used
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->rowCount() > 0) {
            jsonResponse("error", "Email already exists");
        } else {
            // Note: Users created directly by an Admin are automatically approved (is_approved = 1)
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, department_id, is_approved) VALUES (?, ?, ?, ?, ?, 1)");
            if ($stmt->execute([$name, $email, $hashed_password, $role, $dept_id])) {
                jsonResponse("success", "User created successfully");
            } else {
                jsonResponse("error", "Failed to create user");
            }
        }
    } 
    
    // --- ACTION: UPDATE EXISTING USER ---
    elseif ($action === 'update') {
        $id = intval($data['id']);
        $name = sanitizeInput($data['name']);
        $email = sanitizeInput($data['email']);
        $role = $data['role'];
        $dept_id = isset($data['department_id']) && $data['department_id'] !== '' ? intval($data['department_id']) : NULL;

        // Ensure the new email doesn't belong to a DIFFERENT user
        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check->execute([$email, $id]);
        if ($check->rowCount() > 0) {
            jsonResponse("error", "Email already exists");
        }

        // If a new password was provided, hash and update it
        if (!empty($data['password'])) {
            $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, department_id = ? WHERE id = ?");
            $res = $stmt->execute([$name, $email, $hashed_password, $role, $dept_id, $id]);
        } else {
            // Otherwise, update everything EXCEPT the password
            $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ?, department_id = ? WHERE id = ?");
            $res = $stmt->execute([$name, $email, $role, $dept_id, $id]);
        }
        
        if ($res) {
            jsonResponse("success", "User updated successfully");
        } else {
            jsonResponse("error", "Failed to update user");
        }
    } 
    
    // --- ACTION: TOGGLE USER STATUS (Enable/Disable) ---
    elseif ($action === 'toggle_status') {
        $id = intval($data['id']);
        
        // Prevent admins from accidentally locking themselves out
        if ($id === $sessionUser['user_id']) {
            jsonResponse("error", "You cannot disable your own account");
        }
        
        // Fetch the current status and flip it
        $check = $pdo->prepare("SELECT is_active FROM users WHERE id = ?");
        $check->execute([$id]);
        $current = $check->fetchColumn();
        $newStatus = $current ? 0 : 1; // 0 = disabled, 1 = enabled
        
        $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        if ($stmt->execute([$newStatus, $id])) {
            $label = $newStatus ? 'enabled' : 'disabled';
            jsonResponse("success", "User {$label} successfully");
        } else {
            jsonResponse("error", "Failed to update user status");
        }
    } 
    
    // --- ACTION: APPROVE NEW REGISTRATION ---
    elseif ($action === 'approve') {
        $id = intval($data['id']);
        $stmt = $pdo->prepare("UPDATE users SET is_approved = 1 WHERE id = ?");
        if ($stmt->execute([$id])) {
            jsonResponse("success", "User approved successfully");
        } else {
            jsonResponse("error", "Failed to approve user");
        }
    }
}

// Fallback error
jsonResponse("error", "Invalid request");
?>
