const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User, Employee, Department, Position, Shift,
  Schedule, Attendance, LeaveRequest, Setting, Announcement, sequelize
} = require('../models');
const { authenticate, requireAdmin, requireSuperAdmin, JWT_SECRET } = require('../middleware/auth');
const { generateAttendancePDF, generateAttendanceExcel } = require('../services/exportService');

// =========================================================
// AUTH ROUTES
// =========================================================

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }
  try {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ message: 'Akun tidak ditemukan. Periksa email Anda.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password salah. Silakan coba lagi.' });
    }

    // Get employee data if exists
    const employee = await Employee.findOne({
      where: { user_id: user.id },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ]
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employeeId: employee?.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employee_id,
          departmentId: employee.department_id,
          departmentName: employee.department?.name,
          positionId: employee.position_id,
          positionName: employee.position?.name,
          phone: employee.phone,
          address: employee.address,
          status: employee.status,
          joinDate: employee.join_date,
          avatar: employee.avatar
        } : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

    const employee = await Employee.findOne({
      where: { user_id: user.id },
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ]
    });

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee: employee ? {
        id: employee.id,
        employeeId: employee.employee_id,
        departmentId: employee.department_id,
        departmentName: employee.department?.name,
        positionId: employee.position_id,
        positionName: employee.position?.name,
        phone: employee.phone,
        address: employee.address,
        status: employee.status,
        joinDate: employee.join_date,
        avatar: employee.avatar
      } : null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Terjadi kesalahan server.', error: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/auth/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Password lama tidak sesuai.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ success: true, message: 'Password berhasil diubah.' });
  } catch (err) {
    return res.status(500).json({ message: 'Terjadi kesalahan server.', error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/auth/profile', authenticate, async (req, res) => {
  const { name, phone, address, avatar } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

    if (name) user.name = name;
    await user.save();

    const employee = await Employee.findOne({ where: { user_id: user.id } });
    if (employee) {
      if (phone !== undefined) employee.phone = phone;
      if (address !== undefined) employee.address = address;
      if (avatar !== undefined) employee.avatar = avatar;
      await employee.save();
    }

    return res.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: employee?.avatar || null,
        employee: employee ? {
          id: employee.id,
          phone: employee.phone,
          address: employee.address,
          avatar: employee.avatar
        } : null
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui profil.', error: err.message });
  }
});

// =========================================================
// EMPLOYEES CRUD
// =========================================================

// GET /api/employees
router.get('/employees', authenticate, async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ],
      order: [['id', 'ASC']]
    });

    const result = employees.map(emp => ({
      id: emp.id,
      employeeId: emp.employee_id,
      userId: emp.user_id,
      name: emp.user?.name || '',
      email: emp.user?.email || '',
      role: emp.user?.role || 'EMPLOYEE',
      departmentId: emp.department_id,
      departmentName: emp.department?.name || '',
      positionId: emp.position_id,
      positionName: emp.position?.name || '',
      phone: emp.phone,
      address: emp.address,
      status: emp.status,
      joinDate: emp.join_date,
      avatar: emp.avatar
    }));

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat data karyawan.', error: err.message });
  }
});

// GET /api/employees/:id
router.get('/employees/:id', authenticate, async (req, res) => {
  try {
    const emp = await Employee.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ]
    });
    if (!emp) return res.status(404).json({ message: 'Karyawan tidak ditemukan.' });

    return res.json({
      id: emp.id,
      employeeId: emp.employee_id,
      userId: emp.user_id,
      name: emp.user?.name || '',
      email: emp.user?.email || '',
      role: emp.user?.role || 'EMPLOYEE',
      departmentId: emp.department_id,
      departmentName: emp.department?.name || '',
      positionId: emp.position_id,
      positionName: emp.position?.name || '',
      phone: emp.phone,
      address: emp.address,
      status: emp.status,
      joinDate: emp.join_date,
      avatar: emp.avatar
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat data karyawan.', error: err.message });
  }
});

