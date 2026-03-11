const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testCommandsAPI() {
  console.log('=== 测试命令管理API ===\n');

  // 1. 先登录获取token
  console.log('1. 尝试登录...');
  try {
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '12345',
        password: '12345'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('登录失败:', loginData.message);
      return;
    }

    const token = loginData.data.token;
    console.log('✓ 登录成功');
    console.log('  Token:', token.substring(0, 20) + '...\n');

    // 2. 测试获取所有命令
    console.log('2. 获取所有命令...');
    const commandsResponse = await fetch(`${API_BASE}/commands`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const commandsData = await commandsResponse.json();
    console.log('  Response status:', commandsResponse.status);
    console.log('  Success:', commandsData.success);
    console.log('  数据数量:', commandsData.data?.length || 0);
    if (commandsData.data && commandsData.data.length > 0) {
      console.log('  示例数据:', JSON.stringify(commandsData.data[0], null, 2));
    }
    console.log();

    // 3. 测试按状态过滤
    console.log('3. 按状态过滤命令(未执行)...');
    const statusResponse = await fetch(`${API_BASE}/commands?status=未执行`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const statusData = await statusResponse.json();
    console.log('  Response status:', statusResponse.status);
    console.log('  Success:', statusData.success);
    console.log('  数据数量:', statusData.data?.length || 0);
    console.log();

    // 4. 测试按传感器过滤
    console.log('4. 按传感器过滤命令(sensor_id=5)...');
    const sensorResponse = await fetch(`${API_BASE}/commands?sensor_id=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const sensorData = await sensorResponse.json();
    console.log('  Response status:', sensorResponse.status);
    console.log('  Success:', sensorData.success);
    console.log('  数据数量:', sensorData.data?.length || 0);
    console.log();

    console.log('=== 测试完成 ===');

  } catch (error) {
    console.error('测试出错:', error.message);
  }
}

testCommandsAPI();
