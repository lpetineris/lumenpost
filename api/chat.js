// ---------------------------------------------------------------------------
// Ponte para a IA.
//
// Este endpoint gasta a chave da Anthropic. Sem exigir passe, qualquer pessoa
// que descubra o endereço consome o orçamento — não é vazamento de dado, é
// conta a pagar. O passe assinado é o que amarra a chamada a um usuário real
// do site.
//
// EXIGIR_PASSE está LIGADO: chamada sem passe válido é recusada. Desligar
// reabre o proxy para qualquer pessoa que descubra o endereço e existe só
// para destravar uma emergência — não é estado normal de operação.
// ---------------------------------------------------------------------------
import https from 'https';
import { identidade } from './_auth.js';

const EXIGIR_PASSE = true;

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (EXIGIR_PASSE && !identidade(req)) {
    return res.status(401).json({ error: 'Passe ausente ou inválido' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { system, messages, max_tokens } = req.body || {};

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: max_tokens || 1000,
    system,
    messages,
  });

  try {
    const result = await httpsRequest(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
      payload
    );

    return res.status(result.status).json(result.body);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
