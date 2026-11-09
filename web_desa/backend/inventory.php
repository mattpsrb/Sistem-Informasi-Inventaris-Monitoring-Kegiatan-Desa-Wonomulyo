<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ============================================================
    // GET: Ambil data inventaris
    // ============================================================
    case 'GET':
        try {
            if (isset($_GET['id'])) {
                $id = (int)$_GET['id'];
                $stmt = $conn->prepare("SELECT * FROM inventory WHERE id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $item = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$item) sendJson(["error" => "Data tidak ditemukan"], 404);
                sendJson($item);
            } else {
                $result = $conn->query("SELECT * FROM inventory ORDER BY id DESC");
                if (!$result) {
                    sendJson(["error" => "Query error: " . $conn->error], 500);
                }
                sendJson($result->fetch_all(MYSQLI_ASSOC));
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    // ============================================================
    // POST: Tambah inventaris baru
    // ============================================================
    case 'POST':
        try {
            $d = getJsonInput();
            
            if (empty($d['name'])) {
                sendJson(["error" => "Nama barang wajib diisi"], 400);
            }

            $count = $conn->query("SELECT COUNT(*) as total FROM inventory")->fetch_assoc()['total'] + 1;
            
            // SIMPAN KE VARIABLE DULU
            $code = $d['code'] ?? 'INV-' . date('Y') . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
            $name = $d['name'];
            $category = $d['category'] ?? 'Elektronik';
            $brand = $d['brand'] ?? 'Lokal';
            $spec = $d['spec'] ?? '';
            $qty = (int)($d['qty'] ?? 1);
            $unit = $d['unit'] ?? 'buah';
            $year_acquired = (int)($d['year_acquired'] ?? date('Y'));
            $fund_source = $d['fund_source'] ?? 'Dana Desa';
            $price = (float)($d['price'] ?? 0);
            $location = $d['location'] ?? 'Balai Desa';
            $pic = $d['pic'] ?? 'Sekretaris Desa';
            $condition = $d['condition'] ?? 'Baik';
            $asset_number = $d['asset_number'] ?? 'AS.' . date('Y') . '.' . str_pad($count, 3, '0', STR_PAD_LEFT);
            $last_inspection = $d['last_inspection'] ?? date('Y-m-d');
            $notes = $d['notes'] ?? '';

            $stmt = $conn->prepare("INSERT INTO inventory
                (code, name, category, brand, spec, qty, unit, year_acquired, fund_source, price, location, pic, `condition`, asset_number, last_inspection, notes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

            if (!$stmt) {
                sendJson(["error" => "Prepare failed: " . $conn->error], 500);
            }

            $stmt->bind_param(
                "sssssisssdssssss",
                $code, $name, $category, $brand, $spec,
                $qty, $unit, $year_acquired, $fund_source, $price,
                $location, $pic, $condition, $asset_number,
                $last_inspection, $notes
            );

            if ($stmt->execute()) {
                $newId = $stmt->insert_id;
                $stmt->close();
                
                // ✅ CATAT LOG AKTIVITAS
                logActivity(
                    $conn,
                    getActorName(),
                    "menambahkan inventaris",
                    $name
                );
                
                sendJson(["success" => true, "id" => $newId], 201);
            } else {
                sendJson(["error" => $stmt->error], 400);
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    // ============================================================
    // PUT: Update inventaris
    // ============================================================
    case 'PUT':
        try {
            $d = getJsonInput();
            if (!isset($d['id'])) sendJson(["error" => "id wajib diisi"], 400);

            // SIMPAN KE VARIABLE DULU
            $id = (int)$d['id'];
            $code = $d['code'] ?? 'INV-' . date('Y') . '-' . str_pad($id, 3, '0', STR_PAD_LEFT);
            $name = $d['name'] ?? '';
            $category = $d['category'] ?? 'Elektronik';
            $brand = $d['brand'] ?? 'Lokal';
            $spec = $d['spec'] ?? '';
            $qty = (int)($d['qty'] ?? 1);
            $unit = $d['unit'] ?? 'buah';
            $year_acquired = (int)($d['year_acquired'] ?? date('Y'));
            $fund_source = $d['fund_source'] ?? 'Dana Desa';
            $price = (float)($d['price'] ?? 0);
            $location = $d['location'] ?? 'Balai Desa';
            $pic = $d['pic'] ?? 'Sekretaris Desa';
            $condition = $d['condition'] ?? 'Baik';
            $asset_number = $d['asset_number'] ?? 'AS.' . date('Y') . '.' . str_pad($id, 3, '0', STR_PAD_LEFT);
            $last_inspection = $d['last_inspection'] ?? date('Y-m-d');
            $notes = $d['notes'] ?? '';

            $stmt = $conn->prepare("UPDATE inventory SET
                code=?, name=?, category=?, brand=?, spec=?, qty=?, unit=?, year_acquired=?,
                fund_source=?, price=?, location=?, pic=?, `condition`=?, asset_number=?,
                last_inspection=?, notes=?
                WHERE id=?");

            if (!$stmt) {
                sendJson(["error" => "Prepare failed: " . $conn->error], 500);
            }

            $stmt->bind_param(
                "sssssisssdssssssi",
                $code, $name, $category, $brand, $spec,
                $qty, $unit, $year_acquired, $fund_source, $price,
                $location, $pic, $condition, $asset_number,
                $last_inspection, $notes, $id
            );

            if ($stmt->execute()) {
                $stmt->close();
                
                // ✅ CATAT LOG AKTIVITAS
                logActivity(
                    $conn,
                    getActorName(),
                    "mengubah inventaris",
                    $name
                );
                
                sendJson(["success" => true]);
            } else {
                sendJson(["error" => $stmt->error], 400);
            }
        } catch (Exception $e) {
            sendJson(["error" => "Terjadi kesalahan: " . $e->getMessage()], 500);
        }
        break;

    // ============================================================
    // DELETE: Hapus inventaris
    // ============================================================
    case 'DELETE':
        try {
            if (!isset($_GET['id'])) sendJson(["error" => "id wajib diisi"], 400);
            $id = (int)$_GET['id'];

            // ✅ Ambil nama dulu sebelum dihapus (untuk log)
            $stmtNama = $conn->prepare("SELECT name FROM inventory WHERE id = ?");
            $stmtNama->bind_param("i", $id);
            $stmtNama->execute();
            $itemData = $stmtNama->get_result()->fetch_assoc();
            $stmtNama->close();
            $itemName = $itemData['name'] ?? "ID $id";

            $stmt = $conn->prepare("DELETE FROM inventory WHERE id = ?");
            $stmt->bind_param("i", $id);

            if ($stmt->execute()) {
                $affected = $stmt->affected_rows;
                $stmt->close();
                
                if ($affected > 0) {
                    // ✅ CATAT LOG AKTIVITAS
                    logActivity(
                        $conn,
                        getActorName(),
                        "menghapus inventaris",
                        $itemName
                    );
                    
                    sendJson(["success" => true, "deleted_id" => $id]);
                } else {
                    sendJson(["error" => "Data dengan ID $id tidak ditemukan"], 404);
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