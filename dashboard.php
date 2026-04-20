<?php
require_once __DIR__ . '/db.php';
session_start();
header('Content-Type: application/json');

function jsonResponse($status, $message, $data = null) {
    echo json_encode(["status" => $status, "success" => ($status === 'success'), "message" => $message, "data" => $data]);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    jsonResponse("error", "Unauthorized access. Please log in.");
}

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];

$stats = [
    'Open' => 0,
    'In Progress' => 0,
    'Resolved' => 0,
    'Closed' => 0
];

if ($role === 'Admin') {
    $result = $pdo->query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);
    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 10";
    $recent_tickets = $pdo->query($recent_query)->fetchAll(PDO::FETCH_ASSOC);
    
    $total_users = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
} elseif ($role === 'Staff') {
    $stmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $dept_id = $stmt->fetchColumn();

    $stmt2 = $pdo->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE department_id = ? GROUP BY status");
    $stmt2->execute([$dept_id]);
    $result = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    $recent_query = "SELECT t.*, u.name as user_name, d.name as dept_name FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id WHERE t.department_id = ? ORDER BY t.updated_at DESC LIMIT 10";
    $stmt3 = $pdo->prepare($recent_query);
    $stmt3->execute([$dept_id]);
    $recent_tickets = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    
    $total_users = 0;
} else {
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE user_id = ? GROUP BY status");
    $stmt->execute([$user_id]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 10";
    $stmt4 = $pdo->prepare($recent_query);
    $stmt4->execute([$user_id]);
    $recent_tickets = $stmt4->fetchAll(PDO::FETCH_ASSOC);
    $total_users = 0;
}

if ($result) {
    foreach($result as $row) {
        $stats[$row['status']] = $row['count'];
    }
}

jsonResponse("success", "Dashboard data", [
    "stats" => $stats,
    "recent_tickets" => $recent_tickets,
    "total_users" => $total_users,
    "total_msgs" => 0 // Mock value since there is no messages table
]);
?>
