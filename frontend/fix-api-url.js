// 修复构建产物中的 API URL
const fs = require('fs');
const path = require('path');

const apiBaseUrl = 'https://api-aiwater.cszj.wang/api';

// 递归处理所有文件
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // 替换各种可能的模式
      const replacements = [
        [/'\/api'/g, `'${apiBaseUrl}'`],
        [/process\.env\.NEXT_PUBLIC_API_BASE_URL/g, `'${apiBaseUrl}'`],
        [/process\.env\.NEXT_PUBLIC_TDT_KEY/g, `'ac3631f181626f56e5902f02296e987d'`],
      ];

      let modified = false;
      replacements.forEach(([pattern, replacement]) => {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          modified = true;
        }
      });

      if (modified) {
        console.log(`Updated: ${filePath}`);
        fs.writeFileSync(filePath, content);
      }
    }
  });
}

// 处理 out 目录
const outDir = path.join(__dirname, 'out');
if (fs.existsSync(outDir)) {
  console.log(`Processing ${outDir}...`);
  processDirectory(outDir);
  console.log('Done!');
} else {
  console.error('out directory not found. Please run npm run build first.');
}
