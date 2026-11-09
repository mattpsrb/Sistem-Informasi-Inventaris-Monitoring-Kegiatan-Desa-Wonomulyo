<?php
require "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $result = $conn->query("SELECT * FROM village_profile ORDER BY id ASC LIMIT 1");
        $profile = $result ? $result->fetch_assoc() : null;
        sendJson($profile ?: []);
        break;

    case 'PUT':
        $d = getJsonInput();

        $name      = trim($d['name']       ?? '');
        $kecamatan = trim($d['kecamatan']  ?? '');
        $kabupaten = trim($d['kabupaten']  ?? '');
        $provinsi  = trim($d['provinsi']   ?? '');
        $address   = trim($d['address']    ?? '');
        $postal    = trim($d['postal_code']?? '');
        $phone     = trim($d['phone']      ?? '');
        $email     = trim($d['email']      ?? '');

        if ($name === '' || $kecamatan === '' || $kabupaten === '' || $provinsi === '') {
            sendJson(["error" => "Nama Desa, Kecamatan, Kabupaten, dan Provinsi wajib diisi."], 400);
        }

        $existing = $conn->query("SELECT id FROM village_profile ORDER BY id ASC LIMIT 1")->fetch_assoc();

        if ($existing) {
            $stmt = $conn->prepare("UPDATE village_profile SET
                name=?, kecamatan=?, kabupaten=?, provinsi=?, address=?, postal_code=?, phone=?, email=?
                WHERE id=?");
            $stmt->bind_param("ssssssssi",
                $name, $kecamatan, $kabupaten, $provinsi,
                $address, $postal, $phone, $email, $existing['id']);
        } else {
            $stmt = $conn->prepare("INSERT INTO village_profile
                (name, kecamatan, kabupaten, provinsi, address, postal_code, phone, email)
                VALUES (?,?,?,?,?,?,?,?)");
            $stmt->bind_param("ssssssss",
                $name, $kecamatan, $kabupaten, $provinsi,
                $address, $postal, $phone, $email);
        }

        if ($stmt->execute()) {
            sendJson(["success" => true]);
        } else {
            sendJson(["error" => $stmt->error], 400);
        }
        break;

    default:
        sendJson(["error" => "Method tidak didukung"], 405);
}