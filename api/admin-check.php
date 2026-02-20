<?php
/**
 * Returns true if admin is authenticated. Call at start of admin API endpoints.
 */
session_start();
return !empty($_SESSION['admin_authenticated']);
