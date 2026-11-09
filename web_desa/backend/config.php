<?php
// KONEKSI DATABASE
ini_set('display_errors', 0);          // JANGAN tampilkan error di response
ini_set('display_startup_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_reporting(E_ALL);

// Set timezone Indonesia
date_default_timezone_set('Asia/Jakarta');

// LOAD ENVIRONMENT VARIABLES dari file .env
// Muat file .env dan set sebagai environment variables
function loadEnv($path) {
    if (!file_exists($path)) {
        // Jika file .env tidak ada, gunakan default
        error_log("WARNING: .env file not found at: " . $path);
        return;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip komentar
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Parse key=value
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $name = trim($parts[0]);
            $value = trim($parts[1]);
            
            // Hapus tanda kutip jika ada
            $value = trim($value, '"\'');
            
            // Set environment variable
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Muat file .env dari direktori yang sama dengan config.php
loadEnv(__DIR__ . '/.env');

// DATABASE CONFIGURATION
// Gunakan environment variables dengan fallback ke default
define("DB_HOST", getenv('DB_HOST') ?: "127.0.0.1");
define("DB_USER", getenv('DB_USER') ?: "root");
define("DB_PASS", getenv('DB_PASS') ?: "");
define("DB_NAME", getenv('DB_NAME') ?: "inventaris_desa");

// CORS CONFIGURATION
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500',    //Live Server
    'http://127.0.0.1:5501',    //Live Server alternatif
    'http://localhost',
    'http://127.0.0.1',
];

if (isset($_SERVER['HTTP_ORIGIN'])) {
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
        header("Access-Control-Allow-Credentials: true");
    }
}

header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With", "X-Actor");

// Preflight request browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// DATABASE CONNECTION
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    // Log error untuk debugging
    error_log("Database connection failed: " . $conn->connect_error);
    http_response_code(500);
    echo json_encode([
        "error" => "Koneksi database gagal",
        "detail" => $conn->connect_error
    ]);
    exit;
}

$conn->set_charset("utf8mb4");

// HELPER FUNCTIONS
// Ambil body JSON dari request
function getJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Kirim response JSON lalu berhenti
function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Log error ke file (opsional)
function logError($message) {
    $logFile = __DIR__ . '/../logs/error.log';
    $date = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$date] $message\n", FILE_APPEND);
}

// Generate random password
function generateRandomPassword($length = 10) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+';
    $charactersLength = strlen($characters);
    $randomPassword = '';
    
    for ($i = 0; $i < $length; $i++) {
        $randomPassword .= $characters[random_int(0, $charactersLength - 1)];
    }
    
    return $randomPassword;
}

// ============================================================
// LOG AKTIVITAS OTOMATIS
// Panggil fungsi ini setiap habis operasi CRUD
// ============================================================
function logActivity($conn, $actor, $action, $detail = '') {
    try {
        $stmt = $conn->prepare("
            INSERT INTO activity_log (actor, action, detail, timestamp)
            VALUES (?, ?, ?, NOW())
        ");
        if (!$stmt) return false;
        
        $stmt->bind_param("sss", $actor, $action, $detail);
        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    } catch (Exception $e) {
        error_log("logActivity error: " . $e->getMessage());
        return false;
    }
}

// Ambil nama aktor dari header (frontend kirim X-Actor)
function getActorName() {
    // Coba dari header kustom dulu
    if (!empty($_SERVER['HTTP_X_ACTOR'])) {
        return trim($_SERVER['HTTP_X_ACTOR']);
    }
    // Fallback
    return 'System';
}