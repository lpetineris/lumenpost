// ---------------------------------------------------------------------------
// Conferência de passe — diagnóstico.
//
// Diz se um passe é válido AQUI, neste projeto. Serve para confirmar que os
// três projetos compartilham o mesmo segredo: um passe emitido pelo Post tem
// que ser aceito pelo Mind e pelo Perfil.
//
// Não emite nada e não devolve dado de usuário, só o veredito.
// ---------------------------------------------------------------------------
import { lerPasse, segredoDoAmbiente } from './_auth.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lumen-Passe');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const segredo = segredoDoAmbiente();
  if (!segredo) return res.status(200).json({ configurado: false });

  const token = (req.body && req.body.token) || (req.query && req.query.token) || null;
  if (!token) return res.status(200).json({ configurado: true, informado: false });

  return res.status(200).json({ configurado: true, informado: true, ...lerPasse(token, segredo) });
}

export const config = { maxDuration: 10 };
