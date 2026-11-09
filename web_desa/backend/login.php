<?php
// backend/login.php

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Session aman untuk aplikasi same-origin
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Hanya menerima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method tidak didukung."
    ]);
    exit;
}

// Koneksi database
$conn = new mysqli(
    "localhost",
    "root",
    "",
    "inventaris_desa"
);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Koneksi database gagal."
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

// Ambil input JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Input JSON tidak valid."
    ]);
    exit;
}

$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Username dan password wajib diisi."
    ]);
    exit;
}

// Cari akun berdasarkan username
$stmt = $conn->prepare(
    "SELECT id, nama, username, password, role, status
     FROM users
     WHERE username = ?
     LIMIT 1"
);

$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Username atau password salah."
    ]);
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

// Hanya Admin yang diperbolehkan
if ($user['role'] !== 'ADMIN') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Akses hanya diperbolehkan untuk Admin."
    ]);
    exit;
}

// Cek status akun
if ($user['status'] !== 'Aktif') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "error" => "Akun tidak aktif."
    ]);
    exit;
}

// Verifikasi password
$passwordValid = password_verify(
    $password,
    $user['password']
);

// Dukungan sementara untuk password plaintext lama
$isLegacyPassword = false;

if (!$passwordValid && hash_equals(
    (string)$user['password'],
    (string)$password
)) {
    $passwordValid = true;
    $isLegacyPassword = true;
}

if (!$passwordValid) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Username atau password salah."
    ]);
    exit;
}

// Migrasi password plaintext menjadi hash
if ($isLegacyPassword) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);

    $updatePassword = $conn->prepare(
        "UPDATE users SET password = ? WHERE id = ?"
    );

    $updatePassword->bind_param(
        "si",
        $newHash,
        $user['id']
    );

    $updatePassword->execute();
    $updatePassword->close();
}

// Regenerasi session ID setelah login
session_regenerate_id(true);

// Simpan identitas Admin ke session
$_SESSION['user'] = [
    'id' => (int)$user['id'],
    'nama' => $user['nama'],
    'username' => $user['username'],
    'role' => 'ADMIN'
];

// Update waktu login
$updateStmt = $conn->prepare(
    "UPDATE users SET last_login = NOW() WHERE id = ?"
);

$updateStmt->bind_param("i", $user['id']);
$updateStmt->execute();
$updateStmt->close();

// Response sukses
echo json_encode([
    "success" => true,
    "user" => [
        "id" => $user['id'],
        "nama" => $user['nama'],
        "username" => $user['username'],
        "role" => "ADMIN"
    ]
]);

$conn->close();