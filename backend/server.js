const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PythonShell } = require('python-shell');
const chokidar = require('chokidar');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken,
  verifyRefreshToken,
  JWT_CONFIG
} = require('./utils/jwt');

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问被拒绝，缺少访问令牌'
    });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: '令牌无效或已过期'
    });
  }
  
  req.user = decoded;
  next();
};

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 确保检修记录照片目录存在
const maintenancePhotosDir = path.join(__dirname, 'uploads', 'maintenance');
if (!fs.existsSync(maintenancePhotosDir)) {
  fs.mkdirSync(maintenancePhotosDir, { recursive: true });
}

// 确保命令附件目录存在
const commandAttachmentsDir = path.join(__dirname, 'uploads', 'commands');
if (!fs.existsSync(commandAttachmentsDir)) {
  fs.mkdirSync(commandAttachmentsDir, { recursive: true });
}

// 确保命令反馈照片目录存在
const commandFeedbackPhotosDir = path.join(__dirname, 'uploads', 'command_feedback');
if (!fs.existsSync(commandFeedbackPhotosDir)) {
  fs.mkdirSync(commandFeedbackPhotosDir, { recursive: true });
}

// 配置 multer 中间件，只允许音频文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤器，只允许音频文件
const fileFilter = (req, file, cb) => {
  // 检查文件类型是否为音频
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传音频文件！'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制文件大小为50MB
  }
});

// 配置检修记录照片上传
const maintenancePhotosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, maintenancePhotosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'maintenance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const maintenancePhotosUpload = multer({
  storage: maintenancePhotosStorage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 限制文件大小为20MB
  }
});

// 配置命令附件上传
const commandAttachmentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, commandAttachmentsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'command-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const commandAttachmentsUpload = multer({
  storage: commandAttachmentsStorage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 限制文件大小为30MB
  }
});

// 配置命令反馈照片上传
const commandFeedbackPhotosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, commandFeedbackPhotosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const commandFeedbackPhotosUpload = multer({
  storage: commandFeedbackPhotosStorage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 限制文件大小为20MB
  }
});

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // 提供静态文件访问

// 提供离线瓦片静态目录（如果存在）
const tilesDir = path.join(__dirname, 'public', 'tiles');
if (!fs.existsSync(tilesDir)) {
  // 不强制创建，方便用户先生成瓦片后再启用；如果需要可以取消注释下一行自动创建目录
  // fs.mkdirSync(tilesDir, { recursive: true });
}
app.use('/tiles', express.static(tilesDir));

// 初始化 SQLite 数据库
const db = new sqlite3.Database(path.join(__dirname, 'db/users.db'), (err) => {
  if (err) {
    console.error('无法连接到 SQLite 数据库:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库');
    
    // 初始化传感器数据（如果为空）
    db.get('SELECT COUNT(*) as count FROM sensors', [], (err, row) => {
      if (!err && row.count === 0) {
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
});

// 创建用户表
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

// 若老数据库缺少新列，尝试添加（兼容线上已有数据）
const tryAddColumn = (table, columnDef) => {
  const [columnName] = columnDef.trim().split(' ');
  const checkSql = `PRAGMA table_info(${table})`;
  db.all(checkSql, [], (err, rows) => {
    if (err) return;
    const exists = rows.some(r => r.name === columnName);
    if (!exists) {
      const alterSql = `ALTER TABLE ${table} ADD COLUMN ${columnDef}`;
      db.run(alterSql, (e) => {});
    }
  });
};

tryAddColumn('users', "role TEXT DEFAULT '工人'");
tryAddColumn('users', 'full_name TEXT');
tryAddColumn('users', 'phone TEXT');
tryAddColumn('users', "worker_status TEXT DEFAULT '空闲'");

// 创建音频文件表
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

// 创建检修记录表
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

// 创建检修记录关联的传感器表
db.run(`CREATE TABLE IF NOT EXISTS maintenance_sensors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maintenance_id INTEGER NOT NULL,
  sensor_id INTEGER NOT NULL,
  sensor_name TEXT NOT NULL,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_records (id)
)`);

// 创建检修记录照片表
db.run(`CREATE TABLE IF NOT EXISTS maintenance_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  maintenance_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_records (id)
)`);

// 创建命令指示表
db.run(`CREATE TABLE IF NOT EXISTS commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users (id)
)`);

// 创建命令接收者表
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

// 创建命令反馈表
db.run(`CREATE TABLE IF NOT EXISTS command_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (command_id) REFERENCES commands (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
)`);

// 创建命令反馈照片表
db.run(`CREATE TABLE IF NOT EXISTS command_feedback_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES command_feedbacks (id)
)`);

// 创建命令附件表
db.run(`CREATE TABLE IF NOT EXISTS command_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (command_id) REFERENCES commands (id)
)`);

// 检查是否需要初始化数据库
app.get('/api/init-status', (req, res) => {
  const query = `SELECT COUNT(*) as count FROM users`;
  db.get(query, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    res.json({
      success: true,
      initialized: result.count > 0
    });
  });
});

function getAudioID(filename) {
  const query = `SELECT id FROM audio_files WHERE filename = ?`;
  return new Promise((resolve, reject) => {
    db.get(query, [filename], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.id : null);
      }
    });
  });
}

