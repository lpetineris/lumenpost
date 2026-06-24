export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { action, table, data } = req.body;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Prefer': 'return=representation',
  };

  try {
    let url, method, body;

    if (action === 'select') {
      const userId = data?.user_id;
      if (!userId) return res.status(400).json({ error: 'user_id required' });
      url = `${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}&order=criado_em.desc`;
      method = 'GET';
    }
    else if (action === 'select_perfil') {
      const userId = data?.user_id;
      if (!userId) return res.status(400).json({ error: 'user_id required' });
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${userId}`;
      method = 'GET';
    }
    else if (action === 'insert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      body = JSON.stringify(data);
    }
    else if (action === 'upsert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
      body = JSON.stringify(data);
    }
    else if (action === 'update') {
      const { id, user_id, ...fields } = data;
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}&user_id=eq.${user_id}`;
      method = 'PATCH';
      body = JSON.stringify(fields);
    }
    else if (action === 'delete') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data.id}&user_id=eq.${data.user_id}`;
      method = 'DELETE';
    }
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(url, { method, headers, body });

    if (method === 'DELETE') return res.status(200).json({ success: true });

    const result = await response.json();
    return res.status(response.status).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = { maxDuration: 30 };
