// ---------------------------------------------------------------------------
// Acesso ao banco.
//
// Quem é o usuário vem do passe assinado (ver _auth.js), NUNCA do corpo do
// pedido. O corpo é escrito pelo navegador e qualquer pessoa pode mandar o id
// de outra; o passe é assinado com um segredo que só existe nos servidores.
//
// EXIGIR_PASSE está LIGADO: pedido sem passe válido é recusado, ponto. O id
// que vem no corpo não vale mais nada. Desligar reabre o modo antigo e existe
// só para destravar uma emergência — não é estado normal de operação.
// ---------------------------------------------------------------------------
import https from 'https';
import { identidade, credencialSupabase } from './_auth.js';

const EXIGIR_PASSE = true;

// O nome da tabela vinha do navegador e ia direto para a URL do Supabase, o
// que dava acesso a qualquer tabela do projeto. Só estas são alcançáveis.
const TABELAS = new Set([
  'posts',
  'perfis_post',
  'perfil_central',
  'resumos_salvos',
  'analises',
  'conversas',
]);

// Tabelas de uma linha por usuário: o dono É a chave primária "id", e não
// existe coluna user_id nelas. Escrever user_id aqui faz o Supabase recusar a
// gravação inteira, porque a coluna não existe.
const TABELAS_POR_ID = new Set(['perfil_central', 'perfis_post']);

// Identidade informada pelo navegador — só serve enquanto EXIGIR_PASSE for
// false. Nas tabelas por id, "id" é o dono; nas demais, "id" é o id da LINHA
// e não identifica ninguém.
function idInformado(action, table, data) {
  if (!data) return null;
  if (data.user_id) return data.user_id;
  if (TABELAS_POR_ID.has(table) && (action === 'upsert' || action === 'select_perfil')) {
    return data.id;
  }
  return null;
}

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
      // Sem isto, cada pedaço da resposta é decodificado sozinho: um
      // caractere de dois bytes que caia na emenda entre dois pedaços
      // vira lixo. Era o que corrompia acentos vindos do banco.
      res.setEncoding('utf8');
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Este arquivo não tem mais a chave de administrador. Ele só sabe falar em
  // nome de um usuário, e o que ele consegue ver ou gravar é decidido pelas
  // regras de linha do Postgres.
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const { action, table, data } = req.body || {};

  if (!TABELAS.has(table)) {
    return res.status(400).json({ error: 'Tabela não permitida' });
  }

  // A identidade verificada manda. Sem passe, cai no id informado pelo
  // navegador — só enquanto EXIGIR_PASSE for false.
  const verificado = identidade(req);
  if (!verificado && EXIGIR_PASSE) {
    return res.status(401).json({ error: 'Passe ausente ou inválido' });
  }
  const dono = verificado || idInformado(action, table, data);
  if (!dono) {
    return res.status(400).json({ error: 'Sem identificação' });
  }

  // Sem codificar, um id com "&" pendura parâmetros extras na consulta ao
  // Supabase. Vale para o id do dono e para o id da linha.
  const donoQ = encodeURIComponent(dono);
  const linhaQ = data && data.id != null ? encodeURIComponent(data.id) : null;

  // Credencial deste usuário, válida por um minuto. É sobre ela que as regras
  // de linha agem: o banco só devolve e só aceita o que for do dono.
  const credencial = credencialSupabase(dono);
  if (!credencial) {
    return res.status(500).json({ error: 'SUPABASE_JWT_SECRET não configurado' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': anonKey,
    'Authorization': `Bearer ${credencial}`,
    'Prefer': 'return=representation',
  };

  try {
    let url, method, body;
    if (action === 'select') {
      url = `${supabaseUrl}/rest/v1/${table}?user_id=eq.${donoQ}&order=criado_em.desc`;
      method = 'GET';
    } else if (action === 'select_perfil') {
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${donoQ}`;
      method = 'GET';
    } else if (action === 'insert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      // O dono é imposto aqui: o que vier no corpo é descartado, senão daria
      // para gravar uma linha em nome de outra pessoa.
      body = JSON.stringify(
        TABELAS_POR_ID.has(table) ? { ...data, id: dono } : { ...data, user_id: dono }
      );
    } else if (action === 'upsert') {
      url = `${supabaseUrl}/rest/v1/${table}`;
      method = 'POST';
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
      body = JSON.stringify(
        TABELAS_POR_ID.has(table) ? { ...data, id: dono } : { ...data, user_id: dono }
      );
    } else if (action === 'update') {
      if (!linhaQ) return res.status(400).json({ error: 'id ausente' });
      const { id, user_id, ...fields } = data;
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${linhaQ}&user_id=eq.${donoQ}`;
      method = 'PATCH';
      body = JSON.stringify(fields);
    } else if (action === 'delete') {
      if (!linhaQ) return res.status(400).json({ error: 'id ausente' });
      url = `${supabaseUrl}/rest/v1/${table}?id=eq.${linhaQ}&user_id=eq.${donoQ}`;
      await httpsRequest(url, { method: 'DELETE', headers }, null);
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid action: ' + action });
    }

    const result = await httpsRequest(url, { method, headers }, body);
    return res.status(result.status).json(result.body);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export const config = { maxDuration: 30 };