// 初始化管理员账户
app.post('/api/init-admin', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码不能为空'
    });
  }

  // 检查是否已经存在用户
  const checkQuery = `SELECT COUNT(*) as count FROM users`;
  db.get(checkQuery, async (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    if (result.count > 0) {
      return res.status(400).json({
        success: false,
        message: '系统已初始化，无法再次初始化'
      });
    }

    try {
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 插入管理员用户
          const insertQuery = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
          db.run(insertQuery, [username, hashedPassword, '管理员'], function (err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: '初始化失败'
          });
        }

        res.status(201).json({
          success: true,
          message: '系统初始化成功',
          userId: this.lastID
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  });
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码不能为空'
    });
  }

  // 查询用户
  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username], (err, user) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 比较密码
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 生成JWT token
      const accessToken = generateAccessToken({
        id: user.id,
        username: user.username
        , role: user.role || '工人'
      });
      
      const refreshToken = generateRefreshToken({
        id: user.id,
        username: user.username
      });

      // 登录成功
      res.json({
        success: true,
        message: '登录成功',
        data: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: {
            id: user.id,
            username: user.username
          }
        }
      });
    });
  });
});

// 获取用户列表接口 - 需要认证
app.get('/api/users', authenticateToken, (req, res) => {
  // 仅允许管理员查看所有用户列表
  if (!req.user || req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const query = `SELECT id, username, role, full_name, phone, created_at FROM users ORDER BY id`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
  });
});

// 获取当前用户信息接口 - 需要认证
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const query = `SELECT id, username, role, full_name, phone, created_at FROM users WHERE id = ?`;
  
  db.get(query, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: row
    });
  });
});

// 删除用户接口 - 仅管理员可删除，且只能删除角色为 工人 的用户
app.delete('/api/users/:id', authenticateToken, (req, res) => {
  // 验证管理员权限
  if (!req.user || req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, message: '无效的用户ID' });
  }

  // 管理员不能删除自己
  if (req.user.id === targetId) {
    return res.status(400).json({ success: false, message: '无法删除自身账户' });
  }

  const getSql = `SELECT id, role FROM users WHERE id = ?`;
  db.get(getSql, [targetId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: '服务器内部错误' });
    if (!row) return res.status(404).json({ success: false, message: '用户不存在' });

    if (row.role !== '工人') {
      return res.status(403).json({ success: false, message: '只能删除工人用户' });
    }

    const delSql = `DELETE FROM users WHERE id = ?`;
    db.run(delSql, [targetId], function(err) {
      if (err) return res.status(500).json({ success: false, message: '删除失败' });
      return res.json({ success: true, message: '删除成功' });
    });
  });
});

// 获取音频文件列表接口 - 需要认证
app.get('/api/audio-files', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  const offset = (page - 1) * size;

  const query = `SELECT * FROM audio_files ORDER BY id DESC LIMIT ? OFFSET ?`;
  db.all(query, [size, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM audio_files`;
    db.get(countQuery, [], (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }

      res.json({
        success: true,
        data: rows,
        total: result.total
      });
    });
  });
});

// 删除音频文件接口 - 需要认证
app.delete('/api/audio-files/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM audio_files WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  });
});

// 音频处理状态跟踪
const processingStatus = new Map();

// 更新用户密码接口 - 需要认证
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '旧密码和新密码不能为空'
    });
  }

  if (newPassword.length < 6 || newPassword.length > 20) {
    return res.status(400).json({
      success: false,
      message: '密码长度应在6到20个字符之间'
    });
  }

  try {
    // 查询用户当前信息
    const query = `SELECT * FROM users WHERE id = ?`;
    db.get(query, [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证旧密码
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '旧密码错误'
        });
      }

      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // 更新密码
      const updateQuery = `UPDATE users SET password = ? WHERE id = ?`;
      db.run(updateQuery, [hashedNewPassword, userId], function (err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: '更新密码失败'
          });
        }

        res.json({
          success: true,
          message: '密码更新成功'
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取处理状态
app.get('/api/audio-processing-status/:name', authenticateToken, (req, res) => {
  const { name } = req.params;
  const status = processingStatus.get(name) || { status: 'unknown' };
  res.json({
    success: true,
    data: status
  });
});

// 刷新访问令牌接口
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: '缺少刷新令牌'
    });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: '刷新令牌无效或已过期'
    });
  }

  // 生成新的访问令牌
  const newAccessToken = generateAccessToken({
    id: decoded.id,
    username: decoded.username
  });

  res.json({
    success: true,
    message: '令牌刷新成功',
    data: {
      accessToken: newAccessToken
    }
  });
});

// 使用Python模型处理单个音频文件
function processAudioFile(file,id) {
  return new Promise((resolve, reject) => {
    const filePath = file;
    const dirpath = path.join(__dirname, 'py');
    console.log('Processing file ID:', id);
    let audioFile = {
      id: id,
      filename: path.basename(file),
    };

    // 更新处理状态为开始处理
    processingStatus.set(path.basename(file), {
      status: 'processing',
      progress: 10,
      message: '开始处理音频文件'
    });

    // 配置PythonShell选项
    const options = {
      scriptPath: dirpath,
      args: [filePath, dirpath]
    };

    // 更新处理状态
    processingStatus.set(path.basename(file), {
      status: 'processing',
      progress: 30,
      message: '正在加载模型'
    });

    try {
      // 调用Python脚本进行预测
      PythonShell.run('predict.py', options).then(results => {
        console.log('Python results:', results);

        if (!results || results.length === 0) {
          throw new Error('Python脚本没有返回结果');
        }

        // 解析Python脚本返回的JSON结果
        const prediction = JSON.parse(results[0]);
        console.log('Prediction result:', prediction);

        // 更新处理状态
        processingStatus.set(audioFile.id, {
          status: 'processing',
          progress: 80,
          message: '正在保存结果到数据库'
        });

        if (prediction.error) {
          processingStatus.set(path.basename(file), {
            status: 'error',
            progress: 0,
            message: prediction.error
          });
          console.error('预测出错:', prediction.error);
          return reject(new Error(prediction.error));
        }

        // 更新数据库中的预测结果
        const updateQuery = `
          UPDATE audio_files
          SET risk_level = ?, confidence = ?, detect_time = ?
          WHERE id = ?
        `;

        db.run(updateQuery, [
          prediction.risk_level,
          prediction.confidence,
          new Date().toISOString(),
          audioFile.id
        ], function(err) {
          if (err) {
            processingStatus.set(path.basename(file), {
              status: 'error',
              progress: 0,
              message: '更新数据库失败'
            });
            console.error('更新数据库失败:', err);
            return reject(err);
          }

          // 如果检测到漏水，更新传感器状态
          if (prediction.risk_level === '轻微漏水' || prediction.risk_level === '严重漏水') {
            // 首先获取这个音频文件对应的传感器ID
            db.get('SELECT sensor_id FROM audio_files WHERE id = ?', [audioFile.id], (err, row) => {
              if (!err && row && row.sensor_id) {
                const newStatus = prediction.risk_level === '严重漏水' ? '严重漏水' : '轻微漏水';
                db.run('UPDATE sensors SET status = ?, last_audio_time = ? WHERE id = ?',
                  [newStatus, new Date().toISOString(), row.sensor_id],
                  (err) => {
                    if (err) {
                      console.error('更新传感器状态失败:', err.message);
                    } else {
                      console.log(`传感器 ${row.sensor_id} 状态已更新为 ${newStatus}`);
                    }
                  });
              }
            });
          }

          // 更新处理状态为完成
          processingStatus.set(path.basename(file), {
            status: 'completed',
            progress: 100,
            message: '处理完成',
            result: prediction
          });

          console.log(`音频文件 ${audioFile.filename} 处理完成:`, prediction);
          resolve(prediction);
        });
      }).catch(error => {
        console.error('PythonShell执行出错:', error);
        processingStatus.set(path.basename(file), {
          status: 'error',
          progress: 0,
          message: `Python执行出错: ${error.message}`
        });
        reject(error);
      });
    } catch (error) {
      console.error('Python处理出错:', error);
      processingStatus.set(path.basename(file), {
        status: 'error',
        progress: 0,
        message: 'Python处理出错'
      });
      reject(error);
    }
  });
}

// 上传音频文件接口 - 需要认证
app.post('/api/upload-audio', authenticateToken, upload.single('audio'), (req, res) => {
  // 检查是否有文件上传
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的音频文件'
    });
  }

  const userId = req.user && req.user.id ? req.user.id : null;
  const sensorId = req.body.sensor_id;
  const filePath = req.file.path;

  // 保存文件信息到数据库
  const insertQuery = `INSERT INTO audio_files 
    (filename, original_name, mimetype, size, user_id, sensor_id, risk_level, confidence) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    req.file.filename,
    req.file.originalname || '',
    req.file.mimetype || 'audio',
    req.file.size || 0,
    userId,
    sensorId || null,
    '未检测',
    0.0
  ];

  db.run(insertQuery, params, function (err) {
    if (err) {
      // 如果保存数据库失败，删除已上传的文件
      try { fs.unlinkSync(filePath); } catch (e) {}
      return res.status(500).json({
        success: false,
        message: '文件信息保存失败'
      });
    }

    // 异步处理音频文件，不阻塞响应
    processAudioFile(filePath, this.lastID).catch(error => {
      console.error('音频处理失败:', error);
    });

    res.status(200).json({
      success: true,
      message: '音频文件上传成功',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      }
    });
  });
});

