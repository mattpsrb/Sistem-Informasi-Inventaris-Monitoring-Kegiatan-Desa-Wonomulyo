-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 23, 2026 at 03:34 AM
-- Server version: 8.0.30
-- PHP Version: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `inventaris_desa`
--

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

CREATE TABLE `activities` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('kegiatan','rapat','pelayanan','lapangan','deadline') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pic` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participants` int UNSIGNED NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('Direncanakan','Berlangsung','Selesai') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Direncanakan',
  `progress` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `reminder` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `documentation` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `result` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activities`
--

INSERT INTO `activities` (`id`, `title`, `category`, `activity_date`, `start_time`, `end_time`, `location`, `pic`, `participants`, `description`, `status`, `progress`, `reminder`, `documentation`, `notes`, `result`, `created_at`, `updated_at`) VALUES
(14, 'rapat ', 'kegiatan', '2026-10-09', '09:00:00', '11:30:00', 'Balai Desa', 'Kasi Pemerintahan', 0, 'rapat membahas agenda mendadak', 'Direncanakan', 0, '1 hari sebelum', 0, '', '', '2026-09-17 06:52:54', '2026-09-17 08:04:50'),
(15, 'bersih bersih', 'kegiatan', '2026-09-18', '09:00:00', '11:00:00', 'Balai Desa', 'Sekretaris Desa', 0, '', 'Berlangsung', 5, '1 hari sebelum', 0, '', '', '2026-09-17 07:05:09', '2026-09-17 09:40:33');

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` bigint UNSIGNED NOT NULL,
  `actor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_log`
--

INSERT INTO `activity_log` (`id`, `actor`, `action`, `detail`, `timestamp`) VALUES
(1, 'System', 'menambahkan kegiatan', 'bersih bersih', '2026-09-17 14:05:09'),
(2, 'System', 'menghapus pengguna', 'matta (@m)', '2026-09-17 14:05:52'),
(3, 'System', 'menambahkan inventaris', 'meja', '2026-09-17 14:06:28'),
(4, 'System', 'menghapus inventaris', 'meja', '2026-09-17 14:06:31'),
(5, 'System', 'mengubah kegiatan', 'rapat ', '2026-09-17 14:06:57'),
(6, 'System', 'mengubah kegiatan', 'rapat ', '2026-09-17 14:24:39'),
(7, 'System', 'mengubah kegiatan', 'bersih bersih', '2026-09-17 14:24:41'),
(8, 'System', 'mengubah kegiatan', 'bersih bersih', '2026-09-17 14:24:41'),
(9, 'System', 'mengubah kegiatan', 'rapat ', '2026-09-17 15:04:50'),
(10, 'System', 'mengubah status pengguna', 'dm_ (@dm) → Nonaktif', '2026-09-17 15:08:22'),
(11, 'System', 'mengubah status pengguna', 'dm_ (@dm) → Aktif', '2026-09-17 15:08:23'),
(12, 'System', 'mengubah kegiatan', 'bersih bersih', '2026-09-17 16:37:25'),
(13, 'System', 'mengubah kegiatan', 'bersih bersih', '2026-09-17 16:40:33');

-- --------------------------------------------------------

--
-- Table structure for table `backup_history`
--

