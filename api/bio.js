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
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '[]') }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlObj = new URL(req.url, 'https://lumenpost.vercel.app');
  const slug = urlObj.searchParams.get('slug');

  if (!slug) return res.status(400).json({ error: 'slug required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    const result = await httpsRequest(
      `${supabaseUrl}/rest/v1/perfis_post?select=bio&bio=not.is.null`,
      { method: 'GET', headers },
      null
    );

    const rows = Array.isArray(result.body) ? result.body : [];
    let bioData = null;

    for (const row of rows) {
      try {
        const parsed = typeof row.bio === 'string' ? JSON.parse(row.bio) : row.bio;
        if (parsed && parsed.slug === slug) { bioData = parsed; break; }
      } catch(e) {}
    }

    if (!bioData) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(bioData);

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = { maxDuration: 30 };
