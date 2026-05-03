<?php
require 'db.php';
$stmt = $pdo->query("SELECT * FROM tickets");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
