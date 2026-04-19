<?php
require_once '../includes/db.php';
require_once '../includes/functions.php';

needLogin();

$user_id = $_SESSION['user_id'];
$role = $_SESSION['role'];

$stats = [
    'Open' => 0,
    'In Progress' => 0,
    'Resolved' => 0,
    'Closed' => 0
];

if ($role === 'Admin') {
    $result = $conn->query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status");
    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 5";
    $recent_tickets = $conn->query($recent_query);
} elseif ($role === 'Staff') {
    $stmt = $conn->prepare("SELECT department_id FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $dept_id = $stmt->get_result()->fetch_assoc()['department_id'];

    $stmt2 = $conn->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE department_id = ? GROUP BY status");
    $stmt2->bind_param("i", $dept_id);
    $stmt2->execute();
    $result = $stmt2->get_result();

    $recent_query = "SELECT t.*, u.name as user_name, d.name as dept_name FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id WHERE t.department_id = ? ORDER BY t.updated_at DESC LIMIT 5";
    $stmt3 = $conn->prepare($recent_query);
    $stmt3->bind_param("i", $dept_id);
    $stmt3->execute();
    $recent_tickets = $stmt3->get_result();
} else {
    $stmt = $conn->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE user_id = ? GROUP BY status");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 5";
    $stmt4 = $conn->prepare($recent_query);
    $stmt4->bind_param("i", $user_id);
    $stmt4->execute();
    $recent_tickets = $stmt4->get_result();
}

if (isset($result) && $result) {
    while($row = $result->fetch_assoc()) {
        $stats[$row['status']] = $row['count'];
    }
}

$recent_list = [];
if (isset($recent_tickets) && $recent_tickets) {
    while($row = $recent_tickets->fetch_assoc()) {
        $recent_list[] = $row;
    }
}

jsonResponse("success", "Dashboard data", [
    "stats" => $stats,
    "recent_tickets" => $recent_list
]);
?>
