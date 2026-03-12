const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PythonShell } = require('python-shell');
const chokidar = require('chokidar');
const { prisma } = require('./db/prisma');
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

async function initializeDefaultSensors() {
  try {
    const count = await prisma.sensors.count();
    if (count > 0) return;

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

    await prisma.$transaction(
      defaultSensors.map(sensor =>
        prisma.sensors.upsert({
          where: { id: sensor.id },
          update: {},
          create: sensor
        })
      )
    );
    console.log('已插入默认传感器数据');
  } catch (error) {
    if (error && error.code === 'P2021') {
      console.error('初始化默认传感器数据失败: 数据表不存在，请先执行 npm run prisma:sync');
      return;
    }
    console.error('初始化默认传感器数据失败:', error.message);
  }
}

initializeDefaultSensors();

// 检查是否需要初始化数据库
app.get('/api/init-status', async (req, res) => {
  try {
    const count = await prisma.users.count();
    res.json({
      success: true,
      initialized: count > 0
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

function getAudioID(filename) {
  return prisma.audio_files.findFirst({
    where: { filename },
    select: { id: true }
  }).then(row => row ? row.id : null);
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

  try {
    const count = await prisma.users.count();
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: '系统已初始化，无法再次初始化'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        username,
        password: hashedPassword,
        role: '管理员'
      }
    });

    res.status(201).json({
      success: true,
      message: '系统初始化成功',
      userId: user.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 登录接口
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码不能为空'
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const accessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role || '工人'
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      username: user.username
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取用户列表接口 - 需要认证
app.get('/api/users', authenticateToken, async (req, res) => {
  // 仅允许管理员查看所有用户列表
  if (!req.user || req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    const rows = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        full_name: true,
        phone: true,
        created_at: true
      },
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取当前用户信息接口 - 需要认证
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const row = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        full_name: true,
        phone: true,
        created_at: true
      }
    });

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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 删除用户接口 - 仅管理员可删除，且只能删除角色为 工人 的用户
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
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

  try {
    const row = await prisma.users.findUnique({
      where: { id: targetId },
      select: { id: true, role: true }
    });

    if (!row) return res.status(404).json({ success: false, message: '用户不存在' });

    if (row.role !== '工人') {
      return res.status(403).json({ success: false, message: '只能删除工人用户' });
    }

    await prisma.users.delete({ where: { id: targetId } });
    return res.json({ success: true, message: '删除成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取音频文件列表接口 - 需要认证
app.get('/api/audio-files', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  const offset = (page - 1) * size;

  try {
    const [rows, total] = await Promise.all([
      prisma.audio_files.findMany({
        orderBy: { id: 'desc' },
        skip: offset,
        take: size
      }),
      prisma.audio_files.count()
    ]);

    res.json({
      success: true,
      data: rows,
      total
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 删除音频文件接口 - 需要认证
app.delete('/api/audio-files/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.audio_files.delete({ where: { id: parseInt(id, 10) } });
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    if (error && error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
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
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '旧密码错误'
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({
      success: true,
      message: '密码更新成功'
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
      PythonShell.run('predict.py', options).then(async (results) => {
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
        try {
          await prisma.audio_files.update({
            where: { id: audioFile.id },
            data: {
              risk_level: prediction.risk_level,
              confidence: prediction.confidence,
              detect_time: new Date()
            }
          });

          if (prediction.risk_level === '轻微漏水' || prediction.risk_level === '严重漏水') {
            const row = await prisma.audio_files.findUnique({
              where: { id: audioFile.id },
              select: { sensor_id: true }
            });

            if (row && row.sensor_id) {
              const newStatus = prediction.risk_level === '严重漏水' ? '严重漏水' : '轻微漏水';
              await prisma.sensors.update({
                where: { id: row.sensor_id },
                data: {
                  status: newStatus,
                  last_audio_time: new Date()
                }
              });
              console.log(`传感器 ${row.sensor_id} 状态已更新为 ${newStatus}`);
            }
          }

          processingStatus.set(path.basename(file), {
            status: 'completed',
            progress: 100,
            message: '处理完成',
            result: prediction
          });

          console.log(`音频文件 ${audioFile.filename} 处理完成:`, prediction);
          resolve(prediction);
        } catch (err) {
          processingStatus.set(path.basename(file), {
            status: 'error',
            progress: 0,
            message: '更新数据库失败'
          });
          console.error('更新数据库失败:', err);
          return reject(err);
        }
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
app.post('/api/upload-audio', authenticateToken, upload.single('audio'), async (req, res) => {
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

  try {
    const created = await prisma.audio_files.create({
      data: {
        filename: req.file.filename,
        original_name: req.file.originalname || '',
        mimetype: req.file.mimetype || 'audio',
        size: req.file.size || 0,
        user_id: userId,
        sensor_id: sensorId ? parseInt(sensorId, 10) : null,
        risk_level: '未检测',
        confidence: 0.0
      }
    });

    processAudioFile(filePath, created.id).catch(error => {
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
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    console.log('保存文件信息到数据库失败:', err);
    return res.status(500).json({
      success: false,
      message: '文件信息保存失败'
    });
  }
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
app.get('/api/sensors/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const sensor = await prisma.sensors.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        last_audio_time: true
      }
    });
    if (!sensor) {
      return res.status(404).json({ success: false, message: '传感器不存在' });
    }
    res.json({ success: true, data: sensor });
  } catch (error) {
    return res.status(500).json({ success: false, message: '查询传感器失败' });
  }
});

app.get('/api/sensors', async (req, res) => {
  try {
    const sensors = await prisma.sensors.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        status: true,
        last_audio_time: true
      }
    });

    const assignedRows = await prisma.commands.findMany({
      where: {
        sensor_id: { not: null },
        status: { in: ['已发布', '进行中'] }
      },
      select: { sensor_id: true }
    });
    const assignedSensorIds = new Set(assignedRows.map(r => r.sensor_id).filter(Boolean));
    sensors.forEach(sensor => {
      sensor.assigned = assignedSensorIds.has(sensor.id);
    });

    res.json({ success: true, data: sensors });
  } catch (error) {
    return res.status(500).json({ success: false, message: '查询传感器失败' });
  }
});

// 更新传感器状态接口
app.put('/api/sensors/:id/status', authenticateToken, async (req, res) => {
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

  try {
    await prisma.sensors.update({
      where: { id: parseInt(id, 10) },
      data: { status }
    });
    res.json({ success: true, message: '传感器状态已更新' });
  } catch (error) {
    if (error && error.code === 'P2025') {
      return res.status(404).json({ success: false, message: '传感器不存在' });
    }
    return res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 获取工人列表接口（供管理员派工使用）
app.get('/api/workers', authenticateToken, async (req, res) => {
  // 验证管理员权限
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    const rows = await prisma.users.findMany({
      where: { role: '工人' },
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        role: true,
        worker_status: true
      }
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 创建派工指令接口
app.post('/api/commands', authenticateToken, async (req, res) => {
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const command = await tx.commands.create({
        data: {
          command_number: commandNumber,
          admin_id: req.user.id,
          title,
          content,
          sensor_id: sensor_id ? parseInt(sensor_id, 10) : null,
          deadline: deadline ? new Date(deadline) : null,
          status: '已发布'
        }
      });

      await tx.command_recipients.createMany({
        data: worker_ids.map(userId => ({
          command_id: command.id,
          user_id: userId,
          status: '未执行'
        }))
      });

      await tx.users.updateMany({
        where: { id: { in: worker_ids } },
        data: { worker_status: '工作中' }
      });

      return command;
    });

    res.json({
      success: true,
      message: '派工成功',
      data: { id: result.id, commandId: result.id, commandNumber }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '创建指令失败' });
  }
});

// 获取工人收到的派工指令
app.get('/api/commands/received', authenticateToken, async (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    const rows = await prisma.command_recipients.findMany({
      where: { user_id: req.user.id },
      include: {
        commands: true,
        users: {
          select: { username: true, full_name: true }
        }
      },
      orderBy: { commands: { created_at: 'desc' } }
    });

    const data = rows.map(item => ({
      ...item.commands,
      recipient_status: item.status,
      read_at: item.read_at,
      completed_at: item.completed_at,
      worker_name: item.users.username,
      worker_full_name: item.users.full_name
    }));

    res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取指令的反馈详情（所有用户可见）
app.get('/api/commands/:id/details', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const rows = await prisma.command_recipients.findMany({
      where: { command_id: parseInt(id, 10) },
      include: {
        commands: true,
        users: {
          select: { username: true, full_name: true }
        }
      }
    });

    const data = rows.map(item => ({
      ...item.commands,
      recipient_status: item.status,
      read_at: item.read_at,
      completed_at: item.completed_at,
      worker_name: item.users.username,
      worker_full_name: item.users.full_name
    }));

    res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 按传感器ID或状态查询指令（所有用户可见）
app.get('/api/commands', authenticateToken, async (req, res) => {
  const { sensor_id, status } = req.query;

  try {
    const where = {
      ...(sensor_id ? { commands: { sensor_id: parseInt(sensor_id, 10) } } : {}),
      ...(status ? { status } : {})
    };
    const rows = await prisma.command_recipients.findMany({
      where,
      include: {
        commands: true,
        users: {
          select: { username: true, full_name: true }
        }
      },
      orderBy: { commands: { created_at: 'desc' } }
    });

    const data = rows.map(item => ({
      ...item.commands,
      recipient_status: item.status,
      read_at: item.read_at,
      completed_at: item.completed_at,
      worker_name: item.users.username,
      worker_full_name: item.users.full_name
    }));

    res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 工人提交维修反馈（支持图片上传）
app.post('/api/commands/:id/feedback', authenticateToken, commandFeedbackPhotosUpload.array('photos', 5), async (req, res) => {
  const { id } = req.params;
  const { feedback, content, update_sensor } = req.body;
  const feedbackText = (feedback || content || '').trim();

  console.log('提交反馈 - Command ID:', id);
  console.log('提交反馈 - 用户:', req.user);
  console.log('提交反馈 - 反馈内容:', feedbackText);
  console.log('提交反馈 - 更新传感器:', update_sensor);
  console.log('提交反馈 - 上传文件数量:', req.files ? req.files.length : 0);

  if (req.user.role !== '工人') {
    console.error('权限不足: 用户角色不是工人');
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  // 处理上传的图片
  let photoUrls = [];
  if (req.files && Array.isArray(req.files)) {
    photoUrls = req.files.map(file => `/uploads/${file.filename}`);
  }

  try {
    const commandId = parseInt(id, 10);
    let feedbackId = null;
    await prisma.$transaction(async (tx) => {
      const command = await tx.commands.findUnique({
        where: { id: commandId },
        select: { sensor_id: true }
      });
      if (!command) {
        throw new Error('NOT_FOUND');
      }

      const recipient = await tx.command_recipients.findFirst({
        where: { command_id: commandId, user_id: req.user.id }
      });
      if (!recipient) {
        throw new Error('NOT_FOUND');
      }

      await tx.command_recipients.update({
        where: { id: recipient.id },
        data: {
          status: '已完成',
          completed_at: new Date()
        }
      });

      await tx.users.update({ where: { id: req.user.id }, data: { worker_status: '空闲' } });
      await tx.commands.update({ where: { id: commandId }, data: { status: '已完成' } });

      if (feedbackText) {
        const existingFeedback = await tx.command_feedbacks.findFirst({
          where: { command_id: commandId, user_id: req.user.id },
          select: { id: true }
        });

        if (existingFeedback) {
          feedbackId = existingFeedback.id;
        } else {
          const createdFeedback = await tx.command_feedbacks.create({
            data: {
              command_id: commandId,
              user_id: req.user.id,
              content: feedbackText
            }
          });
          feedbackId = createdFeedback.id;
        }

        if (feedbackId && req.files && Array.isArray(req.files) && req.files.length > 0) {
          await tx.command_feedback_photos.createMany({
            data: req.files.map(file => ({
              feedback_id: feedbackId,
              filename: file.filename,
              original_name: file.originalname
            }))
          });
        }
      }

      if (update_sensor === 'true' && command.sensor_id) {
        await tx.sensors.update({ where: { id: command.sensor_id }, data: { status: '正常' } });
      }
    });

    console.log('反馈提交成功, feedbackId:', feedbackId);
    res.json({ success: true, message: '反馈提交成功', photos: photoUrls, feedbackId, id: feedbackId });
  } catch (error) {
    console.error('提交反馈失败:', error);
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: '指令不存在或无权访问' });
    }
    return res.status(500).json({ success: false, message: '提交反馈失败，请稍后重试' });
  }
});

// 管理员标记指令为已完成
app.put('/api/commands/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    await prisma.commands.update({
      where: { id: parseInt(id, 10) },
      data: { status: '已完成' }
    });
    res.json({ success: true, message: '指令已标记为完成' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 管理员重置所有维修记录和传感器状态
app.delete('/api/commands/reset', authenticateToken, async (req, res) => {
  if (req.user.role !== '管理员') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 删除检修记录相关的照片和传感器关联
      await tx.maintenance_photos.deleteMany({});
      await tx.maintenance_sensors.deleteMany({});
      await tx.maintenance_records.deleteMany({});

      // 删除命令相关的数据
      await tx.command_recipients.deleteMany({});
      await tx.command_feedback_photos.deleteMany({});
      await tx.command_feedbacks.deleteMany({});
      await tx.command_attachments.deleteMany({});
      await tx.commands.deleteMany({});

      // 将所有工人状态重置为"空闲"
      await tx.users.updateMany({
        where: { role: '工人' },
        data: { worker_status: '空闲' }
      });
    });
    res.json({ success: true, message: '维修记录已重置，工人状态已恢复初始状态' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '重置工人状态失败' });
  }
});

// 获取当前工人状态（用于前端轮询显示）
app.get('/api/workers/my-status', authenticateToken, async (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  try {
    const row = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: { worker_status: true }
    });
    if (!row) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: { status: row.worker_status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 更新工人状态
app.put('/api/workers/my-status', authenticateToken, async (req, res) => {
  if (req.user.role !== '工人') {
    return res.status(403).json({ success: false, message: '权限不足' });
  }

  const { status } = req.body;

  if (!status || !['空闲', '工作中'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态值' });
  }

  try {
    const row = await prisma.users.findUnique({ where: { id: req.user.id }, select: { id: true } });
    if (!row) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    await prisma.users.update({
      where: { id: req.user.id },
      data: { worker_status: status }
    });
    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
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

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        username,
        password: hashed,
        role,
        full_name: full_name || null,
        phone: phone || null
      }
    });

    const accessToken = generateAccessToken({ id: user.id, username, role });
    const refreshToken = generateRefreshToken({ id: user.id, username, role });

    return res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: { id: user.id, username, role, full_name: full_name || null, phone: phone || null },
        accessToken,
        refreshToken
      }
    });
  } catch (e) {
    if (e && e.code === 'P2002') {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 检修信息管理模块 API

// 创建检修记录
app.post('/api/maintenance-records', authenticateToken, async (req, res) => {
  const { title, content, sensors } = req.body;
  const userId = req.user.id;

  // 仅标题和内容为必填项，传感器可以为空
  if (!title || !content) {
    return res.status(400).json({ success: false, message: '标题和内容为必填项' });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenance_records.create({
        data: { user_id: userId, title, content }
      });

      if (Array.isArray(sensors) && sensors.length > 0) {
        await tx.maintenance_sensors.createMany({
          data: sensors.map(sensor => ({
            maintenance_id: record.id,
            sensor_id: sensor.id,
            sensor_name: sensor.name
          }))
        });
      }

      return record;
    });

    return res.status(201).json({
      success: true,
      message: '检修记录创建成功',
      data: { id: created.id }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '创建检修记录失败' });
  }
});

// 上传检修记录照片
app.post('/api/maintenance-records/:id/photos', authenticateToken, maintenancePhotosUpload.array('photos', 10), async (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的照片' });
  }

  try {
    const record = await prisma.maintenance_records.findFirst({
      where: { id: maintenanceId, user_id: req.user.id },
      select: { id: true }
    });

    if (!record) {
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '检修记录不存在或无权限' });
    }

    await prisma.maintenance_photos.createMany({
      data: files.map(file => ({
        maintenance_id: maintenanceId,
        filename: file.filename,
        original_name: file.originalname
      }))
    });

    return res.status(200).json({
      success: true,
      message: '照片上传成功',
      data: files.map(file => ({
        filename: file.filename,
        originalName: file.originalname
      }))
    });
  } catch (error) {
    files.forEach(file => {
      try { fs.unlinkSync(file.path); } catch (e) {}
    });
    return res.status(500).json({ success: false, message: '保存照片记录失败' });
  }
});

// 获取检修记录列表
app.get('/api/maintenance-records', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;
  const offset = (page - 1) * size;
  const status = req.query.status;
  const sensorId = req.query.sensor_id;

  const where = {
    ...(req.user.role !== '管理员' ? { user_id: req.user.id } : {}),
    ...(status ? { status } : {}),
    ...(sensorId ? { maintenance_sensors: { some: { sensor_id: parseInt(sensorId, 10) } } } : {})
  };

  try {
    const [rows, total] = await Promise.all([
      prisma.maintenance_records.findMany({
        where,
        include: {
          users: { select: { username: true } }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: size
      }),
      prisma.maintenance_records.count({ where })
    ]);

    const data = rows.map(row => ({
      ...row,
      username: row.users?.username
    }));

    res.json({
      success: true,
      data,
      total
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取检修记录详情
app.get('/api/maintenance-records/:id', authenticateToken, async (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);

  try {
    const record = await prisma.maintenance_records.findUnique({
      where: { id: maintenanceId },
      include: {
        maintenance_sensors: true,
        maintenance_photos: true
      }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: '检修记录不存在' });
    }

    if (req.user.role !== '管理员' && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限查看此记录' });
    }

    res.json({
      success: true,
      data: {
        ...record,
        sensors: record.maintenance_sensors,
        photos: record.maintenance_photos
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 更新检修记录状态
app.put('/api/maintenance-records/:id/status', authenticateToken, async (req, res) => {
  const maintenanceId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['未读', '已读'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态' });
  }

  try {
    const record = await prisma.maintenance_records.findUnique({
      where: { id: maintenanceId },
      select: { id: true, user_id: true }
    });

    if (!record) {
      return res.status(404).json({ success: false, message: '检修记录不存在' });
    }

    if (req.user.role !== '管理员' && record.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限更新此记录' });
    }

    await prisma.maintenance_records.update({
      where: { id: maintenanceId },
      data: {
        status,
        updated_at: new Date()
      }
    });

    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '更新状态失败' });
  }
});

// 信息反馈与命令指示系统 API

// 上传命令附件
app.post('/api/commands/:id/attachments', authenticateToken, commandAttachmentsUpload.array('attachments', 5), async (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const files = req.files;

  if (!Number.isInteger(commandId) || commandId <= 0) {
    if (files && Array.isArray(files)) {
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
    }
    return res.status(400).json({ success: false, message: '无效的命令ID' });
  }

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的附件' });
  }

  try {
    const command = await prisma.commands.findFirst({
      where: { id: commandId, admin_id: req.user.id },
      select: { id: true }
    });

    if (!command) {
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    await prisma.command_attachments.createMany({
      data: files.map(file => ({
        command_id: commandId,
        filename: file.filename,
        original_name: file.originalname
      }))
    });

    return res.status(200).json({
      success: true,
      message: '附件上传成功',
      data: files.map(file => ({
        filename: file.filename,
        originalName: file.originalname
      }))
    });
  } catch (error) {
    files.forEach(file => {
      try { fs.unlinkSync(file.path); } catch (e) {}
    });
    console.error('保存附件记录失败:', error);
    return res.status(500).json({ success: false, message: '保存附件记录失败' });
  }
});

// 获取命令详情
app.get('/api/commands/:id', authenticateToken, async (req, res) => {
  const commandId = parseInt(req.params.id, 10);

  try {
    if (req.user.role === '管理员') {
      const command = await prisma.commands.findUnique({
        where: { id: commandId },
        include: {
          command_recipients: {
            include: { users: { select: { username: true } } }
          },
          command_attachments: true,
          command_feedbacks: {
            include: {
              users: { select: { username: true } },
              command_feedback_photos: true
            }
          }
        }
      });

      if (!command) {
        return res.status(404).json({ success: false, message: '命令不存在' });
      }

      const recipients = command.command_recipients.map(r => ({
        id: r.id,
        command_id: r.command_id,
        user_id: r.user_id,
        status: r.status,
        read_at: r.read_at,
        completed_at: r.completed_at,
        username: r.users?.username
      }));

      const feedbacks = command.command_feedbacks.map(f => ({
        id: f.id,
        command_id: f.command_id,
        user_id: f.user_id,
        content: f.content,
        created_at: f.created_at,
        username: f.users?.username,
        photos: f.command_feedback_photos
      }));

      return res.json({
        success: true,
        data: {
          ...command,
          recipients,
          attachments: command.command_attachments,
          feedbacks
        }
      });
    }

    const recipient = await prisma.command_recipients.findFirst({
      where: { command_id: commandId, user_id: req.user.id },
      include: {
        commands: true
      }
    });

    if (!recipient || !recipient.commands) {
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    const [attachments, feedback] = await Promise.all([
      prisma.command_attachments.findMany({ where: { command_id: commandId } }),
      prisma.command_feedbacks.findFirst({
        where: { command_id: commandId, user_id: req.user.id },
        include: { command_feedback_photos: true }
      })
    ]);

    return res.json({
      success: true,
      data: {
        ...recipient.commands,
        recipient_status: recipient.status,
        attachments,
        feedback: feedback ? {
          ...feedback,
          photos: feedback.command_feedback_photos
        } : null
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 更新命令状态
app.put('/api/commands/:id/status', authenticateToken, async (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!status || !['未执行', '已执行'].includes(status)) {
    return res.status(400).json({ success: false, message: '无效的状态' });
  }

  try {
    const recipient = await prisma.command_recipients.findFirst({
      where: { command_id: commandId, user_id: req.user.id }
    });

    if (!recipient) {
      return res.status(404).json({ success: false, message: '命令不存在或无权限' });
    }

    await prisma.command_recipients.update({
      where: { id: recipient.id },
      data: {
        status,
        ...(status === '已执行' ? { completed_at: new Date() } : {}),
        ...(status === '已执行' && !recipient.read_at ? { read_at: new Date() } : {})
      }
    });

    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    return res.status(500).json({ success: false, message: '更新状态失败' });
  }
});

// 上传命令反馈照片
app.post('/api/commands/:id/feedback/photos', authenticateToken, commandFeedbackPhotosUpload.array('photos', 10), async (req, res) => {
  const commandId = parseInt(req.params.id, 10);
  const files = req.files;
  const userId = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: '请选择要上传的照片' });
  }

  try {
    const feedback = await prisma.command_feedbacks.findFirst({
      where: { command_id: commandId, user_id: userId },
      select: { id: true }
    });

    if (!feedback) {
      files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
      return res.status(404).json({ success: false, message: '反馈不存在' });
    }

    await prisma.command_feedback_photos.createMany({
      data: files.map(file => ({
        feedback_id: feedback.id,
        filename: file.filename,
        original_name: file.originalname
      }))
    });

    return res.status(200).json({
      success: true,
      message: '照片上传成功',
      data: files.map(file => ({
        filename: file.filename,
        originalName: file.originalname
      }))
    });
  } catch (error) {
    files.forEach(file => {
      try { fs.unlinkSync(file.path); } catch (e) {}
    });
    return res.status(500).json({ success: false, message: '保存照片记录失败' });
  }
});