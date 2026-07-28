const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'guia_usuario_lumen_post.pdf');
    const file = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    // attachment, não inline: dentro do iframe do Wix o sandbox barra abrir
    // uma aba, e é o cabeçalho de anexo que faz o arquivo baixar sem sair da
    // página. Ver a ponte lumen-export no index.html.
    res.setHeader('Content-Disposition', 'attachment; filename="Guia_Lumen_Post.pdf"');
    res.status(200).send(file);
  } catch (e) {
    res.status(404).json({ error: 'Guia nao encontrado' });
  }
};
