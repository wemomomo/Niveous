
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  try {
    const bodyData = JSON.parse(event.body || '{}');
    const inviteCode = (bodyData.inviteCode || '').trim();
    const username = (bodyData.username || '').trim();
    const password = (bodyData.password || '').trim();

    if (!inviteCode || !username || !password) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '请填写邀请码、账号和密码' }) };
    }

    if (username.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '账号至少需要2个字符' }) };
    }

    if (password.length < 4) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '密码至少需要4个字符' }) };
    }

    let rawUrl = (process.env.SUPABASE_URL || '').trim();
    const rawKey = (process.env.SUPABASE_KEY || '').trim();

    if (!rawUrl || !rawKey) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '服务端环境变量未配置' }) };
    }

    if (!rawUrl.startsWith('http')) rawUrl = 'https://' + rawUrl;
    rawUrl = rawUrl.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');

    // 1. 验证邀请码是否有效（全表查询，内存匹配，兼容特殊符号）
    const codesRes = await fetch(`${rawUrl}/rest/v1/invite_codes?select=*`, {
      method: 'GET',
      headers: {
        'apikey': rawKey,
        'Authorization': `Bearer ${rawKey}`,
        'Accept': 'application/json'
      }
    });

    if (!codesRes.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '数据库连接异常' }) };
    }

    const allCodes = await codesRes.json();
    const codeRecord = (allCodes || []).find(function(c) {
      return String(c.code || '').trim() === inviteCode;
    });

    if (!codeRecord) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '邀请码无效' }) };
    }

    if (codeRecord.is_used === true) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '该邀请码已被使用' }) };
    }

    // 2. 检查用户名是否已存在
    const usersRes = await fetch(`${rawUrl}/rest/v1/users?select=*`, {
      method: 'GET',
      headers: {
        'apikey': rawKey,
        'Authorization': `Bearer ${rawKey}`,
        'Accept': 'application/json'
      }
    });

    const allUsers = await usersRes.json();
    const existingUser = (allUsers || []).find(function(u) {
      return String(u.username || '').trim().toLowerCase() === username.toLowerCase();
    });

    if (existingUser) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '该账号名已被注册，请换一个' }) };
    }

    // 3. 创建新用户
    const maxDevices = Number(codeRecord.max_devices) || 3;

    const createRes = await fetch(`${rawUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': rawKey,
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        username: username,
        password: password,
        is_active: true,
        devices: [],
        max_devices: maxDevices
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '注册失败: ' + errText }) };
    }

    // 4. 标记邀请码为已使用
    await fetch(`${rawUrl}/rest/v1/invite_codes?id=eq.${codeRecord.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': rawKey,
        'Authorization': `Bearer ${rawKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        is_used: true,
        used_by: username
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        username: username,
        message: '注册成功'
      })
    };

  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, message: '服务异常: ' + err.message }) };
  }
};
