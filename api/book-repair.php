<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'ok' => false,
        'error' => 'Method not allowed.',
    ]);
    exit;
}

$configCandidates = [
    __DIR__ . '/config.php',
    dirname(__DIR__, 2) . '/techm8-booking-config.php',
    dirname(__DIR__) . '/techm8-booking-config.php',
];

$configFile = null;
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) {
        $configFile = $candidate;
        break;
    }
}

if ($configFile === null) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Server configuration is missing.',
    ]);
    exit;
}

$config = require $configFile;

foreach (['db_host', 'db_name', 'db_user', 'db_pass', 'admin_email', 'from_email', 'from_name'] as $requiredConfig) {
    if (!isset($config[$requiredConfig]) || $config[$requiredConfig] === '') {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Server configuration is incomplete.',
        ]);
        exit;
    }
}

$allowedCategories = ['phone', 'computer', 'tablet', 'gaming_console'];
$allowedStores = ['park-ridge', 'fairfield', 'north-lakes', 'toowong', 'brassall'];
$allowedContactMethods = ['phone', 'email', 'sms'];

$repairCategory = trim((string) ($_POST['repair_category'] ?? ''));
$storeSlug = trim((string) ($_POST['store_slug'] ?? ''));
$brand = trim((string) ($_POST['brand'] ?? ''));
$deviceModel = trim((string) ($_POST['device_model'] ?? ''));
$issueDescription = trim((string) ($_POST['issue_description'] ?? ''));
$preferredDate = trim((string) ($_POST['preferred_date'] ?? ''));
$preferredTime = trim((string) ($_POST['preferred_time'] ?? ''));
$customerName = trim((string) ($_POST['customer_name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$preferredContactMethod = trim((string) ($_POST['preferred_contact_method'] ?? 'phone'));
$consent = trim((string) ($_POST['privacy_consent'] ?? ''));

if (!in_array($repairCategory, $allowedCategories, true)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please select a valid repair category.']);
    exit;
}

if (!in_array($storeSlug, $allowedStores, true)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please select a valid store.']);
    exit;
}

if ($deviceModel === '' || $issueDescription === '' || $customerName === '' || $phone === '' || $email === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please complete all required fields.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Please enter a valid email address.']);
    exit;
}

if (!in_array($preferredContactMethod, $allowedContactMethods, true)) {
    $preferredContactMethod = 'phone';
}

if ($consent !== 'yes') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'You must confirm the contact consent before submitting.']);
    exit;
}

if ($preferredDate !== '') {
    $date = DateTime::createFromFormat('Y-m-d', $preferredDate);
    if (!$date || $date->format('Y-m-d') !== $preferredDate) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Preferred date is invalid.']);
        exit;
    }
}

$bookingCode = 'TM8-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));

$storeLabels = [
    'park-ridge' => 'Park Ridge',
    'fairfield' => 'Fairfield',
    'north-lakes' => 'North Lakes',
    'toowong' => 'Toowong',
    'brassall' => 'Brassall',
];

$categoryLabels = [
    'phone' => 'Phone',
    'computer' => 'Computer',
    'tablet' => 'Tablet',
    'gaming_console' => 'Gaming Console',
];

$storeEmail = null;

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']),
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $statement = $pdo->prepare(
        'INSERT INTO repair_bookings
        (
            booking_code,
            store_slug,
            repair_category,
            brand,
            device_model,
            issue_description,
            preferred_date,
            preferred_time,
            customer_name,
            phone,
            email,
            preferred_contact_method,
            ip_address,
            user_agent
        )
        VALUES
        (
            :booking_code,
            :store_slug,
            :repair_category,
            :brand,
            :device_model,
            :issue_description,
            :preferred_date,
            :preferred_time,
            :customer_name,
            :phone,
            :email,
            :preferred_contact_method,
            :ip_address,
            :user_agent
        )'
    );

    $statement->execute([
        ':booking_code' => $bookingCode,
        ':store_slug' => $storeSlug,
        ':repair_category' => $repairCategory,
        ':brand' => $brand !== '' ? $brand : null,
        ':device_model' => $deviceModel,
        ':issue_description' => $issueDescription,
        ':preferred_date' => $preferredDate !== '' ? $preferredDate : null,
        ':preferred_time' => $preferredTime !== '' ? $preferredTime : null,
        ':customer_name' => $customerName,
        ':phone' => $phone,
        ':email' => $email,
        ':preferred_contact_method' => $preferredContactMethod,
        ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        ':user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 255) : null,
    ]);
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Booking could not be saved.',
    ]);
    exit;
}

try {
    $storeStatement = $pdo->prepare('SELECT email FROM stores WHERE slug = :store_slug LIMIT 1');
    $storeStatement->execute([':store_slug' => $storeSlug]);
    $storeRow = $storeStatement->fetch();
    if ($storeRow && !empty($storeRow['email']) && filter_var($storeRow['email'], FILTER_VALIDATE_EMAIL)) {
        $storeEmail = strtolower(trim((string) $storeRow['email']));
    }
} catch (Throwable $exception) {
    $storeEmail = null;
}

$storeLabel = $storeLabels[$storeSlug] ?? $storeSlug;
$categoryLabel = $categoryLabels[$repairCategory] ?? $repairCategory;

$adminSubject = 'New TECHM8 repair booking: ' . $bookingCode;
$adminMessage = implode("\n", [
    'A new repair booking has been submitted.',
    '',
    'Booking code: ' . $bookingCode,
    'Store: ' . $storeLabel,
    'Category: ' . $categoryLabel,
    'Brand: ' . ($brand !== '' ? $brand : 'Not provided'),
    'Model: ' . $deviceModel,
    'Issue: ' . $issueDescription,
    'Preferred date: ' . ($preferredDate !== '' ? $preferredDate : 'Not provided'),
    'Preferred time: ' . ($preferredTime !== '' ? $preferredTime : 'Not provided'),
    'Customer: ' . $customerName,
    'Phone: ' . $phone,
    'Email: ' . $email,
    'Preferred contact: ' . ucfirst($preferredContactMethod),
]);

$customerSubject = 'TECHM8 repair request received: ' . $bookingCode;
$customerMessage = implode("\n", [
    'Hi ' . $customerName . ',',
    '',
    'Your repair request has been received.',
    '',
    'Booking code: ' . $bookingCode,
    'Store: ' . $storeLabel,
    'Category: ' . $categoryLabel,
    'Device model: ' . $deviceModel,
    'Issue summary: ' . $issueDescription,
    '',
    'Our team will review the request and contact you using your preferred method.',
    '',
    'TECHM8',
]);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>',
    'Reply-To: ' . $config['admin_email'],
];

$internalRecipients = [];
foreach ([$config['admin_email'], $storeEmail] as $recipient) {
    $recipient = strtolower(trim((string) $recipient));
    if ($recipient !== '' && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        $internalRecipients[$recipient] = true;
    }
}

foreach (array_keys($internalRecipients) as $recipient) {
    @mail($recipient, $adminSubject, $adminMessage, implode("\r\n", $headers));
}
@mail($email, $customerSubject, $customerMessage, implode("\r\n", $headers));

echo json_encode([
    'ok' => true,
    'booking_code' => $bookingCode,
    'message' => 'Your repair request has been submitted.',
]);
