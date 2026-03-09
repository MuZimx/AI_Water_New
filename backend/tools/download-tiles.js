#!/usr/bin/env node
// 简单的瓦片下载脚本（Node.js）
// 用法示例（PowerShell）：
// node tools/download-tiles.js --minZoom=10 --maxZoom=14

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const m = arg.match(/^--([a-zA-Z0-9-_]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  });
  return args;
}

// WGS84 lon/lat -> XYZ tile index
function lon2tile(lon, z) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}
function lat2tile(lat, z) {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
}

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode === 200) {
        ensureDirSync(path.dirname(dest));
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', (err) => reject(err));
      } else if (res.statusCode === 301 || res.statusCode === 302) {
        // redirect
        const newUrl = res.headers.location;
        if (newUrl) {
          resolve(download(newUrl, dest));
        } else {
          reject(new Error('重定向但没有 Location'));
        }
      } else {
        // not found or other
        reject(new Error('HTTP ' + res.statusCode));
      }
    });
    req.on('error', reject);
  });
}

async function run() {
  const args = parseArgs();

  // 默认南京市近似 bbox（可在命令行覆盖）
  const minLon = parseFloat(args.minLon || '118.6');
  const minLat = parseFloat(args.minLat || '31.0');
  const maxLon = parseFloat(args.maxLon || '119.6');
  const maxLat = parseFloat(args.maxLat || '32.4');

  const minZoom = parseInt(args.minZoom || '10', 10);
  const maxZoom = parseInt(args.maxZoom || '14', 10);

  const tileServer = args.tileServer || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const subdomains = ['a','b','c'];

  const outBase = args.out || path.join(__dirname, '..', 'public', 'tiles');
  console.log('输出目录：', outBase);
  console.log(`下载 bbox: [${minLon}, ${minLat}] - [${maxLon}, ${maxLat}], zoom ${minZoom}..${maxZoom}`);
  console.log('瓦片源：', tileServer);

  ensureDirSync(outBase);

  // 收集任务
  const tasks = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lon2tile(minLon, z);
    const xMax = lon2tile(maxLon, z);
    const yMin = lat2tile(maxLat, z); // 注意纬度方向
    const yMax = lat2tile(minLat, z);

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tasks.push({ z, x, y });
      }
    }
  }

  console.log('总瓦片数（估计）:', tasks.length);

  const concurrency = parseInt(args.concurrency || '6', 10);
  const delayMs = parseInt(args.delayMs || '200', 10); // 保守速率

  let index = 0;
  async function worker(id) {
    while (true) {
      const i = index++;
      if (i >= tasks.length) break;
      const t = tasks[i];
      const sub = subdomains[(t.x + t.y) % subdomains.length];
      const url = tileServer.replace('{s}', sub).replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
      const dest = path.join(outBase, String(t.z), String(t.x), `${t.y}.png`);
      if (fs.existsSync(dest)) {
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      try {
        await download(url, dest);
        process.stdout.write('#');
      } catch (err) {
        process.stdout.write('x');
        try {
          // 确保目录存在后再写入错误文件，避免 ENOENT
          ensureDirSync(path.dirname(dest));
          fs.writeFileSync(dest + '.error.json', JSON.stringify({ url, err: String(err) }));
        } catch (wErr) {
          // 忽略写入错误，继续下载其他瓦片
        }
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // 启动 worker
  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker(i));
  await Promise.all(workers);

  console.log('\n完成。请在后端将', outBase, '作为静态目录提供服务（例如 express.static）。');
}

run().catch(err => {
  console.error('下载失败：', err);
  process.exit(1);
});
