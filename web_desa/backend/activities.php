<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ============================================================
    // GET: Ambil activities
    // ============================================================
    case 'GET':
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $conn->prepare("SELECT 
                id, title, category, activity_date as date, 
                start_time, end_time, location, pic, participants, 
                description, status, progress, reminder, documentation, notes, result 
                FROM activities WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $item = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$item) sendJson(["error" => "Data tidak ditemukan"], 404);
            sendJson($item);
        } else {
            $result = $conn->query("SELECT 
                id, title, category, activity_date as date, 
                start_time, end_time, location, pic, participants, 
                description, status, progress, reminder, documentation, notes, result 
                FROM activities ORDER BY activity_date ASC");
            if (!$result) {
                sendJson(["error" => "Query error: " . $conn->error], 500);
            }
            sendJson($result->fetch_all(MYSQLI_ASSOC));
        }
        break;

    // ============================================================
    // POST: Tambah kegiatan + auto-create reminder + log aktivitas
    // ============================================================
    case 'POST':
        try {
            $d = getJsonInput();
            
            if (empty($d['title']) || empty($d['date'])) {
                sendJson(["error" => "Judul dan tanggal wajib diisi"], 400);
            }

            $title = $d['title'];
            $category = $d['category'] ?? 'kegiatan';
            $activity_date = $d['date'];
            $start_time = $d['start_time'] ?? '09:00';
            $end_time = $d['end_time'] ?? '11:00';
            $location = $d['location'] ?? 'Balai Desa';
            $pic = $d['pic'] ?? 'Sekretaris Desa';
            $participants = (int)($d['participants'] ?? 0);
            $description = $d['description'] ?? '';
            $status = $d['status'] ?? 'Direncanakan';
            $progress = (int)($d['progress'] ?? 0);
            $reminder = $d['reminder'] ?? '1 hari sebelum';
            $documentation = (int)($d['documentation'] ?? 0);
            $notes = $d['notes'] ?? '';
            $result_text = $d['result'] ?? '';

            $stmt = $conn->prepare("INSERT INTO activities
                (title, category, activity_date, start_time, end_time, location, pic, participants, description, status, progress, reminder, documentation, notes, result)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

            if (!$stmt) {
                sendJson(["error" => "Prepare failed: " . $conn->error], 500);
            }

            $stmt->bind_param(
                "sssssssissisiss",
                $title, $category, $activity_date, $start_time, $end_time,
                $location, $pic, $participants, $description, $status,
                $progress, $reminder, $documentation, $notes, $result_text
            );

            if (!$stmt->execute()) {
                sendJson(["error" => "Execute failed: " . $stmt->error], 400);
            }
            
            $newId = $stmt->insert_id;
            $stmt->close();

            // ✅ CATAT LOG AKTIVITAS
            logActivity(
                $conn,
                getActorName(),
                "menambahkan kegiatan",
                $title
            );

            // AUTO-CREATE REMINDER - dibungkus try-catch agar tidak ganggu
            if ($status !== 'Selesai') {
                try {
                    $reminderDesc = !empty($description) ? $description : ("Kegiatan di " . $location);
                    $priority = ($status === 'Berlangsung') ? 'warning' : 'info';
                    
                    $stmtR = $conn->prepare("INSERT INTO reminders 
                        (title, description, reminder_date, reminder_time, related_type, related_id, priority, status, category) 
                        VALUES (?, ?, ?, ?, 'kegiatan', ?, ?, 'pending', ?)");
                    
                    if ($stmtR) {
                        $stmtR->bind_param("ssssiss",
                            $title,
                            $reminderDesc,
                            $activity_date,
                            $start_time,
                            $newId,
                            $priority,
                            $category
                        );
                        $stmtR->execute();
                        $stmtR->close();
                    }
                } catch (Exception $e) {
                    error_log("Reminder auto-create failed: " . $e->getMessage());
                }
            }
            
            sendJson(["success" => true, "id" => $newId], 201);
            
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    // ============================================================
    // PUT: Update kegiatan + sync reminder + log aktivitas
    // ============================================================
    case 'PUT':
        try {
            $d = getJsonInput();
            if (!isset($d['id'])) sendJson(["error" => "id wajib diisi"], 400);

            $id = (int)$d['id'];
            $title = $d['title'] ?? '';
            $category = $d['category'] ?? 'kegiatan';
            $activity_date = $d['date'] ?? $d['activity_date'] ?? date('Y-m-d');
            $start_time = $d['start_time'] ?? '09:00';
            $end_time = $d['end_time'] ?? '11:00';
            $location = $d['location'] ?? 'Balai Desa';
            $pic = $d['pic'] ?? 'Sekretaris Desa';
            $participants = (int)($d['participants'] ?? 0);
            $description = $d['description'] ?? '';
            $status = $d['status'] ?? 'Direncanakan';
            $progress = (int)($d['progress'] ?? 0);
            $reminder = $d['reminder'] ?? '1 hari sebelum';
            $documentation = (int)($d['documentation'] ?? 0);
            $notes = $d['notes'] ?? '';
            $result_text = $d['result'] ?? '';

            // Update kegiatan
            $stmt = $conn->prepare("UPDATE activities SET
                title=?, category=?, activity_date=?, start_time=?, end_time=?, location=?, pic=?,
                participants=?, description=?, status=?, progress=?, reminder=?, documentation=?, notes=?, result=?
                WHERE id=?");

            if (!$stmt) {
                sendJson(["error" => "Prepare failed: " . $conn->error], 500);
            }

            $stmt->bind_param(
                "sssssssissisissi",
                $title, $category, $activity_date, $start_time, $end_time,
                $location, $pic, $participants, $description, $status,
                $progress, $reminder, $documentation, $notes, $result_text, $id
            );

            if (!$stmt->execute()) {
                sendJson(["error" => $stmt->error], 400);
            }
            $stmt->close();

            // ✅ CATAT LOG AKTIVITAS
            logActivity(
                $conn,
                getActorName(),
                "mengubah kegiatan",
                $title
            );

            // SYNC REMINDER
            syncReminderWithActivity($conn, $id, [
                'title' => $title,
                'category' => $category,
                'date' => $activity_date,
                'start_time' => $start_time,
                'location' => $location,
                'description' => $description,
                'status' => $status,
                'progress' => $progress
            ]);

            sendJson(["success" => true]);
            
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    // ============================================================
    // DELETE: Hapus kegiatan + hapus reminder + log aktivitas
    // ============================================================
    case 'DELETE':
        try {
            if (!isset($_GET['id'])) sendJson(["error" => "id wajib diisi"], 400);
            $id = (int)$_GET['id'];

            // ✅ Ambil judul dulu sebelum dihapus (untuk log)
            $stmtGet = $conn->prepare("SELECT title FROM activities WHERE id = ?");
            $stmtGet->bind_param("i", $id);
            $stmtGet->execute();
            $actData = $stmtGet->get_result()->fetch_assoc();
            $stmtGet->close();
            $actTitle = $actData['title'] ?? "ID $id";

            // 1. Hapus reminder terkait DULU
            try {
                $stmtR = $conn->prepare("DELETE FROM reminders WHERE related_type = 'kegiatan' AND related_id = ?");
                $stmtR->bind_param("i", $id);
                $stmtR->execute();
                $stmtR->close();
                error_log("Deleted reminders for activity ID: " . $id);
            } catch (Exception $e) {
                error_log("Delete reminder error: " . $e->getMessage());
            }

            // 2. Hapus kegiatan
            $stmt = $conn->prepare("DELETE FROM activities WHERE id = ?");
            $stmt->bind_param("i", $id);

            if ($stmt->execute()) {
                $affected = $stmt->affected_rows;
                $stmt->close();
                
                if ($affected > 0) {
                    // ✅ CATAT LOG AKTIVITAS
                    logActivity(
                        $conn,
                        getActorName(),
                        "menghapus kegiatan",
                        $actTitle
                    );
                    
                    sendJson(["success" => true, "deleted_id" => $id, "rows_affected" => $affected]);
                } else {
                    sendJson(["error" => "Kegiatan dengan ID " . $id . " tidak ditemukan"], 404);
                }
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

// ============================================================
// HELPER: Buat reminder baru dari kegiatan
// ============================================================
function createReminderFromActivity($conn, $activityId, $data) {
    $reminderTitle = $data['title'];
    $reminderDesc = $data['description'] ?: ("Kegiatan di " . $data['location']);
    $reminderDate = $data['date'];
    $reminderTime = $data['start_time'];
    $priority = 'info';
    
    // Set priority berdasarkan status
    if ($data['status'] === 'Berlangsung') $priority = 'warning';
    
    $stmt = $conn->prepare("INSERT INTO reminders 
        (title, description, reminder_date, reminder_time, related_type, related_id, priority, status, category) 
        VALUES (?, ?, ?, ?, 'kegiatan', ?, ?, 'pending', ?)");
    
    $stmt->bind_param("ssssisss",
        $reminderTitle,
        $reminderDesc,
        $reminderDate,
        $reminderTime,
        $activityId,
        $priority,
        $data['category']
    );
    
    $stmt->execute();
    $stmt->close();
}

// ============================================================
// HELPER: Sync reminder dengan kegiatan yang di-update
// ============================================================
function syncReminderWithActivity($conn, $activityId, $data) {
    // Cek apakah reminder sudah ada
    $stmt = $conn->prepare("SELECT id FROM reminders WHERE related_type = 'kegiatan' AND related_id = ?");
    $stmt->bind_param("i", $activityId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Kalau status "Selesai" → tandai reminder done atau hapus
    if ($data['status'] === 'Selesai' || $data['progress'] >= 100) {
        if ($existing) {
            $stmt = $conn->prepare("UPDATE reminders SET status = 'done' WHERE id = ?");
            $stmt->bind_param("i", $existing['id']);
            $stmt->execute();
            $stmt->close();
        }
        return;
    }

    // Kalau reminder belum ada → buat baru
    if (!$existing) {
        createReminderFromActivity($conn, $activityId, $data);
        return;
    }

    // Kalau sudah ada → update
    $reminderTitle = $data['title'];
    $reminderDesc = $data['description'] ?: ("Kegiatan di " . $data['location']);
    $reminderDate = $data['date'];
    $reminderTime = $data['start_time'];
    $priority = 'info';
    if ($data['status'] === 'Berlangsung') $priority = 'warning';

    $stmt = $conn->prepare("UPDATE reminders SET 
        title = ?, description = ?, reminder_date = ?, reminder_time = ?, 
        priority = ?, category = ?, status = 'pending'
        WHERE id = ?");
    
    $stmt->bind_param("ssssssi",
        $reminderTitle,
        $reminderDesc,
        $reminderDate,
        $reminderTime,
        $priority,
        $data['category'],
        $existing['id']
    );
    
    $stmt->execute();
    $stmt->close();
}