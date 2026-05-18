<?php
/**
 * messages.php
 * Handles the real-time chat functionality within tickets.
 * Allows users (Students, Staff, Admins) to fetch the message history for a 
 * specific ticket and send new messages to that ticket.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json');

// Utility function to clean input text before storing it in the database
function sanitizeInput($data) {
    if (!$data) return '';
    return htmlspecialchars(stripslashes(trim($data)));
}

// Utility function to format standard JSON responses
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
// HANDLE GET REQUESTS (Fetching Message History)
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // --- ACTION: LIST MESSAGES FOR A TICKET ---
    if ($action === 'list') {
        $ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;
        if ($ticket_id === 0) {
            jsonResponse("error", "Ticket ID required");
        }

        // Fetch all messages for this ticket, joining the users table to get the sender's real name
        $stmt = $pdo->prepare("SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC");
        $stmt->execute([$ticket_id]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Also fetch the current overall status of the ticket so the frontend UI can react
        // (e.g. disable the chat input if the ticket is marked as 'solved')
        $stmt_t = $pdo->prepare("SELECT status FROM tickets WHERE id = ?");
        $stmt_t->execute([$ticket_id]);
        $ticket_status = $stmt_t->fetchColumn();

        jsonResponse("success", "Messages retrieved", ["messages" => $messages, "status" => $ticket_status]);
    }
} 

// ============================================================================
// HANDLE POST REQUESTS (Sending New Messages)
// ============================================================================
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // --- ACTION: SEND A NEW MESSAGE ---
    if ($action === 'send') {
        $ticket_id = intval($data['ticket_id']);
        $message = sanitizeInput($data['message']);

        if (empty($message)) {
            jsonResponse("error", "Message cannot be empty");
        }

        // Insert the new message into the database
        $stmt = $pdo->prepare("INSERT INTO messages (ticket_id, sender_id, message) VALUES (?, ?, ?)");
        if ($stmt->execute([$ticket_id, $user_id, $message])) {
            $msg_id = $pdo->lastInsertId();
            
            // Fetch the newly created message to return it directly to the frontend
            // This prevents the frontend from needing to make a 2nd API call just to show the sent message
            $stmt2 = $pdo->prepare("SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?");
            $stmt2->execute([$msg_id]);
            $new_message = $stmt2->fetch(PDO::FETCH_ASSOC);
            
            jsonResponse("success", "Message sent", $new_message);
        } else {
            jsonResponse("error", "Failed to send message");
        }
    }
}

// Fallback error if action not handled
jsonResponse("error", "Invalid request");
?>
