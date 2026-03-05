<?php
/**
 * Returns true if admin is authenticated. Call at start of admin API endpoints.
 */
require __DIR__ . '/admin-session.php';
return !empty($_SESSION['admin_authenticated']);