// 测试接口 - 需要认证
app.get('/api/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: '认证成功！',
    user: req.user
  });
});

// 简单的传感器列表接口（供前端地图使用）
// 获取单个传感器详情
app.get('/api/sensors/:id', (req, res) => {
  const { id } = req.params;
  
  db.get(`SELECT id, name, latitude, longitude, status, last_audio_time FROM sensors WHERE id = ?`, [id], (err, sensor) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询传感器失败' });
    }
    if (!sensor) {
      return res.status(404).json({ success: false, message: '传感器不存在' });
    }
    res.json({ success: true, data: sensor });
  });
});

app.get('/api/sensors', (req, res) => {
  // 从数据库查询传感器数据
  const query = `SELECT id, name, latitude, longitude, status, last_audio_time FROM sensors`;
  db.all(query, [], (err, sensors) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询传感器失败' });
    }

    // 查询哪些传感器有未完成的指令
    const assignedQuery = `SELECT DISTINCT sensor_id FROM command_recipients cr 
                          JOIN commands c ON cr.command_id = c.id 
                          WHERE c.sensor_id IS NOT NULL AND c.status IN ('已发布', '进行中')`;
    db.all(assignedQuery, [], (err, rows) => {
      if (!err && rows) {
        const assignedSensorIds = new Set(rows.map(r => r.sensor_id));
        sensors.forEach(sensor => {
          sensor.assigned = assignedSensorIds.has(sensor.id);
        });
      }
      res.json({ success: true, data: sensors });
    });
  });
});

// 更新传感器状态接口
app.put('/api/sensors/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // 验证管理员权限
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  // 验证状态值
  const validStatuses = ['正常', '轻微漏水', '严重漏水', '传感器损坏'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态值' });
  }

  db.run(`UPDATE sensors SET status = ? WHERE id = ?`, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '更新失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '传感器不存在' });
    }
    res.json({ success: true, message: '传感器状态已更新' });
  });
});

// 获取工人列表接口（供管理员派工使用）
app.get('/api/workers', authenticateToken, (req, res) => {
  // 验证管理员权限
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const query = `SELECT id, username, full_name, phone, role, worker_status FROM users WHERE role = ?`;
  db.all(query, ['工人'], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    res.json({ success: true, data: rows });
  });
});

