<?php
require 'db.php';
session_start();
$_SESSION['user_id'] = 1; // Admin user (assumed)
$_SESSION['role'] = 'Admin';
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
include 'dashboard.php';
$output = ob_get_clean();
echo $output;
