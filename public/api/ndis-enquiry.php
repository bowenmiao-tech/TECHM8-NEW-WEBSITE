<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

$configCandidates = [
    __DIR__ . '/config.php',
    dirname(__DIR__, 2) . '/techm8-booking-config.php',
    dirname(__DIR__) . '/techm8-booking-config.php',
];

$config = [];
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) {
        $loaded = require $candidate;
        if (is_array($loaded)) {
            $config = $loaded;
        }
        break;
    }
}

$toEmail = strtolower(trim((string) ($config['ndis_notification_email'] ?? 'techm8contact@gmail.com')));
$fromEmail = strtolower(trim((string) ($config['from_email'] ?? 'no-reply@techm8australia.com')));
$fromName = trim((string) ($config['from_name'] ?? 'TECHM8 NDIS Enquiries'));

if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Email configuration is incomplete.']);
    exit;
}

$fields = [
    'customer_name' => 'Name',
    'contact_role' => 'Role',
    'phone' => 'Phone',
    'email' => 'Email',
    'preferred_contact_method' => 'Preferred contact',
    'support_location' => 'Support location',
    'device_type' => 'Device type',
    'support_type' => 'Support type',
    'support_details' => 'Support details',
];

$values = [];
foreach ($fields as $key => $label) {
    $values[$key] = trim((string) ($_POST[$key] ?? ''));
}

foreach (['customer_name', 'contact_role', 'phone', 'email', 'preferred_contact_method', 'device_type', 'support_type', 'support_details'] as $required) {
    if ($values[$required] === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Please complete all required fields.']);
        exit;
    }
}

if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please enter a valid email address.']);
    exit;
}

if (trim((string) ($_POST['privacy_consent'] ?? '')) !== 'yes') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please confirm consent before submitting.']);
    exit;
}

$enquiryCode = 'NDIS-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
$lines = [
    'A new TECHM8 NDIS technology support enquiry has been submitted.',
    '',
    'Enquiry code: ' . $enquiryCode,
];

foreach ($fields as $key => $label) {
    $lines[] = $label . ': ' . ($values[$key] !== '' ? $values[$key] : 'Not provided');
}

$lines[] = 'IP address: ' . ($_SERVER['REMOTE_ADDR'] ?? 'Not available');
$lines[] = 'User agent: ' . substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'Not available'), 0, 255);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $fromName . ' <' . $fromEmail . '>',
    'Reply-To: ' . $values['email'],
];

$subject = 'New TECHM8 NDIS enquiry: ' . $enquiryCode;
$sent = @mail($toEmail, $subject, implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Enquiry could not be emailed.']);
    exit;
}

echo json_encode([
    'ok' => true,
    'enquiry_code' => $enquiryCode,
    'message' => 'Your enquiry has been submitted. TECHM8 will contact you shortly.',
]);