// 创建派工指令接口
app.post('/api/commands', authenticateToken, (req, res) => {
  // 验证管理员权限
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const { title, content, worker_ids, sensor_id, deadline } = req.body;

  if (!title || !content || !worker_ids || !Array.isArray(worker_ids) || worker_ids.length === 0) {
    return res.status(400).json({ success: false, message: '参数不完整' });
  }

  // 生成指令编号
  const commandNumber = 'CMD' + Date.now();

  db.serialize(() => {
    // 插入指令
    const insertCommand = `INSERT INTO commands (command_number, admin_id, title, content, sensor_id, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(insertCommand, [commandNumber, req.user.id, title, content, sensor_id || null, deadline || null, '已发布'], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建指令失败' });
      }

      const commandId = this.lastID;


      // 批量插入接收者
      const stmt = db.prepare(`INSERT INTO command_recipients (command_id, worker_id) VALUES (?, ?)`);
      worker_ids.forEach(workerId => {
        stmt.run(commandId, workerId);
      });
      stmt.finalize();

      // 更新所有被分配工人的状态为"工作中"
      worker_ids.forEach(workerId => {
        db.run(`UPDATE users SET worker_status = '工作中' WHERE id = ?`, [workerId]);
      });

      res.json({
        success: true,
        message: '派工成功',
        data: { commandId, commandNumber }
      });
    });
  });
});

// 获取工人收到的派工指令
app.get('/api/commands/received', authenticateToken, (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const query = `
    SELECT c.*, cr.read_status, cr.feedback, cr.feedback_photos, cr.updated_at as response_time, u.username as worker_name, u.full_name as worker_full_name
    FROM commands c
    INNER JOIN command_recipients cr ON c.id = cr.command_id
    INNER JOIN users u ON cr.worker_id = u.id
    WHERE cr.worker_id = ?
    ORDER BY c.created_at DESC
  `;

  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取指令的反馈详情（所有用户可见）
app.get('/api/commands/:id/details', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT c.*, cr.read_status, cr.feedback, cr.feedback_photos, cr.updated_at as response_time,
           u.username as worker_name, u.full_name as worker_full_name
    FROM commands c
    INNER JOIN command_recipients cr ON c.id = cr.command_id
    INNER JOIN users u ON cr.worker_id = u.id
    WHERE c.id = ?
  `;

  db.all(query, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    // 解析photos数组
    const result = rows.map(row => {
      let photos = [];
      if (row.feedback_photos) {
        try {
          photos = JSON.parse(row.feedback_photos);
        } catch (e) {
          photos = [];
        }
      }
      return { ...row, photos };
    });
    res.json({ success: true, data: result });
  });
});

// 按传感器ID查询指令（所有用户可见）
app.get('/api/commands', authenticateToken, (req, res) => {
  const { sensor_id } = req.query;

  let query = `
    SELECT c.*, cr.read_status, cr.feedback, cr.feedback_photos, cr.updated_at as response_time,
           u.username as worker_name, u.full_name as worker_full_name
    FROM commands c
    INNER JOIN command_recipients cr ON c.id = cr.command_id
    INNER JOIN users u ON cr.worker_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (sensor_id) {
    query += ` AND c.sensor_id = ?`;
    params.push(sensor_id);
  }

  query += ` ORDER BY c.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    // 解析photos数组
    const result = rows.map(row => {
      let photos = [];
      if (row.feedback_photos) {
        try {
          photos = JSON.parse(row.feedback_photos);
        } catch (e) {
          photos = [];
        }
      }
      return { ...row, photos };
    });
    res.json({ success: true, data: result });
  });
});

// 工人提交维修反馈（支持图片上传）
app.post('/api/commands/:id/feedback', authenticateToken, commandFeedbackPhotosUpload.array('photos', 5), (req, res) => {
  const { id } = req.params;
  const { feedback, update_sensor } = req.body;

  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  // 处理上传的图片
  let photoUrls = [];
  if (req.files && Array.isArray(req.files)) {
    photoUrls = req.files.map(file => `/uploads/${file.filename}`);
  }

  db.serialize(() => {
    // 获取指令信息（用于获取传感器ID）
    db.get(`SELECT sensor_id FROM commands WHERE id = ?`, [id], (err, command) => {
      if (err || !command) {
        return res.status(500).json({ success: false, message: '指令不存在' });
      }

      const updateQuery = `
        UPDATE command_recipients
        SET feedback = ?, feedback_photos = ?, read_status = 1, updated_at = ?
        WHERE command_id = ? AND worker_id = ?
      `;

      db.run(updateQuery, [feedback || '', JSON.stringify(photoUrls), new Date().toISOString(), id, req.user.id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '提交反馈失败' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ success: false, message: '指令不存在' });
        }

        // 更新工人状态为"空闲"
        db.run(`UPDATE users SET worker_status = '空闲' WHERE id = ?`, [req.user.id]);

        // 更新指令状态为"已完成"
        db.run(`UPDATE commands SET status = '已完成' WHERE id = ?`, [id]);

        // 如果请求要求更新传感器状态为"正常"
        if (update_sensor === 'true' && command.sensor_id) {
          db.run(`UPDATE sensors SET status = '正常' WHERE id = ?`, [command.sensor_id], (err) => {
            if (err) {
              console.error('更新传感器状态失败:', err.message);
            } else {
              console.log(`传感器 ${command.sensor_id} 状态已更新为正常`);
            }
          });
        }

        res.json({ success: true, message: '反馈提交成功', photos: photoUrls });
      });
    });
  });
});

