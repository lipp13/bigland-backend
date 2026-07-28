require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, User, Employee, Department, Position, Shift,
  Schedule, Attendance, LeaveRequest, Setting
} = require('./models');

async function seedDatabase() {
  try {
    console.log('Synchronizing database structure...');
    await sequelize.sync({ force: true });
    console.log('Database synced successfully.');

    // 1. Seed Departments
    console.log('Seeding Departments...');
    const departments = await Department.bulkCreate([
      { id: 1, name: 'Front Office', code: 'FO', description: 'Layanan resepsionis, penanganan tamu, meja informasi, dan reservasi kamar.' },
      { id: 2, name: 'Housekeeping', code: 'HK', description: 'Kebersihan kamar, area publik, lobi, laundry, dan manajemen linen hotel.' },
      { id: 3, name: 'Food & Beverage', code: 'FNB', description: 'Layanan restoran, dapur (kitchen), katering perjamuan, bar, dan room service.' },
      { id: 4, name: 'Engineering', code: 'ENG', description: 'Pemeliharaan fasilitas hotel, AC/HVAC, listrik, dan sistem perpipaan.' },
      { id: 5, name: 'Security', code: 'SEC', description: 'Keamanan area hotel, pemantauan CCTV, patroli, dan keselamatan tamu.' },
      { id: 6, name: 'Human Resources', code: 'HR', description: 'Manajemen SDM, absensi karyawan, penggajian, pelatihan, dan kesejahteraan.' }
    ]);

    // 2. Seed Positions
    console.log('Seeding Positions...');
    const positions = await Position.bulkCreate([
      { id: 1, name: 'Staf Resepsionis (Front Desk)', department_id: 1, description: 'Melayani proses check-in, check-out, dan informasi tamu hotel.' },
      { id: 2, name: 'Guest Relations Officer', department_id: 1, description: 'Memastikan kenyamanan tamu VIP dan pelayanan personal.' },
      { id: 3, name: 'Executive Housekeeper', department_id: 2, description: 'Mengawasi operasional harian kebersihan dan kesiapan kamar.' },
      { id: 4, name: 'Staf Kebersihan Kamar (Room Attendant)', department_id: 2, description: 'Membersihkan dan merapikan kamar tamu sesuai standar hotel.' },
      { id: 5, name: 'Koki Utama (Executive Chef)', department_id: 3, description: 'Mengelola operasional dapur dan penyajian menu makanan.' },
      { id: 6, name: 'Supervisor F&B', department_id: 3, description: 'Supervisi layanan restoran dan jadwal staf Food & Beverage.' },
      { id: 7, name: 'Teknisi Pemeliharaan', department_id: 4, description: 'Melakukan perawatan berkala dan perbaikan peralatan teknis.' },
      { id: 8, name: 'Supervisor Keamanan', department_id: 5, description: 'Memimpin patroli keamanan dan penanganan situasi darurat.' },
      { id: 9, name: 'Spesialis HRD', department_id: 6, description: 'Mengelola data absensi, persetujuan cuti, dan administrasi karyawan.' },
      { id: 10, name: 'Manajer HRD', department_id: 6, description: 'Memimpin departemen HR dan strategi SDM hotel.' }
    ]);

    // 3. Seed Shifts
    console.log('Seeding Shifts...');
    const shifts = await Shift.bulkCreate([
      { id: 1, name: 'Shift Pagi', code: 'M1', start_time: '07:00:00', end_time: '15:00:00', duration_hours: 8, color: 'emerald' },
      { id: 2, name: 'Shift Siang', code: 'A1', start_time: '15:00:00', end_time: '23:00:00', duration_hours: 8, color: 'blue' },
      { id: 3, name: 'Shift Malam', code: 'N1', start_time: '23:00:00', end_time: '07:00:00', duration_hours: 8, color: 'indigo' },
      { id: 4, name: 'Shift Tengah', code: 'MD', start_time: '10:00:00', end_time: '18:00:00', duration_hours: 8, color: 'purple' }
    ]);

    // 4. Seed Settings
    console.log('Seeding Settings...');
    await Setting.bulkCreate([
      { setting_key: 'companyName', setting_value: 'Bigland Hotel & Convention Sentul' },
      { setting_key: 'address', setting_value: 'Jl. Olympic Raya Sentul No. 8, Babakan Madang, Bogor, Jawa Barat 16810' },
      { setting_key: 'phone', setting_value: '+62 21 8795 4000' },
      { setting_key: 'email', setting_value: 'hrd@biglandsentulhotel.com' },
      { setting_key: 'geofenceEnabled', setting_value: 'true' },
      { setting_key: 'latitude', setting_value: '-6.5583' },
      { setting_key: 'longitude', setting_value: '106.8592' },
      { setting_key: 'radiusMeters', setting_value: '150' },
      { setting_key: 'lateToleranceMinutes', setting_value: '15' },
      { setting_key: 'requirePhotoCheckIn', setting_value: 'false' },
      { setting_key: 'autoApproveSickLeave', setting_value: 'false' }
    ]);

    // 5. Seed Users & Employees
    console.log('Seeding Users & Employees...');
    const defaultPassword = await bcrypt.hash('password123', 10);
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);

    // SuperAdmin User
    const superAdminUser = await User.create({
      name: 'Super Admin Bigland',
      email: 'superadmin@bigland.com',
      password: superAdminPassword,
      role: 'SUPERADMIN'
    });

    await Employee.create({
      employee_id: 'EMP-1000',
      user_id: superAdminUser.id,
      department_id: 6,
      position_id: 10,
      phone: '+62 811-0000-9999',
      address: 'Sentul City, Bogor',
      status: 'Aktif',
      join_date: '2020-01-01',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });

    // HR Admin (Sarah Amalia)
    const hrUser = await User.create({
      name: 'Sarah Amalia',
      email: 'hr.admin@bigland.com',
      password: defaultPassword,
      role: 'ADMIN'
    });

    const emp1 = await Employee.create({
      employee_id: 'EMP-1001',
      user_id: hrUser.id,
      department_id: 6,
      position_id: 9,
      phone: '+62 812-3456-7890',
      address: 'Jl. Sentul City No. 12, Bogor',
      status: 'Aktif',
      join_date: '2021-03-15',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    });

    // Employee 2 (Budi Santoso)
    const budiUser = await User.create({
      name: 'Budi Santoso',
      email: 'budi.santoso@bigland.com',
      password: defaultPassword,
      role: 'EMPLOYEE'
    });

    const emp2 = await Employee.create({
      employee_id: 'EMP-1002',
      user_id: budiUser.id,
      department_id: 1,
      position_id: 1,
      phone: '+62 813-9876-5432',
      address: 'Jl. Raya Babakan Madang No. 45, Sentul',
      status: 'Aktif',
      join_date: '2022-06-01',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });

    // Employee 3 (Dewi Lestari)
    const dewiUser = await User.create({
      name: 'Dewi Lestari',
      email: 'dewi.lestari@bigland.com',
      password: defaultPassword,
      role: 'EMPLOYEE'
    });

    const emp3 = await Employee.create({
      employee_id: 'EMP-1003',
      user_id: dewiUser.id,
      department_id: 2,
      position_id: 4,
      phone: '+62 856-1122-3344',
      address: 'Komp. Bellanova No. 8, Sentul',
      status: 'Aktif',
      join_date: '2022-09-10',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
    });

    // Employee 4 (Rizky Pratama)
    const rizkyUser = await User.create({
      name: 'Rizky Pratama',
      email: 'rizky.p@bigland.com',
      password: defaultPassword,
      role: 'EMPLOYEE'
    });

    const emp4 = await Employee.create({
      employee_id: 'EMP-1004',
      user_id: rizkyUser.id,
      department_id: 3,
      position_id: 6,
      phone: '+62 878-5566-7788',
      address: 'Jl. Pajajaran No. 88, Bogor Timur',
      status: 'Aktif',
      join_date: '2020-11-20',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    });

    // Employee 5 (Agus Wijaya)
    const agusUser = await User.create({
      name: 'Agus Wijaya',
      email: 'agus.w@bigland.com',
      password: defaultPassword,
      role: 'EMPLOYEE'
    });

    const emp5 = await Employee.create({
      employee_id: 'EMP-1005',
      user_id: agusUser.id,
      department_id: 4,
      position_id: 7,
      phone: '+62 819-2233-4455',
      address: 'Desa Cijentu, Sentul',
      status: 'Aktif',
      join_date: '2023-01-15',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    });

    // Employee 6 (Hendra Setiawan)
    const hendraUser = await User.create({
      name: 'Hendra Setiawan',
      email: 'hendra.s@bigland.com',
      password: defaultPassword,
      role: 'EMPLOYEE'
    });

    const emp6 = await Employee.create({
      employee_id: 'EMP-1006',
      user_id: hendraUser.id,
      department_id: 5,
      position_id: 8,
      phone: '+62 811-4455-6677',
      address: 'Cibinong City, Bogor',
      status: 'Aktif',
      join_date: '2019-08-01',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    });

    // 6. Seed Attendance
    console.log('Seeding Attendance Records...');
    const today = new Date().toISOString().split('T')[0];

    await Attendance.bulkCreate([
      { employee_id: emp2.id, date: today, check_in: '06:55:12', check_out: null, status: 'Hadir', location: 'Lobi Utama Bigland Sentul (GPS Verified)', notes: 'Tepat waktu untuk Shift Pagi' },
      { employee_id: emp3.id, date: today, check_in: '07:18:45', check_out: null, status: 'Terlambat', location: 'Meja Housekeeping (GPS Verified)', notes: 'Terlambat karena kemacetan Tol Sentul' },
      { employee_id: emp4.id, date: today, check_in: null, check_out: null, status: 'Izin', location: '-', notes: 'Cuti Tahunan Disetujui' },
      { employee_id: emp5.id, date: today, check_in: '06:48:30', check_out: null, status: 'Hadir', location: 'Bengkel Teknik (GPS Verified)', notes: 'Tepat waktu' },
      { employee_id: emp6.id, date: today, check_in: null, check_out: null, status: 'Sakit', location: '-', notes: 'Izin sakit dengan surat dokter Sentul Hospital' },
      { employee_id: emp2.id, date: '2026-07-26', check_in: '06:58:10', check_out: '15:02:44', status: 'Hadir', location: 'Lobi Utama Bigland Sentul', notes: 'Selesai shift 8 jam kerja' },
      { employee_id: emp2.id, date: '2026-07-25', check_in: '06:52:00', check_out: '15:05:12', status: 'Hadir', location: 'Lobi Utama Bigland Sentul', notes: 'Selesai shift 8 jam kerja' },
      { employee_id: emp2.id, date: '2026-07-24', check_in: '07:22:15', check_out: '15:10:00', status: 'Terlambat', location: 'Lobi Utama Bigland Sentul', notes: 'Terlambat check-in 22 menit' }
    ]);

    // 7. Seed Leave Requests
    console.log('Seeding Leave Requests...');
    await LeaveRequest.bulkCreate([
      { employee_id: emp4.id, type: 'Cuti Tahunan', start_date: '2026-07-27', end_date: '2026-07-29', total_days: 3, reason: 'Liburan keluarga dan urusan pribadi.', proof: 'tiket_penerbangan.pdf', status: 'Disetujui', submitted_at: new Date('2026-07-24T10:15:00'), reviewed_by: 'Sarah Amalia', review_note: 'Disetujui. Pengganti shift diatur oleh Chef Ahmad.' },
      { employee_id: emp6.id, type: 'Izin Sakit', start_date: '2026-07-27', end_date: '2026-07-28', total_days: 2, reason: 'Demam tinggi dan anjuran istirahat dari dokter.', proof: 'surat_dokter_rs_sentul.pdf', status: 'Disetujui', submitted_at: new Date('2026-07-26T18:40:00'), reviewed_by: 'Sarah Amalia', review_note: 'Disetujui. Semoga cepat sembuh.' },
      { employee_id: emp3.id, type: 'Izin Darurat', start_date: '2026-08-02', end_date: '2026-08-03', total_days: 2, reason: 'Acara keluarga mendesak di Bandung.', proof: 'surat_keluarga.jpg', status: 'Menunggu', submitted_at: new Date('2026-07-27T09:30:00'), reviewed_by: null, review_note: null },
      { employee_id: emp5.id, type: 'Cuti Tahunan', start_date: '2026-08-10', end_date: '2026-08-12', total_days: 3, reason: 'Renovasi rumah pribadi.', proof: null, status: 'Menunggu', submitted_at: new Date('2026-07-27T11:00:00'), reviewed_by: null, review_note: null }
    ]);

    // 8. Seed Schedules
    console.log('Seeding Schedules...');
    await Schedule.bulkCreate([
      { employee_id: emp2.id, shift_id: 1, date: '2026-07-27' },
      { employee_id: emp2.id, shift_id: 1, date: '2026-07-28' },
      { employee_id: emp2.id, shift_id: 2, date: '2026-07-29' },
      { employee_id: emp2.id, shift_id: 2, date: '2026-07-30' },
      { employee_id: emp2.id, shift_id: 3, date: '2026-07-31' },
      { employee_id: emp3.id, shift_id: 1, date: '2026-07-27' },
      { employee_id: emp3.id, shift_id: 1, date: '2026-07-28' },
      { employee_id: emp4.id, shift_id: 4, date: '2026-07-27' },
      { employee_id: emp5.id, shift_id: 1, date: '2026-07-27' },
      { employee_id: emp6.id, shift_id: 3, date: '2026-07-27' }
    ]);

    console.log('================================================');
    console.log('DATABASE SEEDING SUCCESSFUL!');
    console.log('================================================');
    console.log('SuperAdmin Credentials:');
    console.log('  Email: superadmin@bigland.com');
    console.log('  Password: superadmin123');
    console.log('HR Admin Credentials:');
    console.log('  Email: hr.admin@bigland.com');
    console.log('  Password: password123');
    console.log('Employee Credentials:');
    console.log('  Email: budi.santoso@bigland.com');
    console.log('  Password: password123');
    console.log('================================================');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
