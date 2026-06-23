import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const filePath = join(process.cwd(), 'public', 'guia_usuario_lumen_post.pdf');
    const file = readFileSync(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Guia_Lumen_Post.pdf"');
    res.status(200).send(file);
  } catch (e) {
    res.status(404).json({ error: 'Guia não encontrado' });
  }
}

export const config = { maxDuration: 10 };
