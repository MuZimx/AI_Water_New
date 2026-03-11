const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'db/users.db'));

console.log('=== Commands表结构 ===');
db.all("PRAGMA table_info(commands)", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
});

console.log('\n=== Command_Recipients表结构 ===');
db.all("PRAGMA table_info(command_recipients)", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
});

console.log('\n=== 示例命令数据 ===');
db.all("SELECT * FROM commands LIMIT 2", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
});

console.log('\n=== Command_Recipients数据 ===');
db.all("SELECT * FROM command_recipients", (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
