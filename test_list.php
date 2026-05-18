<?php
require 'db.php';
session_start();
$_SESSION['user_id'] = 3;
$_SESSION['role'] = 'Student';
$_GET['action'] = 'list';
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
include 'tickets.php';
$output = ob_get_clean();
echo $output;
