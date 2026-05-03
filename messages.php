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
        $ticket_id = isset($_GET['ticket_id']) ? intval($_GET['ticket_id']) : 0;
        if ($ticket_id === 0) {
            jsonResponse("error", "Ticket ID required");
        }

        // Optional: verify access to ticket
        $stmt = $pdo->prepare("SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.ticket_id = ? ORDER BY m.created_at ASC");
        $stmt->execute([$ticket_id]);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt_t = $pdo->prepare("SELECT status FROM tickets WHERE id = ?");
        $stmt_t->execute([$ticket_id]);
        $ticket_status = $stmt_t->fetchColumn();

        jsonResponse("success", "Messages retrieved", ["messages" => $messages, "status" => $ticket_status]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'send') {
        $ticket_id = intval($data['ticket_id']);
        $message = sanitizeInput($data['message']);

        if (empty($message)) {
            jsonResponse("error", "Message cannot be empty");
        }

        $stmt = $pdo->prepare("INSERT INTO messages (ticket_id, sender_id, message) VALUES (?, ?, ?)");
        if ($stmt->execute([$ticket_id, $user_id, $message])) {
            $msg_id = $pdo->lastInsertId();
            
            // fetch the newly created message to return
            $stmt2 = $pdo->prepare("SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?");
            $stmt2->execute([$msg_id]);
            $new_message = $stmt2->fetch(PDO::FETCH_ASSOC);
            
            jsonResponse("success", "Message sent", $new_message);
        } else {
            jsonResponse("error", "Failed to send message");
        }
    }
}

jsonResponse("error", "Invalid request");
?>
