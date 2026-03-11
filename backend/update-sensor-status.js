const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'db', 'users.db');
const db = new sqlite3.Database(dbPath);

const sensorUpdates = [
  { id: 5, name: '传感器-雨花台区-005', status: '严重漏水' },
  { id: 6, name: '传感器-栖霞区-006', status: '传感器损坏' },
  { id: 8, name: '传感器-江宁区-008', status: '轻微漏水' },
  { id: 10, name: '传感器-溧水区-010', status: '严重漏水' },
  { id: 11, name: '传感器-高淳区-011', status: '轻微漏水' },
  { id: 13, name: '传感器-秦淮区-013', status: '传感器损坏' }
];

let updatedCount = 0;

db.serialize(() => {
  sensorUpdates.forEach(sensor => {
    db.run('UPDATE sensors SET status = ? WHERE id = ?', [sensor.status, sensor.id], function(err) {
      if (err) {
        console.error('更新传感器状态失败:', sensor.name, err.message);
      } else if (this.changes > 0) {
        console.log(`已更新 ${sensor.name} 状态为: ${sensor.status}`);
        updatedCount++;
      } else {
        console.log('未找到传感器:', sensor.name);
      }
    });
  });

  setTimeout(() => {
    console.log('\n更新完成！');
    console.log('共更新传感器状态: ' + updatedCount + '个');
    db.close();
  }, 500);
});
