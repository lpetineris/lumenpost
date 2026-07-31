// ---------------------------------------------------------------------------
// Passe de acesso Lumen Labs
//
// O navegador não pode ser a fonte da identidade do usuário: qualquer pessoa
// consegue mandar o id de outra. Então quem afirma "este é o usuário X" é o
// Wix, do lado servidor dele, e essa afirmação vem assinada com um segredo
// (LUMEN_TOKEN_SECRET) que nunca chega ao navegador.
//
// Formato do passe:  <payload>.<assinatura>
//   payload     = base64url de { uid, iat, exp }
//   assinatura  = base64url de HMAC-SHA256(payload, segredo)
//
// Sem o segredo não dá para produzir uma assinatura válida, então o servidor
// pode confiar no uid que está dentro do passe — e SÓ nele. O user_id que vier
// no corpo do pedido é sempre suspeito e deve ser ignorado.
//
// Este arquivo é idêntico nos três projetos (Post, Mind, Perfil). Se mexer em
// um, mexa nos outros: eles precisam validar os passes uns dos outros.
// ---------------------------------------------------------------------------
import crypto from 'crypto';

const VALIDADE_HORAS = 12;

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function assinar(payloadB64, segredo) {
  return b64url(crypto.createHmac('sha256', segredo).update(payloadB64).digest());
}

// Comparação de tempo constante: comparar segredos com === vaza informação
// pelo tempo de resposta (para de comparar no primeiro byte diferente).
export function iguaisEmTempoConstante(a, b) {
  const ba = Buffer.from(String(a == null ? '' : a));
  const bb = Buffer.from(String(b == null ? '' : b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function emitirPasse(userId, segredo, horas = VALIDADE_HORAS) {
  const agora = Math.floor(Date.now() / 1000);
  const payload = { uid: String(userId), iat: agora, exp: agora + horas * 3600 };
  const p = b64url(JSON.stringify(payload));
  return { token: `${p}.${assinar(p, segredo)}`, exp: payload.exp };
}

export function lerPasse(token, segredo) {
  if (!token || typeof token !== 'string') return { valido: false, motivo: 'ausente' };
  const partes = token.split('.');
  if (partes.length !== 2) return { valido: false, motivo: 'formato' };

  const [p, assinatura] = partes;
  if (!iguaisEmTempoConstante(assinatura, assinar(p, segredo))) {
    return { valido: false, motivo: 'assinatura' };
  }

  let payload;
  try {
    payload = JSON.parse(deB64url(p).toString('utf8'));
  } catch (e) {
    return { valido: false, motivo: 'payload' };
  }

  if (!payload || !payload.uid) return { valido: false, motivo: 'sem-uid' };
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valido: false, motivo: 'expirado' };
  }
  return { valido: true, uid: String(payload.uid), exp: payload.exp };
}

// O passe pode vir no cabeçalho (caminho normal) ou no corpo (reserva, para
// chamadas que não conseguem definir cabeçalho, como um form ou um link).
export function passeDoPedido(req) {
  const h = req.headers && (req.headers['x-lumen-passe'] || req.headers['X-Lumen-Passe']);
  if (h) return Array.isArray(h) ? h[0] : h;
  if (req.body && typeof req.body.passe === 'string') return req.body.passe;
  if (req.query && typeof req.query.passe === 'string') return req.query.passe;
  return null;
}

// Identidade verificada do pedido, ou null se não houver passe válido.
// Quem chama decide o que fazer com o null — durante a transição, cair no
// comportamento antigo; depois, recusar.
export function identidade(req) {
  const segredo = process.env.LUMEN_TOKEN_SECRET;
  if (!segredo) return null;
  const t = passeDoPedido(req);
  if (!t) return null;
  const r = lerPasse(t, segredo);
  return r.valido ? r.uid : null;
}
