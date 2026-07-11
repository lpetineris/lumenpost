export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, table, data, user_id } = req.body;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    let url, method, body;

    if (action === 'select') {
      url = `${supabaseUrl}/rest/v1/${table}?user_id=eq.${user_id}&order=criado_em.desc`;
      method = 'GET';
    } else if (action === 'insert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      body = JSON.stringify({ ...data, user_id });
    } else if (action === 'update') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data.id}&user_id=eq.${user_id}`;
      method = 'PATCH';
      body = JSON.stringify(data);
    } else if (action === 'delete') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${data.id}&user_id=eq.${user_id}`;
      method = 'DELETE';
    } else if (action === 'upsert_perfil') {
      url = `${supabaseUrl}/rest/v1/perfis?id=eq.${user_id}`;
      method = 'POST';
      body = JSON.stringify({ ...data, id: user_id });
    } else if (action === 'get_perfil') {
      url = `${supabaseUrl}/rest/v1/perfis?id=eq.${user_id}`;
      method = 'GET';
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': action === 'insert' ? 'return=representation' :
                action === 'upsert_perfil' ? 'resolution=merge-duplicates,return=representation' : '',
    };

    const response = await fetch(url, { method, headers, body });
    const result = method === 'DELETE' ? [] : await response.json();
    return res.status(response.status).json(result);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  maxDuration: 30,
};
