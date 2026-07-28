# 🖥️ Bigland HRIS - Backend API Service

Service backend berbasis Node.js & Express.js yang melayani seluruh API endpoint RESTful, otentikasi JWT, engine ekspor laporan PDF/Excel, serta manajemen basis data MySQL untuk Sistem Absensi Karyawan Bigland Hotel & Convention Sentul.

---

## 🛠️ Teknologi & Dependensi (Tech Stack)

* **Runtime**: Node.js v18+
* **Framework**: Express.js
* **Database & ORM**: MySQL2 & Sequelize ORM (Auto-synchronization & Seeding)
* **Otentikasi & Keamanan**: JSON Web Token (JWT), Bcrypt Password Hashing, CORS
* **Engine Laporan**: PDFKit (Desain Kop Surat Resmi Hotel) & ExcelJS (Format Grid Workbook)
* **Penjadwalan**: Nodemon (Hot-reloading Development)

---

## 📁 Struktur Direktori Backend

```
BE/
├── middleware/
│   └── auth.js             # Middleware verifikasi token JWT & Role Guard
├── models/
│   └── index.js            # Definisi model Sequelize (User, Employee, Attendance, Leave, etc.)
├── routes/
│   └── api.js              # Routing RESTful API lengkap
├── services/
│   └── exportService.js    # Generator PDF & Excel Spreadsheet presisi pixel-perfect
├── index.js                # Server Entry Point & Konfigurasi Express
├── schema.sql              # Skema tabel MySQL mentah
├── seed.js                 # Script populasi data awal otomatis
├── package.json            # Manifest dependensi & script runner
└── .env                    # Variabel lingkungan (Port, DB Credentials, JWT Secret)
```

---

## 🚀 Cara Menjalankan Backend Service

### 1. Instalasi Dependensi
```bash
cd BE
npm install
```

### 2. Pengaturan Variabel Lingkungan (`.env`)
Pastikan file `.env` terkonfigurasi sesuai koneksi MySQL local kamu:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=bigland_hris
JWT_SECRET=bigland_hris_secret_key_2026
```

### 3. Eksekusi Database & Seeding Data Awal
```bash
# Membuat basis data & mengisi akun default (SuperAdmin, HRD Admin, Karyawan)
npm run seed
```

### 4. Jalankan Development Server
```bash
npm run dev
# Server akan berjalan di http://localhost:5000
```

---

## 🔑 Endpoint API Utama

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| `POST` | `/api/auth/login` | Otentikasi login & generate JWT token | Public |
| `GET` | `/api/auth/me` | Ambil data profil user terhubung | Auth |
| `GET` | `/api/employees` | Ambil daftar seluruh karyawan | HRD / SuperAdmin |
| `POST` | `/api/attendance/check-in` | Absen masuk karyawan (GPS Geofence) | Karyawan |
| `POST` | `/api/attendance/check-out` | Absen pulang karyawan | Karyawan |
| `POST` | `/api/attendance/scan-qr` | Presensi via Kiosk QR Code / Screenshot Image | All Roles |
| `GET` | `/api/export/attendance/pdf` | Unduh Laporan Rekap Presensi (.pdf) | HRD / SuperAdmin |
| `GET` | `/api/export/attendance/excel` | Unduh Spreadsheet Rekap Presensi (.xlsx) | HRD / SuperAdmin |
| `POST` | `/api/announcements` | Siarkan pengumuman resmi HRD | HRD / SuperAdmin |
| `GET` | `/api/system/backup` | Ekspor cadangan basis data (.json) | SuperAdmin |

---
*Dikembangkan untuk Proyek PKL Sistem Informasi HRIS Bigland Hotel & Convention Sentul.*