// 管理员标记指令为已完成
app.put('/api/commands/:id/complete', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  db.run(`UPDATE commands SET status = '已完成' WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '更新失败' });
    }
    res.json({ success: true, message: '指令已标记为完成' });
  });
});

// 管理员重置所有维修记录和传感器状态
app.delete('/api/commands/reset', authenticateToken, (req, res) => {
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 删除所有指令记录
    db.run('DELETE FROM commands', function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ success: false, message: '删除指令记录失败' });
      }

      // 将所有工人状态重置为'空闲'
      db.run('UPDATE users SET worker_status = ? WHERE role = ?', ['空闲', '工人'], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ success: false, message: '重置工人状态失败' });
        }

        db.run('COMMIT');
        res.json({ success: true, message: '维修记录已重置，工人状态已恢复初始状态' });
      });
    });
  });
});

// 获取当前工人状态（用于前端轮询显示）
app.get('/api/workers/my-status', authenticateToken, (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const query = `SELECT worker_status FROM users WHERE id = ?`;
  db.get(query, [req.user.id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: { status: row.worker_status } });
  });
});

// 更新工人状态
app.put('/api/workers/my-status', authenticateToken, (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const { status } = req.body;

  if (!status || !['空闲', '工作中'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态值' });
  }

  const query = `UPDATE users SET worker_status = ? WHERE id = ?`;
  db.run(query, [status, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, message: '状态更新成功' });
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制（最大50MB）'
      });
    }
  }

  if (error.message === '只允许上传音频文件！') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    code: error.code || 0,
    message: error.message || '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`后端服务器正在运行，端口: ${PORT}`);
});

// 公开注册接口（允许前端注册，支持选择角色）
app.post('/api/register', async (req, res) => {
  // 公开注册允许选择角色（'工人' 或 '管理员'）——注意：如要在生产中限制管理员创建，请调整策略
  const { username, password, full_name, phone, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: '用户名、密码和角色为必填项' });
  }

  if (!['工人', '管理员'].includes(role)) {
    return res.status(400).json({ success: false, message: "非法角色，必须为 '工人' 或 '管理员'" });
  }

  const checkSql = `SELECT id FROM users WHERE username = ?`;
  db.get(checkSql, [username], async (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (row) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }

    try {
      const hashed = await bcrypt.hash(password, 10);
      const insertSql = `INSERT INTO users (username, password, role, full_name, phone) VALUES (?, ?, ?, ?, ?)`;
      db.run(insertSql, [username, hashed, role, full_name || null, phone || null], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '创建用户失败' });
        }

        const userId = this.lastID;

        // 生成 token 并返回（注册后可选自动登录）
        const accessToken = generateAccessToken({ id: userId, username, role });
        const refreshToken = generateRefreshToken({ id: userId, username, role });

        return res.status(201).json({
          success: true,
          message: '注册成功',
          data: {
            user: { id: userId, username, role, full_name: full_name || null, phone: phone || null },
            accessToken,
            refreshToken
          }
        });
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  });
});

// 检修信息管理模块 API

// 创建检修记录
app.post('/api/maintenance-records', authenticateToken, (req, res) => {
  const { title, content, sensors } = req.body;
  const userId = req.user.id;

  // 仅标题和内容为必填项，传感器可以为空
  if (!title || !content) {
    return res.status(400).json({ success: false, message: '标题和内容为必填项' });
  }

  // 开始事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    // 插入检修记录
    const insertRecordSql = `INSERT INTO maintenance_records (user_id, title, content) VALUES (?, ?, ?)`;
    db.run(insertRecordSql, [userId, title, content], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ success: false, message: '创建检修记录失败' });
      }

      const maintenanceId = this.lastID;

      // 如果没有传感器，直接提交事务
      if (!sensors || !Array.isArray(sensors) || sensors.length === 0) {
        return db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            return res.status(500).json({ success: false, message: '提交事务失败' });
          }
          return res.status(201).json({
            success: true,
            message: '检修记录创建成功',
            data: { id: maintenanceId }
          });
        });
      }

      // 插入关联的传感器
      const insertSensorSql = `INSERT INTO maintenance_sensors (maintenance_id, sensor_id, sensor_name) VALUES (?, ?, ?)`;
      let sensorCount = 0;
      let errorOccurred = false;

      sensors.forEach((sensor) => {
        db.run(insertSensorSql, [maintenanceId, sensor.id, sensor.name], (err) => {
          sensorCount++;
          if (err && !errorOccurred) {
            errorOccurred = true;
            db.run('ROLLBACK');
            return res.status(500).json({ success: false, message: '关联传感器失败' });
          }

          if (sensorCount === sensors.length && !errorOccurred) {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return res.status(500).json({ success: false, message: '提交事务失败' });
              }
              return res.status(201).json({
                success: true,
                message: '检修记录创建成功',
                data: { id: maintenanceId }
              });
            });
          }
        });
      });
    });
  });
});

// 上传检修记录照片
app.post('/api/maintenance-records/:id/photos', authenticateToken, maintenancePhotosUpload.array('photos', 10), (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的照片' });
  }

  // 验证检修记录是否存在且属于当前用户
  const checkSql = `SELECT * FROM maintenance_records WHERE id = ? AND user_id = ?`;
  db.get(checkSql, [maintenanceId, req.user.id], (err, record) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!record) {
      // 删除已上传的文件
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '检修记录不存在或无权限' });
    }

    // 插入照片记录
    const insertSql = `INSERT INTO maintenance_photos (maintenance_id, filename, original_name) VALUES (?, ?, ?)`;
    let photoCount = 0;
    let errorOccurred = false;

    files.forEach((file) => {
      db.run(insertSql, [maintenanceId, file.filename, file.originalname], (err) => {
        photoCount++;
        if (err && !errorOccurred) {
          errorOccurred = true;
          // 删除已上传的文件
          files.forEach(f => {
            try { fs.unlinkSync(f.path); } catch (e) {}
          });
          return res.status(500).json({ success: false, message: '保存照片记录失败' });
        }

        if (photoCount === files.length && !errorOccurred) {
          return res.status(200).json({
            success: true,
            message: '照片上传成功',
            data: files.map(file => ({
              filename: file.filename,
              originalName: file.originalname
            }))
          });
        }
      });
    });
  });
});

// 获取检修记录列表
app.get('/api/maintenance-records', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  const offset = (page - 1) * size;
  const status = req.query.status;
  const sensorId = req.query.sensor_id;

  let query = `SELECT mr.*, u.username FROM maintenance_records mr JOIN users u ON mr.user_id = u.id`;
  let countQuery = `SELECT COUNT(*) as total FROM maintenance_records mr`;
  const params = [];
  const countParams = [];

  // 根据用户角色过滤
  if (req.user.role !== '管理员') {
    query += ` WHERE mr.user_id = ?`;
    countQuery += ` WHERE user_id = ?`;
    params.push(req.user.id);
    countParams.push(req.user.id);
  }

  // 状态过滤
  if (status) {
    query += params.length > 0 ? ' AND' : ' WHERE';
    query += ` mr.status = ?`;
    params.push(status);

    countQuery += countParams.length > 0 ? ' AND' : ' WHERE';
    countQuery += ` status = ?`;
    countParams.push(status);
  }

  // 传感器过滤
  if (sensorId) {
    query += (params.length > 0 || status) ? ' AND' : ' WHERE';
    query += ` mr.id IN (SELECT maintenance_id FROM maintenance_sensors WHERE sensor_id = ?)`;
    params.push(sensorId);

    countQuery += (countParams.length > 0 || status) ? ' AND' : ' WHERE';
    countQuery += ` id IN (SELECT maintenance_id FROM maintenance_sensors WHERE sensor_id = ?)`;
    countParams.push(sensorId);
  }

  query += ` ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`;
  params.push(size, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    db.get(countQuery, countParams, (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      res.json({
        success: true,
        data: rows,
        total: result.total
      });
    });
  });
});

// 获取检修记录详情
app.get('/api/maintenance-records/:id', authenticateToken, (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);

  // 验证权限
  const checkSql = `SELECT * FROM maintenance_records WHERE id = ?`;
  db.get(checkSql, [maintenanceId], (err, record) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: '检修记录不存在' });
    }

    // 非管理员只能查看自己的记录
    if (req.user.role !== '管理员' && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限查看此记录' });
    }

    // 获取关联的传感器
    const sensorsSql = `SELECT * FROM maintenance_sensors WHERE maintenance_id = ?`;
    db.all(sensorsSql, [maintenanceId], (err, sensors) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      // 获取关联的照片
      const photosSql = `SELECT * FROM maintenance_photos WHERE maintenance_id = ?`;
      db.all(photosSql, [maintenanceId], (err, photos) => {
        if (err) {
          return res.status(500).json({ success: false, message: '服务器内部错误' });
        }

        res.json({
          success: true,
          data: {
            ...record,
            sensors,
            photos
          }
        });
      });
    });
  });
});

// 更新检修记录状态
app.put('/api/maintenance-records/:id/status', authenticateToken, (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['未读', '已读'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态' });
  }

  // 验证权限
  const checkSql = `SELECT * FROM maintenance_records WHERE id = ?`;
  db.get(checkSql, [maintenanceId], (err, record) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: '检修记录不存在' });
    }

    // 非管理员只能更新自己的记录
    if (req.user.role !== '管理员' && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限更新此记录' });
    }

    const updateSql = `UPDATE maintenance_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(updateSql, [status, maintenanceId], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新状态失败' });
      }

      res.json({ success: true, message: '状态更新成功' });
    });
  });
});

