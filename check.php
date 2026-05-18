<?php
require_once 'db.php';
$stmt = $pdo->query("SELECT id, name, email, role, is_approved, is_active, password FROM users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
