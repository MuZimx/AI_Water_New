const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'db', 'users.db');
const db = new sqlite3.Database(dbPath);

const newSensors = [
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

let addedCount = 0;
let skippedCount = 0;

db.serialize(() => {
  newSensors.forEach(sensor => {
    const stmt = db.prepare('INSERT OR IGNORE INTO sensors (id, name, latitude, longitude, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run(sensor.id, sensor.name, sensor.latitude, sensor.longitude, sensor.status, function(err) {
      if (err) {
        console.error('插入传感器失败:', sensor.name, err.message);
      } else if (this.changes > 0) {
        console.log('已添加传感器:', sensor.name);
        addedCount++;
      } else {
        console.log('传感器已存在，跳过:', sensor.name);
        skippedCount++;
      }
    });
    stmt.finalize();
  });

  setTimeout(() => {
    console.log('\n添加完成！');
    console.log('新增传感器: ' + addedCount + '个');
    console.log('已存在传感器: ' + skippedCount + '个');
    db.close();
  }, 500);
});
