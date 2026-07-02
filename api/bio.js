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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlObj = new URL(req.url, 'https://lumenpost.vercel.app');
  const slug = urlObj.searchParams.get('slug');

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(paginaNaoEncontrada());
  }

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
        if (parsed && parsed.slug === slug) {
          bioData = parsed;
          break;
        }
      } catch(e) {}
    }

    if (!bioData) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(paginaNaoEncontrada());
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(gerarPagina(bioData));

  } catch(err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(paginaNaoEncontrada());
  }
}

export const config = { maxDuration: 30 };

function gerarPagina(bio) {
  const links = (bio.links || [])
    .filter(l => l.nome && l.url)
    .map(l => `<a href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">${escHtml(l.nome)}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(bio.titulo || 'Link na Bio')}</title>
  <meta name="description" content="${escHtml(bio.descricao || '')}">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F3F4F6;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px 60px;
    }
    .container { width: 100%; max-width: 480px; }
    .header { text-align: center; margin-bottom: 32px; }
    .avatar {
      width: 72px; height: 72px;
      background: #2D6A4F; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px; font-weight: 700; color: white;
    }
    .titulo { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 6px; }
    .descricao { font-size: 14px; color: #6B7280; line-height: 1.5; }
    .links { display: flex; flex-direction: column; gap: 12px; }
    .link-btn {
      display: block; width: 100%;
      padding: 16px 20px; background: white;
      border: 1.5px solid #E5E7EB; border-radius: 12px;
      text-decoration: none; color: #111827;
      font-size: 15px; font-weight: 500; text-align: center;
      transition: all .15s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .link-btn:hover {
      border-color: #2D6A4F; color: #2D6A4F;
      box-shadow: 0 4px 12px rgba(45,106,79,.12);
      transform: translateY(-1px);
    }
    .rodape { text-align: center; margin-top: 40px; font-size: 11px; color: #9CA3AF; }
    .rodape a { color: #52B788; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar">${escHtml((bio.titulo || '?')[0].toUpperCase())}</div>
      <div class="titulo">${escHtml(bio.titulo || '')}</div>
      ${bio.descricao ? `<div class="descricao">${escHtml(bio.descricao)}</div>` : ''}
    </div>
    <div class="links">
      ${links || '<p style="text-align:center;color:#9CA3AF;font-size:14px">Nenhum link configurado.</p>'}
    </div>
    <div class="rodape">Criado com <a href="https://lumenpost.vercel.app" target="_blank">Lumen Post</a></div>
  </div>
</body>
</html>`;
}

function paginaNaoEncontrada() {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Não encontrado</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#F3F4F6;color:#374151;text-align:center}</style>
  </head><body><div><h1>Página não encontrada</h1><p style="color:#6B7280;margin-top:8px">Verifique o endereço ou crie sua página no Lumen Post.</p></div></body></html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
