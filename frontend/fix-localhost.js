const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('localhost')) {
      content = content.replace(/http:\/\/localhost:3000/g, 'https://api-aiwater.cszj.wang');
      content = content.replace(/localhost:3000/g, 'api-aiwater.cszj.wang');
      fs.writeFileSync(filePath, content);
      console.log('Fixed:', filePath);
    }
  } catch (err) {
    console.error('Error:', filePath, err.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      replaceInFile(filePath);
    }
  });
}

const outDir = path.join(__dirname, 'out');
console.log('Processing directory:', outDir);
walkDir(outDir);
console.log('Done!');
