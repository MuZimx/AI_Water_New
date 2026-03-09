-- 初始迁移：创建所需表（SQLite）
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('工人', '管理员')) NOT NULL,
    full_name TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    status TEXT CHECK(status IN ('正常', '轻微漏水', '严重漏水', '传感器损坏')) DEFAULT '正常',
    last_audio_time DATETIME
);

CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    sensor_id INTEGER NOT NULL,
    risk_level TEXT DEFAULT '未检测',
    confidence REAL DEFAULT 0.0,
    detect_time DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audio_sensor ON audio_files(sensor_id);
CREATE INDEX IF NOT EXISTS idx_audio_risk ON audio_files(risk_level);

CREATE TABLE IF NOT EXISTS maintenance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_number TEXT UNIQUE NOT NULL,
    worker_id INTEGER NOT NULL,
    sensor_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK(status IN ('待处理', '处理中', '已完成', '已驳回')) DEFAULT '待处理',
    photos TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_worker ON maintenance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);

CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_number TEXT UNIQUE NOT NULL,
    admin_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachment TEXT,
    deadline DATETIME,
    status TEXT CHECK(status IN ('草稿', '已发布', '进行中', '已完成', '已取消')) DEFAULT '已发布',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS command_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    read_status INTEGER DEFAULT 0,
    feedback TEXT,
    feedback_photos TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (command_id) REFERENCES commands(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 插入默认配置：是否在检测到严重漏水时自动创建检修记录
INSERT OR IGNORE INTO config (key, value) VALUES ('auto_create_on_severe', 'true');

-- 简单种子：一个管理员账户（密码需在部署后重置）
INSERT OR IGNORE INTO users (id, username, password, role, full_name) VALUES (1, 'admin', 'REPLACE_WITH_BCRYPT_HASH', '管理员', '系统管理员');

-- 示例传感器
INSERT OR IGNORE INTO sensors (id, name, latitude, longitude, status) VALUES (1, 'Sensor-1', 32.06, 118.78, '正常');