// POST /api/employees
router.post('/employees', authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, role, departmentId, positionId, phone, address, avatar } = req.body;
  const t = await sequelize.transaction();
  try {
    // Create user account
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const user = await User.create({
      name, email: email.toLowerCase(), password: hashedPassword, role: role || 'EMPLOYEE'
    }, { transaction: t });

    // Generate employee ID
    const count = await Employee.count({ transaction: t });
    const employeeCode = `EMP-${1001 + count}`;

    const emp = await Employee.create({
      employee_id: employeeCode,
      user_id: user.id,
      department_id: departmentId || null,
      position_id: positionId || null,
      phone: phone || '',
      address: address || '',
      status: 'Aktif',
      join_date: new Date().toISOString().split('T')[0],
      avatar: avatar || null
    }, { transaction: t });

    await t.commit();

    // Fetch with relations
    const created = await Employee.findByPk(emp.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Karyawan berhasil ditambahkan.',
      employee: {
        id: created.id,
        employeeId: created.employee_id,
        name: created.user?.name || '',
        email: created.user?.email || '',
        role: created.user?.role || 'EMPLOYEE',
        departmentId: created.department_id,
        departmentName: created.department?.name || '',
        positionId: created.position_id,
        positionName: created.position?.name || '',
        phone: created.phone,
        address: created.address,
        status: created.status,
        joinDate: created.join_date,
        avatar: created.avatar
      }
    });
  } catch (err) {
    await t.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email sudah terdaftar di sistem.' });
    }
    return res.status(500).json({ message: 'Gagal menambah karyawan.', error: err.message });
  }
});

// PUT /api/employees/:id
router.put('/employees/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, email, role, departmentId, positionId, phone, address, status, avatar } = req.body;
  const t = await sequelize.transaction();
  try {
    const emp = await Employee.findByPk(req.params.id, { transaction: t });
    if (!emp) { await t.rollback(); return res.status(404).json({ message: 'Karyawan tidak ditemukan.' }); }

    // Update user data
    const user = await User.findByPk(emp.user_id, { transaction: t });
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();
      if (role) user.role = role;
      await user.save({ transaction: t });
    }

    // Update employee data
    if (departmentId !== undefined) emp.department_id = departmentId;
    if (positionId !== undefined) emp.position_id = positionId;
    if (phone !== undefined) emp.phone = phone;
    if (address !== undefined) emp.address = address;
    if (status !== undefined) emp.status = status;
    if (avatar !== undefined) emp.avatar = avatar;
    await emp.save({ transaction: t });

    await t.commit();

    const updated = await Employee.findByPk(emp.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Position, as: 'position', attributes: ['id', 'name'] }
      ]
    });

    return res.json({
      success: true,
      message: 'Data karyawan berhasil diperbarui.',
      employee: {
        id: updated.id,
        employeeId: updated.employee_id,
        name: updated.user?.name || '',
        email: updated.user?.email || '',
        role: updated.user?.role || 'EMPLOYEE',
        departmentId: updated.department_id,
        departmentName: updated.department?.name || '',
        positionId: updated.position_id,
        positionName: updated.position?.name || '',
        phone: updated.phone,
        address: updated.address,
        status: updated.status,
        joinDate: updated.join_date,
        avatar: updated.avatar
      }
    });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'Gagal memperbarui karyawan.', error: err.message });
  }
});

// DELETE /api/employees/:id
router.delete('/employees/:id', authenticate, requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const emp = await Employee.findByPk(req.params.id, { transaction: t });
    if (!emp) { await t.rollback(); return res.status(404).json({ message: 'Karyawan tidak ditemukan.' }); }

    const userId = emp.user_id;
    await emp.destroy({ transaction: t });
    await User.destroy({ where: { id: userId }, transaction: t });
    await t.commit();

    return res.json({ success: true, message: 'Karyawan berhasil dihapus dari sistem.' });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ message: 'Gagal menghapus karyawan.', error: err.message });
  }
});

// =========================================================
// DEPARTMENTS CRUD
// =========================================================

router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: Employee, as: 'employees', attributes: ['id'] }],
      order: [['id', 'ASC']]
    });
    const result = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      totalEmployees: d.employees?.length || 0
    }));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat departemen.', error: err.message });
  }
});

router.post('/departments', authenticate, requireAdmin, async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    return res.status(201).json({ success: true, department: { ...dept.toJSON(), totalEmployees: 0 } });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menambah departemen.', error: err.message });
  }
});

router.put('/departments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Departemen tidak ditemukan.' });
    await dept.update(req.body);
    return res.json({ success: true, department: dept });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui departemen.', error: err.message });
  }
});

