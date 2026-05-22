<?php
/**
 * db.php
 * Handles the central database connection for the entire backend using PDO.
 * All other PHP scripts that need database access will include this file.
 */

// Database configuration settings
$host     = 'localhost';
$dbname   = 'unisolve'; // Name of the database to connect to
$username = 'root';      // Database username
$password = '';          // Database password (empty for default XAMPP setup)

try {
    // Attempt to establish a secure PDO connection to the MySQL database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    
    // Configure PDO to throw exceptions automatically when database errors occur
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // If the connection fails, stop the script entirely and return a JSON error
    http_response_code(500); // 500 Internal Server Error
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}
?>