-- =====================================================
-- Bigland Hotel Sentul - HRIS Database Schema
-- MySQL Workbench Compatible
-- =====================================================

CREATE DATABASE IF NOT EXISTS bigland_hris
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bigland_hris;

-- =====================================================
-- 1. USERS TABLE (Authentication & Role Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('SUPERADMIN', 'ADMIN', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 2. DEPARTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 3. POSITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 4. EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  department_id INT,
  position_id INT,
  phone VARCHAR(30),
  address TEXT,
  status VARCHAR(20) DEFAULT 'Aktif',
  join_date DATE,
  avatar VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 5. SHIFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours DECIMAL(4,1) DEFAULT 8,
  color VARCHAR(30) DEFAULT 'emerald',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 6. SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  shift_id INT NOT NULL,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 7. ATTENDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa') DEFAULT 'Hadir',
  location VARCHAR(500),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (employee_id, date)
) ENGINE=InnoDB;

-- =====================================================
-- 8. LEAVE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT DEFAULT 1,
  reason TEXT NOT NULL,
  proof VARCHAR(255),
  status ENUM('Menunggu', 'Disetujui', 'Ditolak') DEFAULT 'Menunggu',
  reviewed_by VARCHAR(255),
  review_note TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 9. SETTINGS TABLE (Key-Value Store)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Note: All passwords are bcrypt hashed from 'password123' 
-- except superadmin which is hashed from 'superadmin123'
-- Hash generated with bcryptjs rounds=10

-- USERS (password123 = $2a$10$8KzQ1QF0qVJmKxJ4V3v3UeQGQe8f5Yb0u1z9Vy5B3iXz2bXkLJZ6e)
-- For seeding, we use the seed.js script which hashes properly

-- DEPARTMENTS
INSERT INTO departments (id, name, code, description) VALUES
(1, 'Front Office', 'FO', 'Layanan resepsionis, penanganan tamu, meja informasi, dan reservasi kamar.'),
(2, 'Housekeeping', 'HK', 'Kebersihan kamar, area publik, lobi, laundry, dan manajemen linen hotel.'),
(3, 'Food & Beverage', 'FNB', 'Layanan restoran, dapur (kitchen), katering perjamuan, bar, dan room service.'),
(4, 'Engineering', 'ENG', 'Pemeliharaan fasilitas hotel, AC/HVAC, listrik, dan sistem perpipaan.'),
(5, 'Security', 'SEC', 'Keamanan area hotel, pemantauan CCTV, patroli, dan keselamatan tamu.'),
(6, 'Human Resources', 'HR', 'Manajemen SDM, absensi karyawan, penggajian, pelatihan, dan kesejahteraan.');

-- POSITIONS
INSERT INTO positions (id, name, department_id, description) VALUES
(1, 'Staf Resepsionis (Front Desk)', 1, 'Melayani proses check-in, check-out, dan informasi tamu hotel.'),
(2, 'Guest Relations Officer', 1, 'Memastikan kenyamanan tamu VIP dan pelayanan personal.'),
(3, 'Executive Housekeeper', 2, 'Mengawasi operasional harian kebersihan dan kesiapan kamar.'),
(4, 'Staf Kebersihan Kamar (Room Attendant)', 2, 'Membersihkan dan merapikan kamar tamu sesuai standar hotel.'),
(5, 'Koki Utama (Executive Chef)', 3, 'Mengelola operasional dapur dan penyajian menu makanan.'),
(6, 'Supervisor F&B', 3, 'Supervisi layanan restoran dan jadwal staf Food & Beverage.'),
(7, 'Teknisi Pemeliharaan', 4, 'Melakukan perawatan berkala dan perbaikan peralatan teknis.'),
(8, 'Supervisor Keamanan', 5, 'Memimpin patroli keamanan dan penanganan situasi darurat.'),
(9, 'Spesialis HRD', 6, 'Mengelola data absensi, persetujuan cuti, dan administrasi karyawan.'),
(10, 'Manajer HRD', 6, 'Memimpin departemen HR dan strategi SDM hotel.');

-- SHIFTS
INSERT INTO shifts (id, name, code, start_time, end_time, duration_hours, color) VALUES
(1, 'Shift Pagi', 'M1', '07:00:00', '15:00:00', 8, 'emerald'),
(2, 'Shift Siang', 'A1', '15:00:00', '23:00:00', 8, 'blue'),
(3, 'Shift Malam', 'N1', '23:00:00', '07:00:00', 8, 'indigo'),
(4, 'Shift Tengah', 'MD', '10:00:00', '18:00:00', 8, 'purple');

-- SETTINGS
INSERT INTO settings (setting_key, setting_value) VALUES
('companyName', 'Bigland Hotel & Convention Sentul'),
('address', 'Jl. Olympic Raya Sentul No. 8, Babakan Madang, Bogor, Jawa Barat 16810'),
('phone', '+62 21 8795 4000'),
('email', 'hrd@biglandsentulhotel.com'),
('geofenceEnabled', 'true'),
('latitude', '-6.5583'),
('longitude', '106.8592'),
('radiusMeters', '150'),
('lateToleranceMinutes', '15'),
('requirePhotoCheckIn', 'false'),
('autoApproveSickLeave', 'false');