router.delete('/departments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Departemen tidak ditemukan.' });
    await dept.destroy();
    return res.json({ success: true, message: 'Departemen berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus departemen.', error: err.message });
  }
});

// =========================================================
// POSITIONS CRUD
// =========================================================

router.get('/positions', authenticate, async (req, res) => {
  try {
    const positions = await Position.findAll({
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']]
    });
    return res.json(positions.map(p => ({
      id: p.id, name: p.name, description: p.description,
      departmentId: p.department_id, departmentName: p.department?.name || ''
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat posisi.', error: err.message });
  }
});

router.post('/positions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, departmentId } = req.body;
    const pos = await Position.create({ name, description, department_id: departmentId });
    return res.status(201).json({ success: true, position: pos });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menambah posisi.', error: err.message });
  }
});

router.put('/positions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const pos = await Position.findByPk(req.params.id);
    if (!pos) return res.status(404).json({ message: 'Posisi tidak ditemukan.' });
    const { name, description, departmentId } = req.body;
    await pos.update({ name, description, department_id: departmentId });
    return res.json({ success: true, position: pos });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui posisi.', error: err.message });
  }
});

router.delete('/positions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const pos = await Position.findByPk(req.params.id);
    if (!pos) return res.status(404).json({ message: 'Posisi tidak ditemukan.' });
    await pos.destroy();
    return res.json({ success: true, message: 'Posisi berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus posisi.', error: err.message });
  }
});

// =========================================================
// SHIFTS CRUD
// =========================================================

router.get('/shifts', authenticate, async (req, res) => {
  try {
    const shifts = await Shift.findAll({ order: [['id', 'ASC']] });
    return res.json(shifts.map(s => ({
      id: s.id, name: s.name, code: s.code,
      startTime: s.start_time, endTime: s.end_time,
      durationHours: s.duration_hours, color: s.color
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat shift.', error: err.message });
  }
});

router.post('/shifts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, code, startTime, endTime, durationHours, color } = req.body;
    const shift = await Shift.create({
      name, code, start_time: startTime, end_time: endTime,
      duration_hours: durationHours || 8, color: color || 'emerald'
    });
    return res.status(201).json({ success: true, shift });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menambah shift.', error: err.message });
  }
});

router.put('/shifts/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift tidak ditemukan.' });
    const { name, code, startTime, endTime, durationHours, color } = req.body;
    await shift.update({
      name, code, start_time: startTime, end_time: endTime,
      duration_hours: durationHours, color
    });
    return res.json({ success: true, shift });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui shift.', error: err.message });
  }
});

router.delete('/shifts/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift tidak ditemukan.' });
    await shift.destroy();
    return res.json({ success: true, message: 'Shift berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus shift.', error: err.message });
  }
});

// =========================================================
// SCHEDULES
// =========================================================

