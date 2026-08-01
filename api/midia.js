// Serve a imagem de um post como arquivo, com Content-Disposition: attachment.
//
// Existe por causa do iframe do Wix: as ferramentas rodam num HTML component
// sandboxed, sem allow-downloads, então <a download> com data URL é ignorado
// silenciosamente. O caminho que funciona é o mesmo do Tendências — uma URL
// de verdade que responde com cabeçalho de anexo, aberta pela ponte do Wix.
//
// A ponte só sabe navegar até um link — ela não carrega passe nem cabeçalho.
// Antes, a autorização era "sabe o id do post e o id do dono", o que é fraco:
// quem tivesse os dois baixava. Agora a autorização vai ASSINADA dentro do
// próprio endereço, e vale dez minutos:
//
//   POST { id, i, passe }  ->  { url }   a ferramenta pede o endereço
//   GET  ?t=<assinado>                   a ponte do Wix navega até ele
//
// O dono sai de dentro da assinatura, não da barra de endereços.

import https from 'https';
import { identidade, assinarDados, lerDadosAssinados, segredoDoAmbiente } from './_auth.js';

const VALIDADE_SEGUNDOS = 600;

function buscar(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers },
      (res) => {
        let data = '';
        // Sem isto, cada pedaço da resposta é decodificado sozinho: um
        // caractere de dois bytes que caia na emenda entre dois pedaços
        // vira lixo. Era o que corrompia acentos vindos do banco.
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data || '[]') }); }
          catch (e) { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send('Servidor sem configuração de banco.');
  }

  const segredo = segredoDoAmbiente();
  if (!segredo) return res.status(500).send('Servidor sem configuração de acesso.');

  // ── Pedido do endereço: exige passe, devolve um link assinado ──
  if (req.method === 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    const uid = identidade(req);
    if (!uid) return res.status(401).json({ error: 'Passe ausente ou inválido' });

    const { id, i } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Faltou o id.' });

    const { token } = assinarDados(
      { tipo: 'midia', id: String(id), i: Math.max(0, parseInt(i, 10) || 0), uid },
      segredo,
      VALIDADE_SEGUNDOS
    );
    return res.status(200).json({ url: `/api/midia?t=${encodeURIComponent(token)}` });
  }

  // ── Entrega: é por aqui que a ponte do Wix chega ──
  const t = (req.query && req.query.t) || '';
  const lido = lerDadosAssinados(t, segredo);
  if (!lido.valido || lido.dados.tipo !== 'midia') {
    return res.status(403).send('Link inválido ou expirado. Peça o download de novo.');
  }

  const id = lido.dados.id;
  const user = lido.dados.uid;
  const indice = Math.max(0, parseInt(lido.dados.i, 10) || 0);

  try {
    // O user_id entra na consulta: um post só é servido para o dono dele.
    const url = `${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(id)}` +
                `&user_id=eq.${encodeURIComponent(user)}&select=midia,rede`;
    const r = await buscar(url, {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    });

    const linha = Array.isArray(r.body) ? r.body[0] : null;
    if (!linha || !linha.midia) return res.status(404).send('Mídia não encontrada.');

    let midia;
    try { midia = JSON.parse(linha.midia); } catch (e) { return res.status(404).send('Mídia ilegível.'); }

    // Mesma ordem que a ferramenta mostra: as imagens e, por último, o vídeo
    // quando ele acompanha as imagens (redes diferentes usam materiais
    // diferentes do mesmo post).
    const imagens = midia.tipo === 'video'
      ? [{ dataUrl: midia.dataUrl, nome: midia.nome }]
      : [{ dataUrl: midia.dataUrl, nome: midia.nome }]
          .concat(midia.extras || [])
          .concat(midia.video ? [midia.video] : []);

    const alvo = imagens[indice];
    if (!alvo || !alvo.dataUrl) return res.status(404).send('Imagem não encontrada nesse post.');

    const m = String(alvo.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) return res.status(415).send('Formato de mídia não suportado.');

    const tipo = m[1];
    const bytes = Buffer.from(m[2], 'base64');
    const ext = tipo.includes('png') ? 'png' : tipo.startsWith('video') ? 'mp4' : 'jpg';

    const base = String(alvo.nome || `lumen-post-${linha.rede || 'midia'}`)
      .replace(/\.[^/.]+$/, '')
      .replace(/[^\w\-. ]+/g, '')
      .trim() || 'imagem';
    const nome = (imagens.length > 1 ? String(indice + 1).padStart(2, '0') + '-' : '') + base + '.' + ext;

    res.setHeader('Content-Type', tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Length', bytes.length);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).send(bytes);
  } catch (e) {
    console.error('Erro ao servir mídia:', e);
    return res.status(500).send('Erro ao buscar a mídia.');
  }
}
