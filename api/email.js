const https = require('https');

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      // Sem isto, cada pedaço da resposta é decodificado sozinho: um
      // caractere de dois bytes que caia na emenda entre dois pedaços
      // vira lixo. Era o que corrompia acentos vindos do banco.
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const { para, empresa, rede, texto, emailRemetente } = req.body;

  if (!para || !texto) return res.status(400).json({ error: 'Missing required fields' });

  const resumo = texto.length > 300 ? texto.substring(0, 300) + '...' : texto;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1C1917">
      <div style="background:linear-gradient(135deg,#2D6A4F,#1B4332);padding:28px 32px;border-radius:12px 12px 0 0">
        <div style="font-size:18px;font-weight:700;color:white">Lumen Post</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">Solicitação de aprovação de post</div>
      </div>
      <div style="background:#ffffff;padding:28px 32px;border:1px solid #E7E5E4;border-top:none">
        <p style="font-size:14px;margin-bottom:16px">Olá,</p>
        <p style="font-size:14px;margin-bottom:20px">
          Você recebeu uma solicitação de aprovação de post da empresa <strong>${empresa || 'sua empresa'}</strong> para o <strong>${rede || 'redes sociais'}</strong>.
        </p>
        <div style="background:#F0FDF4;border-left:4px solid #2D6A4F;border-radius:4px;padding:16px 20px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#40916C;margin-bottom:8px">Texto do post</div>
          <div style="font-size:14px;line-height:1.7;color:#1C1917;white-space:pre-wrap">${resumo}</div>
        </div>
        <p style="font-size:13px;color:#57534E;margin-bottom:8px">
          Para aprovar ou solicitar alterações, responda este email ou acesse o Lumen Post.
        </p>
      </div>
      <div style="background:#FAFAF7;padding:16px 32px;border:1px solid #E7E5E4;border-top:none;border-radius:0 0 12px 12px;text-align:center">
        <p style="font-size:11px;color:#A8A29E;margin:0">Lumen Post · Lumen Labs · Este email foi enviado automaticamente</p>
      </div>
    </div>
  `;

  const payload = JSON.stringify({
    from: 'Lumen Post <onboarding@resend.dev>',
    to: [para],
    subject: `[Aprovação] Post ${rede || ''} — ${empresa || 'Lumen Post'}`,
    html,
  });

  try {
    const result = await httpsRequest(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      payload
    );

    if (result.status === 200 || result.status === 201) {
      return res.status(200).json({ success: true, id: result.body.id });
    } else {
      return res.status(result.status).json({ error: 'Resend error', details: result.body });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