router.get('/schedules', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.employeeId) where.employee_id = req.query.employeeId;
    if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    }

    const schedules = await Schedule.findAll({
      where,
      include: [
        {
          model: Employee, as: 'employee',
          include: [{ model: User, as: 'user', attributes: ['name'] }]
        },
        { model: Shift, as: 'shift' }
      ],
      order: [['date', 'ASC']]
    });

    return res.json(schedules.map(s => ({
      id: s.id,
      employeeId: s.employee_id,
      employeeName: s.employee?.user?.name || '',
      shiftId: s.shift_id,
      shiftName: s.shift?.name || '',
      shiftCode: s.shift?.code || '',
      date: s.date,
      time: s.shift ? `${s.shift.start_time?.substring(0, 5)} - ${s.shift.end_time?.substring(0, 5)}` : ''
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat jadwal.', error: err.message });
  }
});

router.post('/schedules', authenticate, requireAdmin, async (req, res) => {
  try {
    const { employeeId, shiftId, date } = req.body;
    const schedule = await Schedule.create({ employee_id: employeeId, shift_id: shiftId, date });

    const created = await Schedule.findByPk(schedule.id, {
      include: [
        { model: Employee, as: 'employee', include: [{ model: User, as: 'user', attributes: ['name'] }] },
        { model: Shift, as: 'shift' }
      ]
    });

    return res.status(201).json({
      success: true,
      schedule: {
        id: created.id,
        employeeId: created.employee_id,
        employeeName: created.employee?.user?.name || '',
        shiftId: created.shift_id,
        shiftName: created.shift?.name || '',
        date: created.date,
        time: created.shift ? `${created.shift.start_time?.substring(0, 5)} - ${created.shift.end_time?.substring(0, 5)}` : ''
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menambah jadwal.', error: err.message });
  }
});

router.put('/schedules/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });

    const { employeeId, shiftId, date } = req.body;
    if (employeeId) schedule.employee_id = employeeId;
    if (shiftId) schedule.shift_id = shiftId;
    if (date) schedule.date = date;

    await schedule.save();

    const updated = await Schedule.findByPk(schedule.id, {
      include: [
        { model: Employee, as: 'employee', include: [{ model: User, as: 'user', attributes: ['name'] }] },
        { model: Shift, as: 'shift' }
      ]
    });

    return res.json({
      success: true,
      schedule: {
        id: updated.id,
        employeeId: updated.employee_id,
        employeeName: updated.employee?.user?.name || '',
        shiftId: updated.shift_id,
        shiftName: updated.shift?.name || '',
        date: updated.date,
        time: updated.shift ? `${updated.shift.start_time?.substring(0, 5)} - ${updated.shift.end_time?.substring(0, 5)}` : ''
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui jadwal.', error: err.message });
  }
});

router.delete('/schedules/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const schedule = await Schedule.findByPk(req.params.id);
    if (!schedule) return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    await schedule.destroy();
    return res.json({ success: true, message: 'Jadwal berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus jadwal.', error: err.message });
  }
});

// =========================================================
// ATTENDANCE
// =========================================================

router.get('/attendance', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.query.employeeId) where.employee_id = req.query.employeeId;
    if (req.query.date) where.date = req.query.date;
    if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    }

    const records = await Attendance.findAll({
      where,
      include: [{
        model: Employee, as: 'employee',
        include: [
          { model: User, as: 'user', attributes: ['name'] },
          { model: Department, as: 'department', attributes: ['name'] }
        ]
      }],
      order: [['date', 'DESC'], ['check_in', 'DESC']]
    });

    return res.json(records.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee?.user?.name || '',
      departmentName: r.employee?.department?.name || '',
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      location: r.location,
      notes: r.notes
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat data presensi.', error: err.message });
  }
});

router.get('/attendance/today/:employeeId', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await Attendance.findOne({
      where: { employee_id: req.params.employeeId, date: today }
    });
    return res.json(record ? {
      id: record.id, date: record.date, checkIn: record.check_in,
      checkOut: record.check_out, status: record.status,
      location: record.location, notes: record.notes
    } : null);
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat presensi hari ini.', error: err.message });
  }
});

