<?php
/**
 * dashboard.php
 * Aggregates statistics and recent activity for the Admin and Staff dashboards.
 * Returns JSON data including ticket counts, active sessions, and recent tickets.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_helper.php';

header('Content-Type: application/json');

// Helper function to easily return formatted JSON responses
function jsonResponse($status, $message, $data = null) {
    echo json_encode(["status" => $status, "success" => ($status === 'success'), "message" => $message, "data" => $data]);
    exit;
}

// 1. Authenticate the user requesting the data
$sessionUser = getSessionUser();
if (!$sessionUser) {
    jsonResponse("error", "Unauthorized access. Please log in.");
}

$user_id = $sessionUser['user_id'];
$role    = $sessionUser['role'];

// Default statistics structure
$stats = [
    'notstarted' => 0,
    'started' => 0,
    'process' => 0,
    'solved' => 0
];

// 2. Fetch data based on the user's role
if ($role === 'Admin') {
    // Admins see EVERYTHING
    // Get ticket counts grouped by their status
    $result = $pdo->query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);
    
    // Get the 10 most recent tickets across all departments
    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 10";
    $recent_tickets = $pdo->query($recent_query)->fetchAll(PDO::FETCH_ASSOC);
    
    // Get global user statistics for the Admin Overview cards
    $total_users = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $pending_approvals = $pdo->query("SELECT COUNT(*) FROM users WHERE is_approved = 0")->fetchColumn();

} elseif ($role === 'Staff') {
    // Staff only see data relevant to THEIR assigned department
    $stmt = $pdo->prepare("SELECT department_id FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $dept_id = $stmt->fetchColumn();

    // Get ticket counts only for this department
    $stmt2 = $pdo->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE department_id = ? GROUP BY status");
    $stmt2->execute([$dept_id]);
    $result = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // Get recent tickets only for this department
    $recent_query = "SELECT t.*, u.name as user_name, d.name as dept_name FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id WHERE t.department_id = ? ORDER BY t.updated_at DESC LIMIT 10";
    $stmt3 = $pdo->prepare($recent_query);
    $stmt3->execute([$dept_id]);
    $recent_tickets = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    
    $total_users = 0;
    $pending_approvals = 0;
} else {
    // Standard Students only see their own data (though students don't typically hit this specific endpoint directly for dashboard stats)
    $stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM tickets WHERE user_id = ? GROUP BY status");
    $stmt->execute([$user_id]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $recent_query = "SELECT t.*, d.name as dept_name, u.name as user_name FROM tickets t JOIN departments d ON t.department_id = d.id JOIN users u ON t.user_id = u.id WHERE t.user_id = ? ORDER BY t.created_at DESC LIMIT 10";
    $stmt4 = $pdo->prepare($recent_query);
    $stmt4->execute([$user_id]);
    $recent_tickets = $stmt4->fetchAll(PDO::FETCH_ASSOC);
    
    $total_users = 0;
    $pending_approvals = 0;
}

// 3. Process the ticket counts into our stats array
if ($result) {
    foreach($result as $row) {
        $stats[$row['status']] = $row['count'];
    }
}

// 4. Return everything to the frontend
jsonResponse("success", "Dashboard data", [
    "stats" => $stats,
    "recent_tickets" => $recent_tickets,
    "total_users" => $total_users,
    "total_msgs" => $pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn(), // Total messages ever sent
    "pending_approvals" => $pending_approvals
]);
?>
