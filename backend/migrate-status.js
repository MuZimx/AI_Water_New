const path = require('path');
const Database = require('better-sqlite3');

async function migrateStatus() {
  const dbPath = path.join(__dirname, 'db', 'users.db');
  const db = new Database(dbPath);

  try {
    console.log('开始迁移命令状态...');

    // 查询所有"已完成"状态的记录
    const rows = db.prepare('SELECT * FROM command_recipients WHERE status = ?').all('已完成');
    console.log(`找到 ${rows.length} 条"已完成"状态的记录`);

    if (rows.length > 0) {
      const result = db.prepare('UPDATE command_recipients SET status = ? WHERE status = ?').run('已完成');
      console.log(`成功更新 ${result.changes} 条记录`);
    } else {
      console.log('没有需要迁移的记录');
    }

    // 验证迁移结果
    const afterMigrate = db.prepare('SELECT * FROM command_recipients').all();
    const statusCounts = afterMigrate.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n迁移后的状态统计:');
    console.log(statusCounts);

    console.log('\n迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrateStatus();
