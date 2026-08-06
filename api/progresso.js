// ---------------------------------------------------------------------------
// Progresso do roteiro de uso, para a Central.
//
// Devolve quatro respostas de sim ou não — nunca conteúdo. A Central só
// precisa saber o que já foi feito, não o que foi escrito.
//
// Mora aqui, e não na Central, porque este projeto já tem toda a máquina de
// falar com o banco. A Central chama de outro endereço, o que funciona porque
// o passe é assinado com o mesmo segredo nos três projetos.
//
//   POST { passe }  ->  { perfil, analise, conversa, post }
// ---------------------------------------------------------------------------
import https from 'https';
import { identidade, credencialSupabase } from './_auth.js';

function buscar(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers },
      (res) => {
        let data = '';
        // Sem isto, um caractere de dois bytes que caia na emenda entre dois
        // pedaços da resposta vira lixo.
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data || '[]')); } catch (e) { resolve([]); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = identidade(req);
  if (!uid) return res.status(401).json({ error: 'Passe ausente ou inválido' });

  const base = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const credencial = credencialSupabase(uid);
  if (!base || !anonKey || !credencial) {
    return res.status(500).json({ error: 'Servidor sem configuração' });
  }

  // Fala em nome do usuário: as regras de linha do banco valem aqui também.
  const headers = { apikey: anonKey, Authorization: `Bearer ${credencial}` };
  const u = encodeURIComponent(uid);
  const temAlgo = (r) => Array.isArray(r) && r.length > 0;

  try {
    const [perfil, analises, conversas, posts, perfilPost] = await Promise.all([
      buscar(`${base}/rest/v1/perfil_central?id=eq.${u}&select=nome`, headers),
      buscar(`${base}/rest/v1/analises?user_id=eq.${u}&select=id&limit=1`, headers),
      buscar(`${base}/rest/v1/conversas?user_id=eq.${u}&select=id&limit=1`, headers),
      buscar(`${base}/rest/v1/posts?user_id=eq.${u}&select=id&limit=1`, headers),
      buscar(`${base}/rest/v1/perfis_post?id=eq.${u}&select=programacoes`, headers),
    ]);

    // Uma estratégia montada vale tanto quanto um post gerado: são os dois
    // caminhos para o mesmo passo.
    //
    // Mas "Posts gerais" não conta: ela é criada sozinha na primeira vez que
    // o Post abre, e é só a gaveta dos posts avulsos. Contá-la fazia o passo
    // nascer marcado e nunca desmarcar, mesmo com tudo apagado.
    let temProgramacao = false;
    if (temAlgo(perfilPost) && perfilPost[0].programacoes) {
      try {
        const lista = JSON.parse(perfilPost[0].programacoes);
        temProgramacao = Array.isArray(lista) && lista.some((p) => p && !p.fixa);
      } catch (e) {
        temProgramacao = false;
      }
    }

    return res.status(200).json({
      perfil: temAlgo(perfil) && !!String(perfil[0].nome || '').trim(),
      analise: temAlgo(analises),
      conversa: temAlgo(conversas),
      post: temAlgo(posts) || temProgramacao,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export const config = { maxDuration: 15 };
