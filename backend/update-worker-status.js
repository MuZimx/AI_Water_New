const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db/users.db');
const db = new sqlite3.Database(dbPath);

console.log('更新用户123的状态为"工作中"...\n');

// 更新用户状态
db.run("UPDATE users SET worker_status = '工作中' WHERE username = '123'", function(err) {
  if (err) {
    console.error('更新失败:', err);
    db.close();
    process.exit(1);
  }

  if (this.changes === 0) {
    console.log('未找到用户123');
  } else {
    console.log(`✓ 成功更新 ${this.changes} 条记录`);
  }

  // 验证更新结果
  db.get("SELECT id, username, role, worker_status FROM users WHERE username = '123'", (err, row) => {
    if (err) {
      console.error('查询失败:', err);
    } else if (row) {
      console.log('\n更新后的用户信息:');
      console.log(JSON.stringify(row, null, 2));
    } else {
      console.log('\n用户123不存在');
    }

    db.close();
  });
});
