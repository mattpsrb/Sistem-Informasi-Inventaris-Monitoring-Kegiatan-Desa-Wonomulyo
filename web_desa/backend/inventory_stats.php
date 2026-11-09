<?php
// backend/inventory_stats.php
require "config.php";

$monthsBack = isset($_GET['months_back']) ? max(1, intval($_GET['months_back'])) : 6;

$BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni",
             "Juli","Agustus","September","Oktober","November","Desember"];

$stats = [];

for ($i = $monthsBack - 1; $i >= 0; $i--) {
    $date = new DateTime();
    $date->modify("-$i months");
    $yearMonth = $date->format('Y-m');
    $label = $BULAN_ID[(int)$date->format('n') - 1] . ' ' . $date->format('Y');

    $sql = "SELECT 
        SUM(CASE WHEN `condition`='Baik' THEN 1 ELSE 0 END) as baik,
        SUM(CASE WHEN `condition`='Rusak Ringan' THEN 1 ELSE 0 END) as rusak_ringan,
        SUM(CASE WHEN `condition`='Rusak Berat' THEN 1 ELSE 0 END) as rusak_berat,
        COUNT(*) as total
        FROM inventory 
        WHERE DATE_FORMAT(last_inspection, '%Y-%m') = ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendJson(["success" => false, "error" => "Prepare gagal: " . $conn->error], 500);
    }

    $stmt->bind_param("s", $yearMonth);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $total  = intval($row['total'] ?? 0);
    $baik   = intval($row['baik'] ?? 0);
    $ringan = intval($row['rusak_ringan'] ?? 0);
    $berat  = intval($row['rusak_berat'] ?? 0);

    $stats[] = [
        "label"        => $label,
        "bulan"        => $yearMonth,
        "baik"         => $baik,
        "rusak_ringan" => $ringan,
        "rusak_berat"  => $berat,
        "total"        => $total,
        "persen_baik"  => $total > 0 ? round(($baik / $total) * 100, 1) : 0,
        "persen_ringan"=> $total > 0 ? round(($ringan / $total) * 100, 1) : 0,
        "persen_berat" => $total > 0 ? round(($berat / $total) * 100, 1) : 0,
    ];
}

sendJson(["success" => true, "data" => $stats]);

$conn->close();