router.post('/attendance/check-in', authenticate, async (req, res) => {
  const { employeeId, location } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = await Attendance.findOne({
      where: { employee_id: employeeId, date: today }
    });
    if (existing && existing.check_in) {
      return res.status(400).json({ message: 'Anda sudah melakukan absen masuk hari ini.' });
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Get late tolerance from settings
    const toleranceSetting = await Setting.findOne({ where: { setting_key: 'lateToleranceMinutes' } });
    const tolerance = toleranceSetting ? parseInt(toleranceSetting.setting_value) : 15;

    let status = 'Hadir';
    if (hours > 7 || (hours === 7 && minutes > tolerance)) {
      status = 'Terlambat';
    }

    const notes = status === 'Terlambat'
      ? `Terlambat check-in pada pukul ${timeStr}`
      : `Check-in tepat waktu pada pukul ${timeStr}`;

    let record;
    if (existing) {
      existing.check_in = timeStr;
      existing.status = status;
      existing.location = location || 'GPS Verified';
      existing.notes = notes;
      await existing.save();
      record = existing;
    } else {
      record = await Attendance.create({
        employee_id: employeeId,
        date: today,
        check_in: timeStr,
        status,
        location: location || 'GPS Verified',
        notes
      });
    }

    return res.json({
      success: true,
      record: {
        id: record.id, date: record.date, checkIn: record.check_in,
        checkOut: record.check_out, status: record.status,
        location: record.location, notes: record.notes
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal melakukan check-in.', error: err.message });
  }
});

router.post('/attendance/check-out', authenticate, async (req, res) => {
  const { employeeId } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = await Attendance.findOne({
      where: { employee_id: employeeId, date: today }
    });
    if (!existing || !existing.check_in) {
      return res.status(400).json({ message: 'Anda harus absen masuk terlebih dahulu.' });
    }
    if (existing.check_out) {
      return res.status(400).json({ message: 'Anda sudah melakukan absen pulang hari ini.' });
    }

    const timeStr = new Date().toTimeString().split(' ')[0];
    existing.check_out = timeStr;
    existing.notes = `${existing.notes} | Check-out pada pukul ${timeStr}`;
    await existing.save();

    return res.json({
      success: true,
      record: {
        id: existing.id, date: existing.date, checkIn: existing.check_in,
        checkOut: existing.check_out, status: existing.status,
        location: existing.location, notes: existing.notes
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal melakukan check-out.', error: err.message });
  }
});

// Helper for generating daily QR Code token
function generateDailyQrToken(employeeId, empCode, dateStr) {
  const secret = JWT_SECRET || 'bigland_sentul_jwt_secret_key_2026';
  const code = empCode || `EMP-${employeeId}`;
  const raw = `BIGLAND-QR|${employeeId}|${code}|${dateStr}|${secret}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12);
  return JSON.stringify({
    sys: 'BIGLAND-HRIS',
    empId: employeeId,
    nip: code,
    date: dateStr,
    hash: hash
  });
}

// GET /api/attendance/employee-qr - Fetch dynamic daily QR code for employee
router.get('/attendance/employee-qr', authenticate, async (req, res) => {
  try {
    const user = req.user;
    let employee = null;
    if (user.role === 'EMPLOYEE' || req.query.employeeId) {
      const empId = req.query.employeeId || user.employeeId;
      employee = await Employee.findByPk(empId, {
        include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
      });
    } else {
      employee = await Employee.findOne({
        where: { user_id: user.id },
        include: [{ model: User, as: 'user', attributes: ['name', 'email'] }]
      });
    }

    if (!employee) {
      return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const qrPayloadString = generateDailyQrToken(employee.id, employee.employee_id || employee.nip, today);

    return res.json({
      success: true,
      employee: {
        id: employee.id,
        nip: employee.employee_id || employee.nip,
        name: employee.user?.name || '',
        email: employee.user?.email || ''
      },
      date: today,
      qrToken: qrPayloadString
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal membuat Kode QR harian.', error: err.message });
  }
});

// POST /api/attendance/scan-qr - Process scanned QR code from Kiosk Scanner (Public Kiosk Endpoint)
router.post('/attendance/scan-qr', async (req, res) => {
  try {
    const { qrData, location } = req.body;
    if (!qrData) {
      return res.status(400).json({ message: 'Data Kode QR tidak valid atau kosong.' });
    }

    let parsed = null;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      parsed = { nip: String(qrData).trim() };
    }

    const today = new Date().toISOString().split('T')[0];

    if (parsed.date && parsed.date !== today) {
      return res.status(400).json({ message: `Kode QR ini sudah kedaluwarsa (berlaku untuk tanggal ${parsed.date}). Harap perbarui QR di aplikasi karyawan!` });
    }

    let employee = null;
    if (parsed.empId) {
      employee = await Employee.findByPk(parsed.empId, {
        include: [
          { model: User, as: 'user', attributes: ['name', 'email'] },
          { model: Department, as: 'department', attributes: ['name'] },
          { model: Position, as: 'position', attributes: ['name'] }
        ]
      });
    }

    if (!employee && parsed.nip) {
      employee = await Employee.findOne({
        where: {
          [Op.or]: [
            { employee_id: parsed.nip },
            { employee_id: `EMP-${parsed.nip}` }
          ]
        },
        include: [
          { model: User, as: 'user', attributes: ['name', 'email'] },
          { model: Department, as: 'department', attributes: ['name'] },
          { model: Position, as: 'position', attributes: ['name'] }
        ]
      });
    }

    if (!employee) {
      return res.status(404).json({ message: 'Karyawan dari Kode QR ini tidak ditemukan dalam sistem.' });
    }

    if (parsed.sys === 'BIGLAND-HRIS' && parsed.hash) {
      const secret = JWT_SECRET || 'bigland_sentul_jwt_secret_key_2026';
      const empCode = employee.employee_id || employee.nip;
      const raw = `BIGLAND-QR|${employee.id}|${empCode}|${today}|${secret}`;
      const expectedHash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12);
      if (parsed.hash !== expectedHash) {
        return res.status(400).json({ message: 'Kode QR tidak sah atau telah dimodifikasi.' });
      }
    }

    const existing = await Attendance.findOne({
      where: { employee_id: employee.id, date: today }
    });

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    if (!existing || !existing.check_in) {
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const toleranceSetting = await Setting.findOne({ where: { setting_key: 'lateToleranceMinutes' } });
      const tolerance = toleranceSetting ? parseInt(toleranceSetting.setting_value) : 15;

      let status = 'Hadir';
      if (hours > 7 || (hours === 7 && minutes > tolerance)) {
        status = 'Terlambat';
      }

      const notes = status === 'Terlambat'
        ? `Absen Masuk via Kiosk Scanner QR (Terlambat jam ${timeStr})`
        : `Absen Masuk via Kiosk Scanner QR (Tepat Waktu jam ${timeStr})`;

      let record;
      if (existing) {
        existing.check_in = timeStr;
        existing.status = status;
        existing.location = location || 'Lobi Utama Kiosk Scanner';
        existing.notes = notes;
        await existing.save();
        record = existing;
      } else {
        record = await Attendance.create({
          employee_id: employee.id,
          date: today,
          check_in: timeStr,
          status,
          location: location || 'Lobi Utama Kiosk Scanner',
          notes
        });
      }

      const empCode = employee.employee_id || employee.nip;
      return res.json({
        success: true,
        action: 'CHECK_IN',
        message: `Absen MASUK Berhasil untuk ${employee.user?.name || empCode}!`,
        employee: {
          id: employee.id,
          nip: empCode,
          name: employee.user?.name || '',
          department: employee.department?.name || '-',
          position: employee.position?.name || '-',
          avatar: employee.avatar || null
        },
        record: {
          id: record.id, date: record.date, checkIn: record.check_in,
          checkOut: record.check_out, status: record.status,
          location: record.location, notes: record.notes
        }
      });
    } else if (existing && existing.check_in && !existing.check_out) {
      existing.check_out = timeStr;
      existing.notes = `${existing.notes} | Absen Pulang via Kiosk Scanner QR jam ${timeStr}`;
      await existing.save();

      const empCode = employee.employee_id || employee.nip;
      return res.json({
        success: true,
        action: 'CHECK_OUT',
        message: `Absen PULANG Berhasil untuk ${employee.user?.name || empCode}!`,
        employee: {
          id: employee.id,
          nip: empCode,
          name: employee.user?.name || '',
          department: employee.department?.name || '-',
          position: employee.position?.name || '-',
          avatar: employee.avatar || null
        },
        record: {
          id: existing.id, date: existing.date, checkIn: existing.check_in,
          checkOut: existing.check_out, status: existing.status,
          location: existing.location, notes: existing.notes
        }
      });
    } else {
      const empCode = employee.employee_id || employee.nip;
      return res.status(400).json({
        message: `Karyawan ${employee.user?.name || empCode} sudah menyelesaikan Absen Masuk (${existing.check_in}) & Absen Pulang (${existing.check_out}) hari ini.`
      });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memproses pemindaian QR.', error: err.message });
  }
});

// =========================================================
// LEAVE REQUESTS
// =========================================================

router.get('/leave-requests', authenticate, async (req, res) => {
  try {
    const where = {};
    // Employees can only see their own; admin/superadmin see all
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId) {
      where.employee_id = req.user.employeeId;
    }
    if (req.query.status) where.status = req.query.status;

    const requests = await LeaveRequest.findAll({
      where,
      include: [{
        model: Employee, as: 'employee',
        include: [
          { model: User, as: 'user', attributes: ['name'] },
          { model: Department, as: 'department', attributes: ['name'] }
        ]
      }],
      order: [['submitted_at', 'DESC']]
    });

    return res.json(requests.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee?.user?.name || '',
      departmentName: r.employee?.department?.name || '',
      type: r.type,
      startDate: r.start_date,
      endDate: r.end_date,
      totalDays: r.total_days,
      reason: r.reason,
      proof: r.proof,
      status: r.status,
      submittedAt: r.submitted_at,
      reviewedBy: r.reviewed_by,
      reviewNote: r.review_note
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat pengajuan izin.', error: err.message });
  }
});

router.post('/leave-requests', authenticate, async (req, res) => {
  const { employeeId, type, startDate, endDate, reason, proof } = req.body;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await LeaveRequest.create({
      employee_id: employeeId,
      type, start_date: startDate, end_date: endDate,
      total_days: totalDays, reason,
      proof: proof || null,
      status: 'Menunggu',
      submitted_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Pengajuan izin berhasil dikirim.',
      leave: {
        id: leave.id, employeeId: leave.employee_id, type: leave.type,
        startDate: leave.start_date, endDate: leave.end_date,
        totalDays: leave.total_days, reason: leave.reason,
        proof: leave.proof, status: leave.status,
        submittedAt: leave.submitted_at
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal mengirim pengajuan izin.', error: err.message });
  }
});

router.put('/leave-requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });

    leave.status = 'Disetujui';
    leave.reviewed_by = req.body.reviewer || req.user.email;
    leave.review_note = req.body.note || 'Disetujui oleh HRD';
    await leave.save();

    return res.json({ success: true, message: 'Pengajuan berhasil disetujui.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menyetujui pengajuan.', error: err.message });
  }
});

router.put('/leave-requests/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Pengajuan tidak ditemukan.' });

    leave.status = 'Ditolak';
    leave.reviewed_by = req.body.reviewer || req.user.email;
    leave.review_note = req.body.note || 'Ditolak oleh HRD';
    await leave.save();

    return res.json({ success: true, message: 'Pengajuan berhasil ditolak.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menolak pengajuan.', error: err.message });
  }
});

// =========================================================
// SETTINGS
// =========================================================

router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const result = {};
    settings.forEach(s => {
      let val = s.setting_value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val !== '') val = Number(val);
      result[s.setting_key] = val;
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat pengaturan.', error: err.message });
  }
});

router.put('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Setting.upsert({ setting_key: key, setting_value: String(value) });
    }
    return res.json({ success: true, message: 'Pengaturan berhasil disimpan.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menyimpan pengaturan.', error: err.message });
  }
});

// =========================================================
// SUPERADMIN — USER/ROLE MANAGEMENT
// =========================================================

router.get('/users', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: Employee, as: 'employee',
        include: [
          { model: Department, as: 'department', attributes: ['name'] },
          { model: Position, as: 'position', attributes: ['name'] }
        ]
      }],
      order: [['id', 'ASC']]
    });
    return res.json(users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      employeeId: u.employee?.employee_id || null,
      departmentName: u.employee?.department?.name || '-',
      positionName: u.employee?.position?.name || '-',
      status: u.employee?.status || 'Aktif',
      createdAt: u.created_at
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat daftar user.', error: err.message });
  }
});

router.post('/users', authenticate, requireSuperAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const user = await User.create({
      name, email: email.toLowerCase(), password: hashedPassword, role: role || 'EMPLOYEE'
    });

    // If role is ADMIN or SUPERADMIN, auto-create employee record
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      const count = await Employee.count();
      await Employee.create({
        employee_id: `EMP-${1001 + count}`,
        user_id: user.id,
        department_id: 6, // HR Department
        position_id: 10,  // Manajer HRD
        status: 'Aktif',
        join_date: new Date().toISOString().split('T')[0]
      });
    }

    return res.status(201).json({
      success: true,
      message: `User ${name} berhasil dibuat dengan role ${role}.`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }
    return res.status(500).json({ message: 'Gagal membuat user.', error: err.message });
  }
});

router.put('/users/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

    const { name, email, role, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.name} berhasil diperbarui.`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memperbarui user.', error: err.message });
  }
});

router.delete('/users/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri.' });
    }
    await user.destroy(); // Will cascade delete employee
    return res.json({ success: true, message: `User ${user.name} berhasil dihapus.` });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus user.', error: err.message });
  }
});

