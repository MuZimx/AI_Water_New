const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'users.db'), (err) => {
  if (err) {
    console.error('无法连接到 SQLite 数据库:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库');
    initializeDefaultSensors();
  }
});

const tryAddColumn = (table, columnDef) => {
  const [columnName] = columnDef.trim().split(' ');
  const checkSql = `PRAGMA table_info(${table})`;
  db.all(checkSql, [], (err, rows) => {
    if (err) return;
    const exists = rows.some(r => r.name === columnName);
    if (!exists) {
      const alterSql = `ALTER TABLE ${table} ADD COLUMN ${columnDef}`;
      db.run(alterSql, () => {});
    }
  });
};

function initializeDefaultSensors() {
  db.get('SELECT COUNT(*) as count FROM sensors', [], (err, row) => {
    if (!err && row && row.count === 0) {
      console.log('初始化默认传感器数据...');
      const defaultSensors = [
        { id: 1, name: '传感器-玄武区-001', latitude: 32.06, longitude: 118.78, status: '正常' },
        { id: 2, name: '传感器-秦淮区-002', latitude: 32.02, longitude: 118.79, status: '轻微漏水' },
        { id: 3, name: '传感器-鼓楼区-003', latitude: 32.07, longitude: 118.77, status: '严重漏水' },
        { id: 4, name: '传感器-建邺区-004', latitude: 32.00, longitude: 118.74, status: '正常' },
        { id: 5, name: '传感器-雨花台区-005', latitude: 31.98, longitude: 118.78, status: '正常' },
        { id: 6, name: '传感器-栖霞区-006', latitude: 32.10, longitude: 118.88, status: '正常' },
        { id: 7, name: '传感器-浦口区-007', latitude: 32.06, longitude: 118.62, status: '轻微漏水' },
        { id: 8, name: '传感器-江宁区-008', latitude: 31.93, longitude: 118.84, status: '正常' },
        { id: 9, name: '传感器-六合区-009', latitude: 32.34, longitude: 118.84, status: '正常' },
        { id: 10, name: '传感器-溧水区-010', latitude: 31.64, longitude: 119.02, status: '正常' },
        { id: 11, name: '传感器-高淳区-011', latitude: 31.32, longitude: 118.88, status: '正常' },
        { id: 12, name: '传感器-玄武区-012', latitude: 32.05, longitude: 118.80, status: '正常' },
        { id: 13, name: '传感器-秦淮区-013', latitude: 32.03, longitude: 118.77, status: '正常' }
      ];

      const stmt = db.prepare('INSERT INTO sensors (id, name, latitude, longitude, status) VALUES (?, ?, ?, ?, ?)');
      defaultSensors.forEach(sensor => {
        stmt.run(sensor.id, sensor.name, sensor.latitude, sensor.longitude, sensor.status);
      });
      stmt.finalize();
      console.log('已插入默认传感器数据');
    }
  });
}

function initializeSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT '工人',
    full_name TEXT,
    phone TEXT,
    worker_status TEXT DEFAULT '空闲',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  tryAddColumn('users', "role TEXT DEFAULT '工人'");
  tryAddColumn('users', 'full_name TEXT');
  tryAddColumn('users', 'phone TEXT');
  tryAddColumn('users', "worker_status TEXT DEFAULT '空闲'");

  db.run(`CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    risk_level TEXT DEFAULT '未检测',
    confidence REAL DEFAULT 0.0,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT '未读',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS maintenance_sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maintenance_id INTEGER NOT NULL,
    sensor_id INTEGER NOT NULL,
    sensor_name TEXT NOT NULL,
    FOREIGN KEY (maintenance_id) REFERENCES maintenance_records (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS maintenance_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maintenance_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (maintenance_id) REFERENCES maintenance_records (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_number TEXT UNIQUE,
    admin_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sensor_id INTEGER,
    deadline DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users (id),
    FOREIGN KEY (sensor_id) REFERENCES sensors (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT '未执行',
    read_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (command_id) REFERENCES commands (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (command_id) REFERENCES commands (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_feedback_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES command_feedbacks (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (command_id) REFERENCES commands (id)
  )`);
}

initializeSchema();

module.exports = {
  db
};
