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

// Painéis como o do Vercel e o cofre do Wix costumam guardar uma quebra de
// linha ou um espaço no fim do que foi colado. Como o segredo é comparado byte
// a byte e usado como chave do HMAC, um invisível desses reprova tudo. Então o
// valor é sempre aparado — nos dois lados, e nos três projetos, para as
// assinaturas continuarem compatíveis entre eles.
export function segredoDoAmbiente() {
  const s = process.env.LUMEN_TOKEN_SECRET;
  return s ? String(s).trim() : null;
}

// Assinatura genérica com prazo. O passe é um caso particular disto; o outro
// é a URL de download, que precisa carregar a autorização dentro do próprio
// endereço porque a ponte do Wix só sabe navegar até um link.
export function assinarDados(dados, segredo, segundos) {
  const agora = Math.floor(Date.now() / 1000);
  const payload = { ...dados, iat: agora, exp: agora + segundos };
  const p = b64url(JSON.stringify(payload));
  return { token: `${p}.${assinar(p, segredo)}`, exp: payload.exp };
}

export function lerDadosAssinados(token, segredo) {
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

  if (!payload || typeof payload !== 'object') return { valido: false, motivo: 'payload' };
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valido: false, motivo: 'expirado' };
  }
  return { valido: true, dados: payload, exp: payload.exp };
}

export function emitirPasse(userId, segredo, horas = VALIDADE_HORAS) {
  return assinarDados({ uid: String(userId) }, segredo, horas * 3600);
}

export function lerPasse(token, segredo) {
  const r = lerDadosAssinados(token, segredo);
  if (!r.valido) return r;
  if (!r.dados.uid) return { valido: false, motivo: 'sem-uid' };
  return { valido: true, uid: String(r.dados.uid), exp: r.exp };
}

// ---------------------------------------------------------------------------
// Credencial de usuário para o Supabase.
//
// Até aqui o servidor falava com o banco como administrador, e o banco obedecia
// sem perguntar — todas as proteções moravam no nosso código. Com esta
// credencial ele fala EM NOME DO USUÁRIO, e as regras de linha do Postgres
// passam a valer. Um filtro errado no nosso código deixa de ser capaz de
// entregar dado alheio: o banco recusa antes.
//
// É assinada com o segredo legado do projeto (SUPABASE_JWT_SECRET), que o
// Supabase ainda usa para verificar. Vale um minuto: é emitida a cada chamada
// e não precisa durar mais que ela.
// ---------------------------------------------------------------------------
export function credencialSupabase(uid, segundos = 60) {
  const segredo = process.env.SUPABASE_JWT_SECRET;
  if (!segredo || !uid) return null;

  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({
    sub: String(uid),
    role: 'authenticated',   // papel a que as políticas de linha se aplicam
    aud: 'authenticated',
    iat: agora,
    exp: agora + segundos,
  }));
  const dados = `${cabecalho}.${corpo}`;
  const assinatura = b64url(
    crypto.createHmac('sha256', String(segredo).trim()).update(dados).digest()
  );
  return `${dados}.${assinatura}`;
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
  const segredo = segredoDoAmbiente();
  if (!segredo) return null;
  const t = passeDoPedido(req);
  if (!t) return null;
  const r = lerPasse(t, segredo);
  return r.valido ? r.uid : null;
}
