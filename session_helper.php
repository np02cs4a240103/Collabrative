<?php
/**
 * session_helper.php
 * Resolves the current user from PHP session OR from frontend-sent headers.
 * Fixes the multi-tab conflict where Admin + Student share the same session cookie.
 */

require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function getSessionUser() {
    global $pdo;

    $user_id = null;
    $role = null;

    // 1. Prioritize frontend-sent headers (fixes multi-tab shared cookie conflicts)
    $header_id   = $_SERVER['HTTP_X_USER_ID']   ?? null;
    $header_role = $_SERVER['HTTP_X_USER_ROLE']  ?? null;

    if ($header_id && $header_role) {
        $allowed_roles = ['Admin', 'Staff', 'Student'];
        if (in_array($header_role, $allowed_roles)) {
            $user_id = intval($header_id);
            $role    = $header_role;
            // Sync session
            $_SESSION['user_id'] = $user_id;
            $_SESSION['role']    = $role;
        }
    }
    // 2. Fallback to PHP session (e.g. for initial load or non-JS requests)
    elseif (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
        $user_id = $_SESSION['user_id'];
        $role    = $_SESSION['role'];
    }

    if ($user_id && $role) {
        // Verify user is active in the database
        $stmt = $pdo->prepare("SELECT is_active FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $is_active = $stmt->fetchColumn();

        if ($is_active == 1) {
            return [
                'user_id' => $user_id,
                'role'    => $role
            ];
        }
        // If not active, do not return user data
    }

    return null; // Not authenticated or disabled
}
?>
