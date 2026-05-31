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

$toEmail = strtolower(trim((string) (
    $config['school_quote_email']
    ?? $config['admin_email']
    ?? 'techm8contact@gmail.com'
)));
$fromEmail = strtolower(trim((string) ($config['from_email'] ?? 'no-reply@techm8australia.com')));
$fromName = trim((string) ($config['from_name'] ?? 'TECHM8 School Quotes'));

if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Email configuration is incomplete.']);
    exit;
}

$fields = [
    'school_name' => 'School name',
    'customer_name' => 'Contact name',
    'phone' => 'Phone',
    'email' => 'Email',
    'device_type' => 'Device type',
    'support_details' => 'Support details',
];

$values = [];
foreach ($fields as $key => $label) {
    $values[$key] = trim((string) ($_POST[$key] ?? ''));
}

foreach (['school_name', 'customer_name', 'phone', 'email', 'device_type', 'support_details'] as $required) {
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

if (trim((string) ($_POST['company_website'] ?? '')) !== '') {
    echo json_encode([
        'ok' => true,
        'quote_code' => 'SCHOOL-' . date('Ymd') . '-RECEIVED',
        'message' => 'Your school quote request has been submitted. TECHM8 will contact you shortly.',
    ]);
    exit;
}

$quoteCode = 'SCHOOL-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
$lines = [
    'A new TECHM8 school quote request has been submitted.',
    '',
    'Quote code: ' . $quoteCode,
];

foreach ($fields as $key => $label) {
    $lines[] = $label . ': ' . ($values[$key] !== '' ? $values[$key] : 'Not provided');
}

$lines[] = 'Source page: ' . trim((string) ($_POST['source_page'] ?? '/school-services'));
$lines[] = 'IP address: ' . ($_SERVER['REMOTE_ADDR'] ?? 'Not available');
$lines[] = 'User agent: ' . substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'Not available'), 0, 255);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $fromName . ' <' . $fromEmail . '>',
    'Reply-To: ' . $values['email'],
];

$subject = 'New TECHM8 school quote: ' . $values['school_name'] . ' (' . $quoteCode . ')';
$sent = @mail($toEmail, $subject, implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'School quote request could not be emailed.']);
    exit;
}

echo json_encode([
    'ok' => true,
    'quote_code' => $quoteCode,
    'message' => 'Your school quote request has been submitted. TECHM8 will contact you shortly.',
]);