// Export PDF & Excel Routes
router.get('/export/attendance/pdf', authenticate, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    await generateAttendancePDF(res, month);
  } catch (err) {
    console.error('PDF export error:', err);
    return res.status(500).json({ message: 'Gagal mengekspor PDF.', error: err.message });
  }
});

router.get('/export/attendance/excel', authenticate, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    await generateAttendanceExcel(res, month);
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ message: 'Gagal mengekspor Excel.', error: err.message });
  }
});

// In-Memory Announcement State Backup
let companyAnnouncements = [
  {
    id: 1,
    title: '📢 Himbauan Jam Presensi & Kebijakan Shift Hari Raya',
    content: 'Diberitahukan kepada seluruh staf dan karyawan Bigland Hotel Sentul bahwa jam operasional presensi QR tetap berlaku sesuai jadwal roster masing-masing. Harap melakukan presensi tepat waktu.',
    date: '2026-07-28',
    author: 'HRD Manager',
    isImportant: true
  }
];

// Announcement Endpoints
router.get('/announcements', authenticate, (req, res) => {
  return res.json({ success: true, announcements: companyAnnouncements });
});

router.post('/announcements', authenticate, requireAdmin, (req, res) => {
  const { title, content, isImportant } = req.body;
  const newAnn = {
    id: Date.now(),
    title,
    content,
    date: new Date().toISOString().split('T')[0],
    author: req.user?.name || 'HRD Admin',
    isImportant: !!isImportant
  };
  companyAnnouncements.unshift(newAnn);
  return res.json({ success: true, announcement: newAnn });
});

