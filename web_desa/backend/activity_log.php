<?php
require "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // Ambil 50 log terbaru
    case 'GET':
        $result = $conn->query("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 50");
        sendJson($result->fetch_all(MYSQLI_ASSOC));
        break;

    // Tambah entri log baru (dipanggil setiap ada aksi penting di frontend)
    case 'POST':
        $d = getJsonInput();

        $stmt = $conn->prepare("INSERT INTO activity_log (actor, action, detail, timestamp) VALUES (?,?,?,NOW())");
        $stmt->bind_param("sss", $d['actor'], $d['action'], $d['detail']);

        if ($stmt->execute()) {
            sendJson(["success" => true, "id" => $stmt->insert_id], 201);
        } else {
            sendJson(["error" => $stmt->error], 400);
        }
        break;

    default:
        sendJson(["error" => "Method tidak didukung"], 405);
}
