<?php
/**
 * session_helper.php
 * Resolves the current user from PHP session OR from frontend-sent headers.
 * Fixes the multi-tab conflict where Admin + Student share the same session cookie.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function getSessionUser() {
    // 1. Try PHP session first (set at login)
    if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
        return [
            'user_id' => $_SESSION['user_id'],
            'role'    => $_SESSION['role']
        ];
    }

    // 2. Fallback: read from request headers sent by the JS frontend
    //    Apache: HTTP_X_USER_ID, Nginx: may need different handling
    $header_id   = $_SERVER['HTTP_X_USER_ID']   ?? null;
    $header_role = $_SERVER['HTTP_X_USER_ROLE']  ?? null;

    if ($header_id && $header_role) {
        // Validate role is one we know
        $allowed_roles = ['Admin', 'Staff', 'Student'];
        if (in_array($header_role, $allowed_roles)) {
            // Also set the session so subsequent calls work
            $_SESSION['user_id'] = intval($header_id);
            $_SESSION['role']    = $header_role;
            return [
                'user_id' => intval($header_id),
                'role'    => $header_role
            ];
        }
    }

    return null; // Not authenticated
}
?>
