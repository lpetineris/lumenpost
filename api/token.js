// ---------------------------------------------------------------------------
// Emissor do passe de acesso.
//
// Só o código de servidor do Wix chama este endpoint, apresentando o segredo
// compartilhado. Ninguém no navegador tem esse segredo, então ninguém no
// navegador consegue pedir um passe para outra pessoa.
//
// POST { secret, userId }  ->  { token, exp }
// GET  ?autoteste=1        ->  emite e confere um passe de mentira, para
//                              provar que o segredo está configurado aqui
// ---------------------------------------------------------------------------
import {
  emitirPasse,
  lerPasse,
  iguaisEmTempoConstante,
  segredoDoAmbiente,
} from './_auth.js';

const UID_AUTOTESTE = '__autoteste__';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const segredo = segredoDoAmbiente();
  if (!segredo) {
    return res.status(500).json({ erro: 'LUMEN_TOKEN_SECRET não configurado neste projeto' });
  }

  // Autoteste: prova que a assinatura funciona e que o segredo existe aqui.
  // O passe devolvido é para um usuário que não existe, então não serve para
  // ler dado de ninguém — só para conferir, nos outros projetos, se o segredo
  // é o mesmo.
  if (req.method === 'GET' && req.query && req.query.autoteste) {
    const { token } = emitirPasse(UID_AUTOTESTE, segredo, 1);
    const lido = lerPasse(token, segredo);
    return res.status(200).json({
      ok: lido.valido && lido.uid === UID_AUTOTESTE,
      lido,
      token,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Method not allowed' });
  }

  const { secret, userId } = req.body || {};
  const apresentado = secret == null ? '' : String(secret).trim();

  if (!iguaisEmTempoConstante(apresentado, segredo)) {
    return res.status(401).json({ erro: 'segredo inválido' });
  }
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ erro: 'userId ausente' });
  }
  if (userId === UID_AUTOTESTE) {
    return res.status(400).json({ erro: 'userId reservado' });
  }

  const { token, exp } = emitirPasse(userId, segredo);
  return res.status(200).json({ token, exp });
}

export const config = { maxDuration: 10 };