// Delete Announcement Endpoint
router.delete('/announcements/:id', authenticate, requireAdmin, (req, res) => {
  const annId = Number(req.params.id);
  companyAnnouncements = companyAnnouncements.filter(a => a.id !== annId);
  return res.json({ success: true, message: 'Pengumuman berhasil dihapus.' });
});

// SuperAdmin System Backup Endpoint
router.get('/system/backup', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    const employees = await Employee.findAll();
    const departments = await Department.findAll();
    const positions = await Position.findAll();
    const shifts = await Shift.findAll();
    const attendance = await Attendance.findAll();
    const leaveRequests = await LeaveRequest.findAll();
    const settings = await Setting.findAll();

    const backupData = {
      timestamp: new Date().toISOString(),
      system: 'Bigland HRIS Monorepo v2.0',
      data: {
        users, employees, departments, positions, shifts, attendance, leaveRequests, settings, announcements: companyAnnouncements
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="Backup_Bigland_HRIS_${new Date().toISOString().split('T')[0]}.json"`);
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal membuat cadangan database.', error: err.message });
  }
});

// =========================================================
// ANNOUNCEMENTS CRUD
// =========================================================

router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.findAll({ order: [['id', 'DESC']] });
    if (list.length === 0) {
      // Create initial seed announcement if empty
      const initItem = await Announcement.create({
        title: '📢 Himbauan Presensi QR & Kebijakan Shift Hari Raya',
        content: 'Diberitahukan kepada seluruh karyawan Bigland Hotel Sentul bahwa sistem presensi QR harian wajib dilakukan pada lobi/area kerja.',
        date: new Date().toISOString().split('T')[0],
        author: 'HRD Manager',
        is_important: true
      });
      return res.json([{
        id: initItem.id,
        title: initItem.title,
        content: initItem.content,
        date: initItem.date,
        author: initItem.author,
        isImportant: initItem.is_important
      }]);
    }
    return res.json(list.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      date: a.date,
      author: a.author,
      isImportant: a.is_important
    })));
  } catch (err) {
    return res.status(500).json({ message: 'Gagal memuat pengumuman.', error: err.message });
  }
});

router.post('/announcements', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, content, isImportant } = req.body;
    const authorName = req.user?.name || 'HRD Manager';
    const today = new Date().toISOString().split('T')[0];
    const item = await Announcement.create({
      title,
      content,
      date: today,
      author: authorName,
      is_important: isImportant !== undefined ? isImportant : true
    });
    return res.status(201).json({
      success: true,
      announcement: {
        id: item.id,
        title: item.title,
        content: item.content,
        date: item.date,
        author: item.author,
        isImportant: item.is_important
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal membuat pengumuman baru.', error: err.message });
  }
});

router.delete('/announcements/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const item = await Announcement.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Pengumuman tidak ditemukan.' });
    await item.destroy();
    return res.json({ success: true, message: 'Pengumuman berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus pengumuman.', error: err.message });
  }
});

module.exports = router;