// 信息反馈与命令指示系统 API

// 创建命令指示
app.post('/api/commands', authenticateToken, (req, res) => {
  const { title, content, deadline } = req.body;
  const adminId = req.user.id;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: '标题和内容为必填项' });
  }

  // 验证用户是否为管理员
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '只有管理员可以创建命令' });
  }

  // 开始事务
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    // 插入命令
    const insertCommandSql = `INSERT INTO commands (admin_id, title, content, deadline) VALUES (?, ?, ?, ?)`;
    db.run(insertCommandSql, [adminId, title, content, deadline], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ success: false, message: '创建命令失败' });
      }

      const commandId = this.lastID;

      // 获取所有工人用户
      const getWorkersSql = `SELECT id FROM users WHERE role = '工人'`;
      db.all(getWorkersSql, [], (err, workers) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ success: false, message: '获取工人列表失败' });
        }

        // 插入命令接收者
        const insertRecipientSql = `INSERT INTO command_recipients (command_id, user_id, status) VALUES (?, ?, ?)`;
        let recipientCount = 0;
        let errorOccurred = false;

        if (workers.length === 0) {
          // 如果没有工人，直接提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: '提交事务失败' });
            }
            return res.status(201).json({
              success: true,
              message: '命令创建成功',
              data: { id: commandId }
            });
          });
        } else {
          workers.forEach((worker) => {
            db.run(insertRecipientSql, [commandId, worker.id, '未执行'], (err) => {
              recipientCount++;
              if (err && !errorOccurred) {
                errorOccurred = true;
                db.run('ROLLBACK');
                return res.status(500).json({ success: false, message: '添加接收者失败' });
              }

              if (recipientCount === workers.length && !errorOccurred) {
                db.run('COMMIT', (err) => {
                  if (err) {
                    return res.status(500).json({ success: false, message: '提交事务失败' });
                  }
                  return res.status(201).json({
                    success: true,
                    message: '命令创建成功',
                    data: { id: commandId }
                  });
                });
              }
            });
          });
        }
      });
    });
  });
});

