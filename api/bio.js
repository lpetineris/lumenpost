const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = async function handler(req, res) {
  const slug = req.url.split('/bio/')[1]?.split('?')[0]?.trim();

  if (!slug) {
    return res.status(404).send(paginaNaoEncontrada());
  }

  // Busca no Supabase o perfil que tem esse slug na bio
  const { data, error } = await supabase
    .from('perfis_post')
    .select('bio')
    .not('bio', 'is', null);

  if (error || !data || data.length === 0) {
    return res.status(404).send(paginaNaoEncontrada());
  }

  // Procura o perfil com o slug correspondente
  let bioData = null;
  for (const row of data) {
    try {
      const parsed = JSON.parse(row.bio);
      if (parsed.slug === slug) {
        bioData = parsed;
        break;
      }
    } catch(e) {}
  }

  if (!bioData) {
    return res.status(404).send(paginaNaoEncontrada());
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).send(gerarPagina(bioData));
};

function gerarPagina(bio) {
  const links = (bio.links || [])
    .filter(l => l.nome && l.url)
    .map(l => `
      <a href="${encodeURI(l.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">
        ${escHtml(l.nome)}
      </a>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(bio.titulo || 'Link na Bio')}</title>
  <meta name="description" content="${escHtml(bio.descricao || '')}">
  <meta property="og:title" content="${escHtml(bio.titulo || '')}">
  <meta property="og:description" content="${escHtml(bio.descricao || '')}">
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
    .container {
      width: 100%;
      max-width: 480px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .avatar {
      width: 72px;
      height: 72px;
      background: #2D6A4F;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 28px;
      font-weight: 700;
      color: white;
    }
    .titulo {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
    }
    .descricao {
      font-size: 14px;
      color: #6B7280;
      line-height: 1.5;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .link-btn {
      display: block;
      width: 100%;
      padding: 16px 20px;
      background: white;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      text-decoration: none;
      color: #111827;
      font-size: 15px;
      font-weight: 500;
      text-align: center;
      transition: all .15s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .link-btn:hover {
      border-color: #2D6A4F;
      color: #2D6A4F;
      box-shadow: 0 4px 12px rgba(45,106,79,.12);
      transform: translateY(-1px);
    }
    .rodape {
      text-align: center;
      margin-top: 40px;
      font-size: 11px;
      color: #9CA3AF;
    }
    .rodape a {
      color: #52B788;
      text-decoration: none;
      font-weight: 600;
    }
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
    <div class="rodape">
      Criado com <a href="https://lumenpost.vercel.app" target="_blank">Lumen Post</a>
    </div>
  </div>
</body>
</html>`;
}

function paginaNaoEncontrada() {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Página não encontrada</title>
  <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#F3F4F6;color:#374151;text-align:center}h1{font-size:24px;margin-bottom:8px}p{color:#6B7280}</style>
  </head><body><div><h1>Página não encontrada</h1><p>Verifique o endereço ou crie sua página no Lumen Post.</p></div></body></html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
