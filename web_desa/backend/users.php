<?php
// backend/users.php

require_once "config.php";

// Session
$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Pastikan sudah login sebagai Admin
if (
    empty($_SESSION['user']) ||
    ($_SESSION['user']['role'] ?? '') !== 'ADMIN'
) {
    sendJson([
        "success" => false,
        "error" => "Akses ditolak. Silakan login sebagai Admin."
    ], 401);
    exit;
}

$conn->set_charset("utf8mb4");

$adminId = (int)$_SESSION['user']['id'];
$method = $_SERVER['REQUEST_METHOD'];

// ======================================
// GET — Ambil data Admin yang sedang login
// ======================================

if ($method === 'GET') {

    $stmt = $conn->prepare(
        "SELECT id, nama, username, email, role,
                status, last_login, created_at
         FROM users
         WHERE id = ? AND role = 'ADMIN'
         LIMIT 1"
    );

    $stmt->bind_param("i", $adminId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        session_destroy();

        sendJson([
            "success" => false,
            "error" => "Akun Admin tidak ditemukan."
        ], 404);
        exit;
    }

    $admin = $result->fetch_assoc();
    $stmt->close();

    // Frontend tetap menerima array
    sendJson([$admin]);
    exit;
}

// ======================================
// POST — Tambah pengguna tidak diizinkan
// ======================================

if ($method === 'POST') {

    sendJson([
        "success" => false,
        "error" => "Penambahan pengguna dinonaktifkan. Sistem hanya menggunakan satu akun Admin."
    ], 403);

    exit;
}

// ======================================
// PUT — Ubah data Admin sendiri
// ======================================

if ($method === 'PUT') {

    $input = getJsonInput();

    // ID selalu menggunakan session,
    // bukan ID yang dikirim dari frontend.
    $id = $adminId;

    // A. UBAH PASSWORD SENDIRI
    if (!empty($input['change_own_password'])) {

        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if ($oldPassword === '' || $newPassword === '') {
            sendJson([
                "success" => false,
                "error" => "Password lama dan baru wajib diisi."
            ], 400);
            exit;
        }

        if (strlen($newPassword) < 6) {
            sendJson([
                "success" => false,
                "error" => "Password baru minimal 6 karakter."
            ], 400);
            exit;
        }

        $stmt = $conn->prepare(
            "SELECT password FROM users
             WHERE id = ? AND role = 'ADMIN'"
        );

        $stmt->bind_param("i", $id);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            sendJson([
                "success" => false,
                "error" => "Akun Admin tidak ditemukan."
            ], 404);
            exit;
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        // Verifikasi password lama
        $valid = password_verify(
            $oldPassword,
            $user['password']
        );

        // Dukungan password plaintext lama
        if (
            !$valid &&
            hash_equals(
                (string)$user['password'],
                (string)$oldPassword
            )
        ) {
            $valid = true;
        }

        if (!$valid) {
            sendJson([
                "success" => false,
                "error" => "Password lama salah."
            ], 400);
            exit;
        }

        $hashedPassword = password_hash(
            $newPassword,
            PASSWORD_DEFAULT
        );

        $stmt = $conn->prepare(
            "UPDATE users SET password = ?
             WHERE id = ? AND role = 'ADMIN'"
        );

        $stmt->bind_param(
            "si",
            $hashedPassword,
            $id
        );

        if ($stmt->execute()) {
            sendJson([
                "success" => true,
                "message" => "Password Admin berhasil diubah."
            ]);
        } else {
            sendJson([
                "success" => false,
                "error" => "Gagal mengubah password."
            ], 500);
        }

        $stmt->close();
        exit;
    }

    // B. UBAH NAMA SENDIRI
    if (!empty($input['change_own_name'])) {

        $nama = trim($input['nama'] ?? '');

        if (strlen($nama) < 2) {
            sendJson([
                "success" => false,
                "error" => "Nama minimal 2 karakter."
            ], 400);
            exit;
        }

        $stmt = $conn->prepare(
            "UPDATE users SET nama = ?
             WHERE id = ? AND role = 'ADMIN'"
        );

        $stmt->bind_param("si", $nama, $id);

        if ($stmt->execute()) {

            $_SESSION['user']['nama'] = $nama;

            sendJson([
                "success" => true,
                "message" => "Nama Admin berhasil diubah.",
                "new_nama" => $nama
            ]);

        } else {
            sendJson([
                "success" => false,
                "error" => "Gagal mengubah nama."
            ], 500);
        }

        $stmt->close();
        exit;
    }

    // C. UBAH USERNAME SENDIRI
    if (!empty($input['change_own_username'])) {

        $username = trim($input['username'] ?? '');

        if (strlen($username) < 3) {
            sendJson([
                "success" => false,
                "error" => "Username minimal 3 karakter."
            ], 400);
            exit;
        }

        if (!preg_match('/^[a-zA-Z0-9._-]+$/', $username)) {
            sendJson([
                "success" => false,
                "error" => "Username hanya boleh huruf, angka, titik, underscore, dan strip."
            ], 400);
            exit;
        }

        // Cek username duplikat
        $stmt = $conn->prepare(
            "SELECT id FROM users
             WHERE username = ? AND id != ?"
        );

        $stmt->bind_param("si", $username, $id);
        $stmt->execute();

        if ($stmt->get_result()->num_rows > 0) {
            sendJson([
                "success" => false,
                "error" => "Username sudah digunakan."
            ], 400);
            exit;
        }

        $stmt->close();

        $stmt = $conn->prepare(
            "UPDATE users SET username = ?
             WHERE id = ? AND role = 'ADMIN'"
        );

        $stmt->bind_param("si", $username, $id);

        if ($stmt->execute()) {

            $_SESSION['user']['username'] = $username;

            sendJson([
                "success" => true,
                "message" => "Username Admin berhasil diubah.",
                "new_username" => $username
            ]);

        } else {
            sendJson([
                "success" => false,
                "error" => "Gagal mengubah username."
            ], 500);
        }

        $stmt->close();
        exit;
    }

    // Operasi perubahan lainnya ditolak
    sendJson([
        "success" => false,
        "error" => "Operasi tidak diizinkan. Admin hanya dapat mengubah data miliknya sendiri."
    ], 403);

    exit;
}

// ======================================
// DELETE — Penghapusan akun dinonaktifkan
// ======================================

if ($method === 'DELETE') {

    sendJson([
        "success" => false,
        "error" => "Akun Admin utama tidak dapat dihapus melalui sistem."
    ], 403);

    exit;
}

// ======================================
// METHOD LAIN
// ======================================

sendJson([
    "success" => false,
    "error" => "Method tidak didukung."
], 405);

exit;