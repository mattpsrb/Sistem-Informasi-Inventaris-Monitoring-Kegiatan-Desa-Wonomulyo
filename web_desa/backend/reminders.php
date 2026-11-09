<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        try {
            $result = $conn->query("SELECT 
                id, title, description, reminder_date as date, 
                reminder_time as time, related_type, related_id, 
                priority, status, category 
                FROM reminders ORDER BY reminder_date ASC");
            if (!$result) {
                sendJson(["error" => "Query error: " . $conn->error], 500);
            }
            sendJson($result->fetch_all(MYSQLI_ASSOC));
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    case 'POST':
        try {
            $d = getJsonInput();
            
            if (empty($d['title']) || empty($d['reminder_date']) || empty($d['date'])) {
                // Support kedua format
                $date = $d['reminder_date'] ?? $d['date'] ?? date('Y-m-d');
                $time = $d['reminder_time'] ?? $d['time'] ?? '09:00';
                $title = $d['title'] ?? '';
                $description = $d['description'] ?? '';
                $related_type = $d['related_type'] ?? null;
                $related_id = $d['related_id'] ?? null;
                $priority = $d['priority'] ?? 'info';
                $status = $d['status'] ?? 'pending';
                $category = $d['category'] ?? 'Kegiatan';
            } else {
                $date = $d['reminder_date'];
                $time = $d['reminder_time'] ?? '09:00';
                $title = $d['title'];
                $description = $d['description'] ?? '';
                $related_type = $d['related_type'] ?? null;
                $related_id = $d['related_id'] ?? null;
                $priority = $d['priority'] ?? 'info';
                $status = $d['status'] ?? 'pending';
                $category = $d['category'] ?? 'Kegiatan';
            }

            if (empty($title) || empty($date)) {
                sendJson(["error" => "Judul dan tanggal reminder wajib diisi"], 400);
            }

            $stmt = $conn->prepare("INSERT INTO reminders
                (title, description, reminder_date, reminder_time, related_type, related_id, priority, status, category)
                VALUES (?,?,?,?,?,?,?,?,?)");

            $stmt->bind_param(
                "sssssisss",
                $title, $description, $date, $time,
                $related_type, $related_id, $priority, $status, $category
            );

            if ($stmt->execute()) {
                sendJson(["success" => true, "id" => $stmt->insert_id], 201);
            } else {
                sendJson(["error" => $stmt->error], 400);
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        try {
            $d = getJsonInput();
            if (!isset($d['id']) || !isset($d['status'])) {
                sendJson(["error" => "id dan status wajib diisi"], 400);
            }

            $id = (int)$d['id'];
            $status = $d['status'];

            $stmt = $conn->prepare("UPDATE reminders SET status = ? WHERE id = ?");
            $stmt->bind_param("si", $status, $id);

            if ($stmt->execute()) {
                sendJson(["success" => true]);
            } else {
                sendJson(["error" => $stmt->error], 400);
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    case 'DELETE':
        try {
            if (!isset($_GET['id'])) sendJson(["error" => "id wajib diisi"], 400);
            $id = (int)$_GET['id'];

            $stmt = $conn->prepare("DELETE FROM reminders WHERE id = ?");
            $stmt->bind_param("i", $id);

            if ($stmt->execute()) {
                sendJson(["success" => true]);
            } else {
                sendJson(["error" => $stmt->error], 400);
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    default:
        sendJson(["error" => "Method tidak didukung"], 405);
}