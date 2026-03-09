// Backend SQLite 迁移脚本：在 Node 环境下执行 SQL 文件
// 使用方法（PowerShell）:
// npm install sqlite3
// node db/migrate.js

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const SQL_FILE = path.join(__dirname, 'migrations', '001_init.sql');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

if (!fs.existsSync(SQL_FILE)) {
  console.error('未找到 SQL 文件：', SQL_FILE);
  process.exit(1);
}

const sql = fs.readFileSync(SQL_FILE, 'utf8');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('打开数据库失败', err);
    process.exit(1);
  }

  console.log('数据库打开：', DB_PATH);

  db.exec(sql, (err) => {
    if (err) {
      console.error('执行迁移失败：', err);
      process.exit(1);
    }
    console.log('迁移执行成功');

    db.close((err) => {
      if (err) console.error('关闭数据库失败', err);
      else console.log('数据库已关闭');
    });
  });
});