CREATE TABLE `backup_history` (
  `id` bigint UNSIGNED NOT NULL,
  `backup_date` date NOT NULL,
  `size` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('Otomatis','Manual') COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spec` text COLLATE utf8mb4_unicode_ci,
  `qty` int UNSIGNED NOT NULL DEFAULT '1',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year_acquired` year NOT NULL,
  `fund_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pic` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition` enum('Baik','Rusak Ringan','Rusak Berat') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Baik',
  `asset_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_inspection` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`id`, `code`, `name`, `category`, `brand`, `spec`, `qty`, `unit`, `year_acquired`, `fund_source`, `price`, `location`, `pic`, `condition`, `asset_number`, `last_inspection`, `notes`, `created_at`, `updated_at`) VALUES
(2, 'INV-2026-001', 'TWS', 'Elektronik', 'Lokal', '', 1, 'buah', 2026, 'Dana Desa', '0.00', 'Ruang Rapat', 'Sekretaris Desa', 'Baik', 'AS.2026.001', '2026-09-10', '', '2026-09-09 17:50:50', '2026-09-09 17:50:50'),
(3, 'INV-2026-002', 'kursi ', 'Peralatan Kantor', 'Lokal', '', 25, 'buah', 2026, 'Dana Desa', '0.00', 'Balai Desa', 'Kaur Keuangan', 'Baik', 'AS.2026.002', '2026-09-17', 'keluaran tahun 2024 dibeli dengan dana desa', '2026-09-17 06:51:56', '2026-09-17 06:51:56');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_inspection_history`
--

CREATE TABLE `inventory_inspection_history` (
  `id` bigint UNSIGNED NOT NULL,
  `inventory_id` bigint UNSIGNED NOT NULL,
  `inspection_date` date NOT NULL,
  `condition` enum('Baik','Rusak Ringan','Rusak Berat') COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `checked_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `reminder_date` date NOT NULL,
  `reminder_time` time DEFAULT NULL,
  `related_type` enum('laporan','inventaris','kegiatan') COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_id` bigint UNSIGNED DEFAULT NULL,
  `priority` enum('info','warning','danger') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `status` enum('pending','done') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reminders`
--

INSERT INTO `reminders` (`id`, `title`, `description`, `reminder_date`, `reminder_time`, `related_type`, `related_id`, `priority`, `status`, `category`) VALUES
(7, 'rapat ', 'rapat membahas agenda mendadak', '2026-10-09', '09:00:00', 'kegiatan', 14, 'info', 'pending', 'kegiatan'),
(8, 'bersih bersih', 'Kegiatan di Balai Desa', '2026-09-18', '09:00:00', 'kegiatan', 15, 'warning', 'pending', 'kegiatan');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` bigint UNSIGNED NOT NULL,
  `first_day_of_week` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_format` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time_format` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timezone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reminder_kegiatan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reminder_inspeksi` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reminder_laporan` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_reset_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_reset_at` datetime DEFAULT NULL,
  `role` enum('ADMIN','PERANGKAT_DESA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PERANGKAT_DESA',
  `status` enum('Aktif','Nonaktif') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aktif',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama`, `username`, `email`, `reset_token`, `reset_token_expiry`, `password`, `last_reset_password`, `last_reset_at`, `role`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(2, 'dela', 'd', NULL, NULL, NULL, '$2y$12$OMskCfuF6PnsdrB6LVIuR.1Bac1XR61Xmg6loUfyGLi7uYzRyaaSy', NULL, NULL, 'ADMIN', 'Nonaktif', '2026-09-09 22:35:38', '2026-09-09 15:35:24', '2026-09-10 15:35:24'),
(3, 'admin1', 'admin', NULL, NULL, NULL, '$2y$12$ADzNteHmL5b1Ba28CN6lg.V14qau9E9Vl9pL1eu3BA9/kk8LoQlrW', NULL, NULL, 'ADMIN', 'Aktif', '2026-09-17 14:23:53', '2026-09-09 15:37:20', '2026-09-17 07:23:53'),
(5, 'matta', 'm1', 'mattapasaribu@gmail.com', 'fdba73929d9fe2c5814f9556da7c69fcb4a3ad169dba290630e184fca7723216', '2026-09-10 01:36:39', '$2y$12$rmiPgEjoeZQuxk45/wZW..xkJCurAWBg7FQSYL3XwjwtUgvZjgCWm', 'zOrvGq#9xk', '2026-09-17 13:15:31', 'PERANGKAT_DESA', 'Aktif', NULL, '2026-09-09 17:36:10', '2026-09-17 06:15:31'),
(6, 'dm_', 'dm', NULL, NULL, NULL, '$2y$12$p.l.rcV8vhD4NK.a8S5Xku0S6l7710w4c5BZtZassS1GzjFAQS2FS', 'YjU4ijo7D5', '2026-09-17 13:49:24', 'PERANGKAT_DESA', 'Aktif', '2026-09-17 13:50:16', '2026-09-17 06:48:27', '2026-09-17 08:08:23');

-- --------------------------------------------------------

--
-- Table structure for table `village_profile`
--

CREATE TABLE `village_profile` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kecamatan` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kabupaten` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provinsi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postal_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `village_profile`
--

INSERT INTO `village_profile` (`id`, `name`, `kecamatan`, `kabupaten`, `provinsi`, `address`, `postal_code`, `phone`, `email`) VALUES
(1, 'Wonomulyo', 'Poncokusumo', 'Malang', 'Jawa Timur', 'Jalan raya wonomulyo', '65157', '08123456789', 'desa@contoh.go.id');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `backup_history`
--
ALTER TABLE `backup_history`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_inspection_history`
--
ALTER TABLE `inventory_inspection_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_inspection_inventory` (`inventory_id`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_username` (`username`),
  ADD UNIQUE KEY `idx_email` (`email`);

--
-- Indexes for table `village_profile`
--
ALTER TABLE `village_profile`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activities`
--
ALTER TABLE `activities`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `backup_history`
--
ALTER TABLE `backup_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `inventory_inspection_history`
--
ALTER TABLE `inventory_inspection_history`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `village_profile`
--
ALTER TABLE `village_profile`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory_inspection_history`
--
ALTER TABLE `inventory_inspection_history`
  ADD CONSTRAINT `fk_inspection_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
