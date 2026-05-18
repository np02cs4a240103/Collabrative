<?php
/**
 * tickets.php
 * Main API endpoint for handling Support Tickets.
 * Handles fetching ticket lists, viewing ticket details, creating new tickets,
 * updating ticket statuses, and deleting tickets. Applies Role-Based Access Control (RBAC).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json');

// Utility function to clean user input and prevent XSS
function sanitizeInput($data) {
    if (!$data) return '';
    return htmlspecialchars(stripslashes(trim($data)));
}

// Utility function to format API responses
function jsonResponse($status, $message, $data = null) {
    echo json_encode(["status" => $status, "success" => ($status === 'success'), "message" => $message, "data" => $data]);
    exit;
}

// 1. Authenticate the user
$sessionUser = getSessionUser();
if (!$sessionUser) {
    jsonResponse("error", "Unauthorized access. Please log in.");
}

$action  = isset($_GET['action']) ? $_GET['action'] : '';
$user_id = $sessionUser['user_id'];
$role    = $sessionUser['role'];

// ============================================================================
// HANDLE GET REQUESTS (Fetching Data)
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // --- ACTION: LIST TICKETS ---
    if ($action === 'list') {
        $status_filter = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';
        $where_clauses = [];
        $params = [];

        // Admin feature: allows viewing all tickets raised by a specific user
        $filter_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

        // Apply filters based on User Role
        if ($role === 'Admin' && $filter_user_id > 0) {
            // Admin viewing a specific user's history
            $where_clauses[] = "t.user_id = ?";
            $params[] = $filter_user_id;
        } elseif ($role === 'Staff') {
            // Staff can ONLY see tickets assigned to their department
            $stmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $dept_id = $stmt->fetchColumn();
            
            $where_clauses[] = "t.department_id = ?";
            $params[] = $dept_id;
        } elseif ($role === 'Student') {
            // Students can ONLY see tickets they created themselves
            $where_clauses[] = "t.user_id = ?";
            $params[] = $user_id;
        }

        // Apply status filter if provided (e.g. only show "solved" tickets)
        if ($status_filter) {
            $where_clauses[] = "t.status = ?";
            $params[] = $status_filter;
        }

        // Build the base SQL query joining departments and users tables for friendly names
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
    
    // --- ACTION: GET TICKET DETAILS ---
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

        // Authorization Check: Student can only view their own ticket
        if ($role === 'Student' && $ticket['user_id'] != $user_id) {
            jsonResponse("error", "Unauthorized access to this ticket");
        }

        // Authorization Check: Staff can only view tickets in their department
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

// ============================================================================
// HANDLE POST REQUESTS (Modifying Data)
// ============================================================================
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // --- ACTION: CREATE NEW TICKET ---
    if ($action === 'create') {
        $title = sanitizeInput($data['title']);
        $description = sanitizeInput($data['description']);
        $department_id = intval($data['department_id']);
        $priority = $data['priority'];

        // Insert the main ticket record
        $stmt = $pdo->prepare("INSERT INTO tickets (title, description, user_id, department_id, priority) VALUES (?, ?, ?, ?, ?)");
        
        if ($stmt->execute([$title, $description, $user_id, $department_id, $priority])) {
            $ticket_id = $pdo->lastInsertId();
            
            // Auto-insert the ticket description as the first message in the chat history
            $msg_stmt = $pdo->prepare("INSERT INTO messages (ticket_id, sender_id, message) VALUES (?, ?, ?)");
            $msg_stmt->execute([$ticket_id, $user_id, $description]);
            
            jsonResponse("success", "Ticket created successfully", ["ticket_id" => $ticket_id]);
        } else {
            jsonResponse("error", "Failed to create ticket");
        }
    } 
    
    // --- ACTION: UPDATE TICKET STATUS ---
    elseif ($action === 'update_status') {
        // Only Admins and Staff are allowed to change ticket statuses
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
            jsonResponse("error", "Unauthorized: Only Admins/Staff can update status");
        }
    } 
    
    // --- ACTION: DELETE TICKET ---
    elseif ($action === 'delete') {
        // Strict security: ONLY Admins can physically delete tickets
        if ($role === 'Admin') {
            $ticket_id = intval($data['id']);
            $stmt = $pdo->prepare("DELETE FROM tickets WHERE id = ?");
            if ($stmt->execute([$ticket_id])) {
                jsonResponse("success", "Ticket deleted successfully");
            } else {
                jsonResponse("error", "Failed to delete ticket");
            }
        } else {
            jsonResponse("error", "Unauthorized: Only Admins can delete tickets");
        }
    }
}

// Fallback error if the action isn't handled
jsonResponse("error", "Invalid request");
?>
