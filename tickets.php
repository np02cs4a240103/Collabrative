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
if (!$sessionUser) {
    jsonResponse("error", "Unauthorized access. Please log in.");
}

$action  = isset($_GET['action']) ? $_GET['action'] : '';
$user_id = $sessionUser['user_id'];
$role    = $sessionUser['role'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $status_filter = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';
        $where_clauses = [];
        $params = [];

        if ($role === 'Staff') {
            $stmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $dept_id = $stmt->fetchColumn();
            
            $where_clauses[] = "t.department_id = ?";
            $params[] = $dept_id;
        } elseif ($role === 'Student') {
            $where_clauses[] = "t.user_id = ?";
            $params[] = $user_id;
        }

        if ($status_filter) {
            $where_clauses[] = "t.status = ?";
            $params[] = $status_filter;
        }

        $sql = "SELECT t.*, d.name as dept_name, u.name as user_name 
                FROM tickets t 
                JOIN departments d ON t.department_id = d.id 
                JOIN users u ON t.user_id = u.id";

        if (count($where_clauses) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where_clauses);
        }

        $sql .= " ORDER BY t.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse("success", "Tickets retrieved", $data);
    } 
    elseif ($action === 'details') {
        $ticket_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        $sql = "SELECT t.*, d.name as dept_name, u.name as user_name, u.email as user_email 
                FROM tickets t 
                JOIN departments d ON t.department_id = d.id 
                JOIN users u ON t.user_id = u.id 
                WHERE t.id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$ticket_id]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            jsonResponse("error", "Ticket not found");
        }

        if ($role === 'Student' && $ticket['user_id'] != $user_id) {
            jsonResponse("error", "Unauthorized access to this ticket");
        }

        if ($role === 'Staff') {
            $stmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $dept_id = $stmt->fetchColumn();
            if ($ticket['department_id'] != $dept_id && $ticket['user_id'] != $user_id) {
                jsonResponse("error", "Unauthorized access to this ticket");
            }
        }

        jsonResponse("success", "Ticket details", $ticket);
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
        $title = sanitizeInput($data['title']);
        $description = sanitizeInput($data['description']);
        $department_id = intval($data['department_id']);
        $priority = $data['priority'];

        $stmt = $pdo->prepare("INSERT INTO tickets (title, description, user_id, department_id, priority) VALUES (?, ?, ?, ?, ?)");
        
        if ($stmt->execute([$title, $description, $user_id, $department_id, $priority])) {
            $ticket_id = $pdo->lastInsertId();
            
            // Auto-insert the ticket description as the first chat message
            $msg_stmt = $pdo->prepare("INSERT INTO messages (ticket_id, sender_id, message) VALUES (?, ?, ?)");
            $msg_stmt->execute([$ticket_id, $user_id, $description]);
            
            jsonResponse("success", "Ticket created successfully", ["ticket_id" => $ticket_id]);
        } else {
            jsonResponse("error", "Failed to create ticket");
        }
    } 
    elseif ($action === 'update_status') {
        if ($role === 'Admin' || $role === 'Staff') {
            $ticket_id = intval($data['id']);
            $new_status = $data['status'];
            
            $stmt = $pdo->prepare("UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?");
            if ($stmt->execute([$new_status, $ticket_id])) {
                jsonResponse("success", "Status updated successfully");
            } else {
                jsonResponse("error", "Failed to update status");
            }
        } else {
            jsonResponse("error", "Unauthorized");
        }
    } 
    elseif ($action === 'delete') {
        if ($role === 'Admin') {
            $ticket_id = intval($data['id']);
            $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
            if ($stmt->execute([$ticket_id])) {
                jsonResponse("success", "Ticket deleted successfully");
            } else {
                jsonResponse("error", "Failed to delete ticket");
            }
        } else {
            jsonResponse("error", "Unauthorized");
        }
    }
}

jsonResponse("error", "Invalid request");
?>
