<?php
require_once '../includes/db.php';
require_once '../includes/functions.php';

needLogin();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'list') {
        $status_filter = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';
        $where_clauses = [];
        $params = [];
        $types = "";

        if ($role === 'Staff') {
            $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $dept_id = $stmt->get_result()->fetch_assoc()['department_id'];
            
            $where_clauses[] = "t.department_id = ?";
            $params[] = $dept_id;
            $types .= "i";
        } elseif ($role === 'Student') {
            $where_clauses[] = "t.user_id = ?";
            $params[] = $user_id;
            $types .= "i";
        }

        if ($status_filter) {
            $where_clauses[] = "t.status = ?";
            $params[] = $status_filter;
            $types .= "s";
        }

        $sql = "SELECT t.*, d.name as dept_name, u.name as user_name 
                FROM tickets t 
                JOIN departments d ON t.department_id = d.id 
                JOIN users u ON t.user_id = u.id";

        if (count($where_clauses) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where_clauses);
        }

        $sql .= " ORDER BY t.created_at DESC";

        if (count($params) > 0) {
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $tickets = $stmt->get_result();
        } else {
            $tickets = $conn->query($sql);
        }

        $data = [];
        while($row = $tickets->fetch_assoc()) {
            $data[] = $row;
        }
        jsonResponse("success", "Tickets retrieved", $data);
    } 
    elseif ($action === 'details') {
        $ticket_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        
        $sql = "SELECT t.*, d.name as dept_name, u.name as user_name, u.email as user_email 
                FROM tickets t 
                JOIN departments d ON t.department_id = d.id 
                JOIN users u ON t.user_id = u.id 
                WHERE t.id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $ticket_id);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();

        if (!$ticket) {
            jsonResponse("error", "Ticket not found");
        }

        if ($role === 'Student' && $ticket['user_id'] != $user_id) {
            jsonResponse("error", "Unauthorized access to this ticket");
        }

        if ($role === 'Staff') {
            $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $dept_id = $stmt->get_result()->fetch_assoc()['department_id'];
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

        $stmt = $conn->prepare("INSERT INTO tickets (title, description, user_id, department_id, priority) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssiis", $title, $description, $user_id, $department_id, $priority);

        if ($stmt->execute()) {
            jsonResponse("success", "Ticket created successfully");
        } else {
            jsonResponse("error", "Failed to create ticket");
        }
    } 
    elseif ($action === 'update_status') {
        if ($role === 'Admin' || $role === 'Staff') {
            $ticket_id = intval($data['id']);
            $new_status = $data['status'];
            
            $stmt = $conn->prepare("UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param("si", $new_status, $ticket_id);
            if ($stmt->execute()) {
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
            $stmt = $conn->prepare("DELETE FROM tickets WHERE id = ?");
            $stmt->bind_param("i", $ticket_id);
            if ($stmt->execute()) {
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
