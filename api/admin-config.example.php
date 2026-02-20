<?php
/**
 * Admin configuration. Copy this file to admin-config.php and set your password.
 *
 *   cp api/admin-config.example.php api/admin-config.php
 *
 * The admin-config.php file is gitignored. Default password is "changeme" — change it!
 *
 * Generate a new hash: php -r "echo password_hash('your-password', PASSWORD_DEFAULT);"
 */
return [
    // Pre-computed hash for "changeme" — change this for production!
    'password_hash' => '$2y$12$AP0FFQV.90se48qDL2jWOugSTuvC9pTDUTN/iMjmBtc9k0I49mow.',
];
