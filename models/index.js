const { Sequelize, DataTypes } = require('sequelize');

const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10);
const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const password = process.env.DB_PASS || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'bigland_hris';

const dbUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
if (dbUrl) {
  sequelize = new Sequelize(dbUrl, {
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true
    }
  });
} else {
  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',
    define: {
      timestamps: true,
      underscored: true
    }
  });
}

// 1. User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), defaultValue: 'EMPLOYEE' }
}, { tableName: 'users' });

// 2. Department Model
const Department = sequelize.define('Department', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  description: { type: DataTypes.TEXT }
}, { tableName: 'departments' });

// 3. Position Model
const Position = sequelize.define('Position', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT }
}, { tableName: 'positions' });

// 4. Employee Model
const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(30) },
  address: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(20), defaultValue: 'Aktif' },
  join_date: { type: DataTypes.DATEONLY },
  avatar: { type: DataTypes.TEXT('long') }
}, { tableName: 'employees' });

// 5. Shift Model
const Shift = sequelize.define('Shift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(10), allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
  duration_hours: { type: DataTypes.DECIMAL(4, 1), defaultValue: 8 },
  color: { type: DataTypes.STRING(30), defaultValue: 'emerald' }
}, { tableName: 'shifts' });

// 6. Schedule Model
const Schedule = sequelize.define('Schedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false }
}, { tableName: 'schedules' });

// 7. Attendance Model
const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  check_in: { type: DataTypes.TIME },
  check_out: { type: DataTypes.TIME },
  status: { type: DataTypes.ENUM('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'), defaultValue: 'Hadir' },
  location: { type: DataTypes.STRING(500) },
  notes: { type: DataTypes.TEXT }
}, { tableName: 'attendance' });

// 8. LeaveRequest Model
const LeaveRequest = sequelize.define('LeaveRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.STRING(100), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  total_days: { type: DataTypes.INTEGER, defaultValue: 1 },
  reason: { type: DataTypes.TEXT, allowNull: false },
  proof: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.ENUM('Menunggu', 'Disetujui', 'Ditolak'), defaultValue: 'Menunggu' },
  reviewed_by: { type: DataTypes.STRING(255) },
  review_note: { type: DataTypes.TEXT },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'leave_requests' });

// 9. Setting Model
const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  setting_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  setting_value: { type: DataTypes.TEXT }
}, { tableName: 'settings' });

// ==========================================
// Relationships
// ==========================================

// Employee belongs to User, Department, Position
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Employee.belongsTo(Position, { foreignKey: 'position_id', as: 'position' });

// Reverse: User/Department/Position has many Employees
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee' });
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });
Position.hasMany(Employee, { foreignKey: 'position_id', as: 'employees' });

// Position belongs to Department
Position.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Position, { foreignKey: 'department_id', as: 'positions' });

// Schedule belongs to Employee and Shift
Schedule.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Schedule.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });
Employee.hasMany(Schedule, { foreignKey: 'employee_id', as: 'schedules' });
Shift.hasMany(Schedule, { foreignKey: 'shift_id', as: 'schedules' });

// Attendance belongs to Employee
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendances' });

// LeaveRequest belongs to Employee
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id', as: 'leaveRequests' });

module.exports = {
  sequelize,
  User,
  Employee,
  Department,
  Position,
  Shift,
  Schedule,
  Attendance,
  LeaveRequest,
  Setting
};