// 上传命令附件
app.post('/api/commands/:id/attachments', authenticateToken, commandAttachmentsUpload.array('attachments', 5), (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的附件' });
  }

  // 验证命令是否存在且属于当前管理员
  const checkSql = `SELECT * FROM commands WHERE id = ? AND admin_id = ?`;
  db.get(checkSql, [commandId, req.user.id], (err, command) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!command) {
      // 删除已上传的文件
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    // 插入附件记录
    const insertSql = `INSERT INTO command_attachments (command_id, filename, original_name) VALUES (?, ?, ?)`;
    let attachmentCount = 0;
    let errorOccurred = false;

    files.forEach((file) => {
      db.run(insertSql, [commandId, file.filename, file.originalname], (err) => {
        attachmentCount++;
        if (err && !errorOccurred) {
          errorOccurred = true;
          // 删除已上传的文件
          files.forEach(f => {
            try { fs.unlinkSync(f.path); } catch (e) {}
          });
          return res.status(500).json({ success: false, message: '保存附件记录失败' });
        }

        if (attachmentCount === files.length && !errorOccurred) {
          return res.status(200).json({
            success: true,
            message: '附件上传成功',
            data: files.map(file => ({
              filename: file.filename,
              originalName: file.originalname
            }))
          });
        }
      });
    });
  });
});

// 获取命令列表
app.get('/api/commands', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  const offset = (page - 1) * size;
  const status = req.query.status;

  if (req.user.role === '管理员') {
    // 管理员查看所有命令
    let query = `SELECT c.*, u.username as admin_name FROM commands c JOIN users u ON c.admin_id = u.id`;
    let countQuery = `SELECT COUNT(*) as total FROM commands`;
    const params = [];
    const countParams = [];

    if (status) {
      query += ` WHERE c.status = ?`;
      countQuery += ` WHERE status = ?`;
      params.push(status);
      countParams.push(status);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(size, offset);

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '服务器内部错误' });
        }

        res.json({
          success: true,
          data: rows,
          total: result.total
        });
      });
    });
  } else {
    // 工人查看自己的命令
    let query = `SELECT c.*, u.username as admin_name FROM commands c 
                JOIN users u ON c.admin_id = u.id 
                JOIN command_recipients cr ON c.id = cr.command_id 
                WHERE cr.user_id = ?`;
    let countQuery = `SELECT COUNT(*) as total FROM commands c 
                    JOIN command_recipients cr ON c.id = cr.command_id 
                    WHERE cr.user_id = ?`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (status) {
      query += ` AND cr.status = ?`;
      countQuery += ` AND cr.status = ?`;
      params.push(status);
      countParams.push(status);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(size, offset);

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: '服务器内部错误' });
        }

        res.json({
          success: true,
          data: rows,
          total: result.total
        });
      });
    });
  }
});

// 获取命令详情
app.get('/api/commands/:id', authenticateToken, (req, res) => {
  const commandId = parseInt(req.params.id, 10);

  // 验证权限
  if (req.user.role === '管理员') {
    // 管理员可以查看所有命令
    const checkSql = `SELECT * FROM commands WHERE id = ?`;
    db.get(checkSql, [commandId], (err, command) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      if (!command) {
        return res.status(404).json({ success: false, message: '命令不存在' });
      }

      // 获取接收者
      const recipientsSql = `SELECT cr.*, u.username FROM command_recipients cr JOIN users u ON cr.user_id = u.id WHERE cr.command_id = ?`;
      db.all(recipientsSql, [commandId], (err, recipients) => {
        if (err) {
          return res.status(500).json({ success: false, message: '服务器内部错误' });
        }

        // 获取附件
        const attachmentsSql = `SELECT * FROM command_attachments WHERE command_id = ?`;
        db.all(attachmentsSql, [commandId], (err, attachments) => {
          if (err) {
            return res.status(500).json({ success: false, message: '服务器内部错误' });
          }

          // 获取反馈
          const feedbackSql = `SELECT cf.*, u.username FROM command_feedbacks cf JOIN users u ON cf.user_id = u.id WHERE cf.command_id = ?`;
          db.all(feedbackSql, [commandId], (err, feedbacks) => {
            if (err) {
              return res.status(500).json({ success: false, message: '服务器内部错误' });
            }

            // 获取反馈照片
            const feedbackPhotosSql = `SELECT * FROM command_feedback_photos WHERE feedback_id IN (SELECT id FROM command_feedbacks WHERE command_id = ?)`;
            db.all(feedbackPhotosSql, [commandId], (err, feedbackPhotos) => {
              if (err) {
                return res.status(500).json({ success: false, message: '服务器内部错误' });
              }

              // 组织反馈照片
              const feedbackPhotosMap = {};
              feedbackPhotos.forEach(photo => {
                if (!feedbackPhotosMap[photo.feedback_id]) {
                  feedbackPhotosMap[photo.feedback_id] = [];
                }
                feedbackPhotosMap[photo.feedback_id].push(photo);
              });

              const feedbacksWithPhotos = feedbacks.map(feedback => ({
                ...feedback,
                photos: feedbackPhotosMap[feedback.id] || []
              }));

              res.json({
                success: true,
                data: {
                  ...command,
                  recipients,
                  attachments,
                  feedbacks: feedbacksWithPhotos
                }
              });
            });
          });
        });
      });
    });
  } else {
    // 工人只能查看自己的命令
    const checkSql = `SELECT c.* FROM commands c JOIN command_recipients cr ON c.id = cr.command_id WHERE c.id = ? AND cr.user_id = ?`;
    db.get(checkSql, [commandId, req.user.id], (err, command) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      if (!command) {
        return res.status(404).json({ success: false, message: '命令不存在或无权限' });
      }

      // 获取接收者状态
      const recipientSql = `SELECT * FROM command_recipients WHERE command_id = ? AND user_id = ?`;
      db.get(recipientSql, [commandId, req.user.id], (err, recipient) => {
        if (err) {
          return res.status(500).json({ success: false, message: '服务器内部错误' });
        }

        // 获取附件
        const attachmentsSql = `SELECT * FROM command_attachments WHERE command_id = ?`;
        db.all(attachmentsSql, [commandId], (err, attachments) => {
          if (err) {
            return res.status(500).json({ success: false, message: '服务器内部错误' });
          }

          // 获取自己的反馈
          const feedbackSql = `SELECT * FROM command_feedbacks WHERE command_id = ? AND user_id = ?`;
          db.get(feedbackSql, [commandId, req.user.id], (err, feedback) => {
            if (err) {
              return res.status(500).json({ success: false, message: '服务器内部错误' });
            }

            // 获取反馈照片
            if (feedback) {
              const feedbackPhotosSql = `SELECT * FROM command_feedback_photos WHERE feedback_id = ?`;
              db.all(feedbackPhotosSql, [feedback.id], (err, feedbackPhotos) => {
                if (err) {
                  return res.status(500).json({ success: false, message: '服务器内部错误' });
                }

                res.json({
                  success: true,
                  data: {
                    ...command,
                    recipient_status: recipient.status,
                    attachments,
                    feedback: feedback ? {
                      ...feedback,
                      photos: feedbackPhotos
                    } : null
                  }
                });
              });
            } else {
              res.json({
                success: true,
                data: {
                  ...command,
                  recipient_status: recipient.status,
                  attachments,
                  feedback: null
                }
              });
            }
          });
        });
      });
    });
  }
});

