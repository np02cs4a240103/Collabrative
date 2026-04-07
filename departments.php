<?php
require_once '../includes/db.php';
require_once '../includes/functions.php';

$departments = $conn->query("SELECT * FROM departments ORDER BY name ASC");
$data = [];
while($row = $departments->fetch_assoc()) {
    $data[] = $row;
}
jsonResponse("success", "Departments retrieved", $data);
?>
