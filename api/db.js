import https from 'https';

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '[]') });
        } catch(e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Missing env vars',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }

  // Debug: show key length and first/last chars
  const keyInfo = `len:${supabaseKey.length} start:${supabaseKey.slice(0,10)} end:${supabaseKey.slice(-5)}`;

  const { action, table, data } = req.body;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  try {
    // Test connection first
    const testUrl = `${supabaseUrl}/rest/v1/`;
    const testResult = await httpsRequest(testUrl, { method: 'GET', headers }, null);
    
    if (testResult.status === 401) {
      return res.status(401).json({ 
        error: 'Invalid Supabase key',
        keyInfo,
        supabaseResponse: testResult.body
      });
    }

    let url, method, body;

    if (action === 'select') {
      url = `${supabaseUrl}/rest/v1/${table}?user_id=eq.${data?.user_id}&order=criado_em.desc`;
      method = 'GET';
    } else if (action === 'select_perfil') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data?.user_id}`;
      method = 'GET';
    } else if (action === 'insert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      body = JSON.stringify(data);
    } else if (action === 'upsert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
      body = JSON.stringify(data);
    } else if (action === 'update') {
      const { id, user_id, ...fields } = data;
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}&user_id=eq.${user_id}`;
      method = 'PATCH';
      body = JSON.stringify(fields);
    } else if (action === 'delete') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data.id}&user_id=eq.${data.user_id}`;
      method = 'DELETE';
      await httpsRequest(url, { method, headers }, null);
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid action: ' + action });
    }

    const result = await httpsRequest(url, { method, headers }, body);
    return res.status(result.status).json(result.body);

  } catch (error) {
    return res.status(500).json({ error: error.message, type: error.constructor.name });
  }
}

export const config = { maxDuration: 30 };