// 更新命令状态
app.put('/api/commands/:id/status', authenticateToken, (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['未执行', '已执行'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态' });
  }

  // 验证命令是否存在且用户是接收者
  const checkSql = `SELECT * FROM command_recipients WHERE command_id = ? AND user_id = ?`;
  db.get(checkSql, [commandId, req.user.id], (err, recipient) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!recipient) {
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    // 更新状态
    let updateSql = `UPDATE command_recipients SET status = ?`;
    const params = [status];

    // 如果状态为已执行，记录完成时间
    if (status === '已执行') {
      updateSql += `, completed_at = CURRENT_TIMESTAMP`;
    }

    // 如果状态从未执行变为已执行，记录阅读时间
    if (status === '已执行' && !recipient.read_at) {
      updateSql += `, read_at = CURRENT_TIMESTAMP`;
    }

    updateSql += ` WHERE command_id = ? AND user_id = ?`;
    params.push(commandId, req.user.id);

    db.run(updateSql, params, function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新状态失败' });
      }

      res.json({ success: true, message: '状态更新成功' });
    });
  });
});

// 提交命令反馈
app.post('/api/commands/:id/feedback', authenticateToken, (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const { content } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ success: false, message: '反馈内容为必填项' });
  }

  // 验证命令是否存在且用户是接收者
  const checkSql = `SELECT * FROM command_recipients WHERE command_id = ? AND user_id = ?`;
  db.get(checkSql, [commandId, userId], (err, recipient) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!recipient) {
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    // 检查是否已提交反馈
    const checkFeedbackSql = `SELECT * FROM command_feedbacks WHERE command_id = ? AND user_id = ?`;
    db.get(checkFeedbackSql, [commandId, userId], (err, existingFeedback) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器内部错误' });
      }

      if (existingFeedback) {
        return res.status(400).json({ success: false, message: '已提交过反馈' });
      }

      // 插入反馈
      const insertSql = `INSERT INTO command_feedbacks (command_id, user_id, content) VALUES (?, ?, ?)`;
      db.run(insertSql, [commandId, userId, content], function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '提交反馈失败' });
        }

        res.status(201).json({
          success: true,
          message: '反馈提交成功',
          data: { id: this.lastID }
        });
      });
    });
  });
});

// 上传命令反馈照片
app.post('/api/commands/:id/feedback/photos', authenticateToken, commandFeedbackPhotosUpload.array('photos', 10), (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const files = req.files;
  const userId = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的照片' });
  }

  // 获取反馈ID
  const feedbackSql = `SELECT id FROM command_feedbacks WHERE command_id = ? AND user_id = ?`;
  db.get(feedbackSql, [commandId, userId], (err, feedback) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器内部错误' });
    }

    if (!feedback) {
      // 删除已上传的文件
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }

    // 插入照片记录
    const insertSql = `INSERT INTO command_feedback_photos (feedback_id, filename, original_name) VALUES (?, ?, ?)`;
    let photoCount = 0;
    let errorOccurred = false;

    files.forEach((file) => {
      db.run(insertSql, [feedback.id, file.filename, file.originalname], (err) => {
        photoCount++;
        if (err && !errorOccurred) {
          errorOccurred = true;
          // 删除已上传的文件
          files.forEach(f => {
            try { fs.unlinkSync(f.path); } catch (e) {}
          });
          return res.status(500).json({ success: false, message: '保存照片记录失败' });
        }

        if (photoCount === files.length && !errorOccurred) {
          return res.status(200).json({
            success: true,
            message: '照片上传成功',
            data: files.map(file => ({
              filename: file.filename,
              originalName: file.originalname
            }))
          });
        }
      });
    });
  });
});