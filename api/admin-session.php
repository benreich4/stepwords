<?php
/**
 * Admin session bootstrap. Extends session lifetime so login persists.
 * Must be required before any session usage in admin endpoints.
 */
$lifetime = 30 * 24 * 60 * 60; // 30 days
ini_set('session.gc_maxlifetime', (string) $lifetime);
session_set_cookie_params([
    'lifetime' => $lifetime,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
