// Regenera public/guia_usuario_lumen_post.pdf com o mesmo design (capa verde
// escura, selos numerados, tabelas). Editar o conteudo diretamente neste arquivo.
//
// Uso:
//   cd tools/guia-pdf && npm install   (uma vez, instala o pdfkit)
//   node gerar_guia_post.js            (sobrescreve public/guia_usuario_lumen_post.pdf)
//
// Atualize VERSAO abaixo a cada edicao de conteudo.
const path = require('path');
const {
  makeDoc, cover, tocHeader, tocRows, sectionHeader,
  subHead, paragraph, bulletList, noteItalic, table, finalizeFooters, TEXT, MARGIN, CONTENT_W,
} = require('./post-pdf-helpers');

const VERSAO = 'Versão 3.1 · Julho 2026';
const OUT = process.argv[2] || path.join(__dirname, '../../public/guia_usuario_lumen_post.pdf');

const doc = makeDoc(OUT, 'Lumen Post - Guia do Usuário');

cover(doc, 'Lumen Post', VERSAO, [
  'Ferramenta de criação de conteúdo para redes sociais com IA,',
  'desenvolvida pela Lumen Labs para pequenos e médios empresários.',
]);

tocHeader(doc, 'Índice');
tocRows(doc, [
  'Primeiros passos',
  'Aba Gerar — criação de posts',
  'Banco de Posts',
  'Lixeira',
  'Exportar posts',
  'Calendário Editorial',
  'Programações',
  'Aba Comentários',
  'Fluxo de aprovação',
  'Perfil da empresa e Resumos do Mind',
  'Expiração automática de posts',
  'Segurança e dados',
]);

doc.addPage();

// 1
sectionHeader(doc, 1, 'Primeiros passos');
paragraph(doc,
  'Antes de gerar posts, configure o Perfil da empresa na aba Perfil (agora uma página própria, ' +
  'compartilhada com o Lumen Mind). Preencha o nome, a história, o propósito, o cliente ideal, o ' +
  'tom de voz e os diferenciais. Essas informações são usadas pela IA em todos os posts gerados e ' +
  'na aba Comentários.');
paragraph(doc,
  'O Lumen Post funciona em computador, tablet e celular. Todos os dados são salvos na nuvem e ' +
  'sincronizam automaticamente entre dispositivos.');

// 2
sectionHeader(doc, 2, 'Aba Gerar — criação de posts');
subHead(doc, 'Como gerar um post');
bulletList(doc, [
  '1. Selecione uma ou mais redes sociais',
  '2. Escolha o tom (Autoridade, Emocional, Bastidores, Educativo ou Humor)',
  '3. Faça upload de imagem ou vídeo (opcional)',
  '4. Defina a data e horário de publicação (opcional)',
  '5. Descreva o tema do post',
  '6. Clique em "Gerar"',
]);
subHead(doc, 'Geração multi-rede');
paragraph(doc,
  'Ao selecionar mais de uma rede, cada uma recebe um texto adaptado ao seu formato e ' +
  'linguagem, gerados em paralelo. O resultado aparece em abas separadas. Cada aba tem botões ' +
  'próprios de Copiar, Editar e Salvar. Use "Salvar todas" para salvar de uma vez.');
subHead(doc, 'Imagens e vídeos');
paragraph(doc,
  'Ao fazer upload de uma imagem, a IA analisa visualmente e cria um post baseado no que vê. ' +
  'Imagens são redimensionadas automaticamente para 1080px. Vídeos também podem ser enviados ' +
  '— a IA reconhece que há um vídeo e adapta o texto.');
subHead(doc, 'Insights do Lumen Mind');
paragraph(doc,
  'Sempre que houver resumos marcados como ativos no Lumen Mind (aba Históricos, seção ' +
  '"Resumos salvos"), o Post usa todos eles automaticamente como contexto ao gerar o texto — ' +
  'não é preciso fazer nada além de deixá-los marcados por lá.');
subHead(doc, 'Data, horário e sugestões');
paragraph(doc,
  'Para posts gerais, a ferramenta sugere automaticamente os melhores horários para cada rede ' +
  'social. Para posts criados a partir de espaços de uma programação automática, o horário é ' +
  'preenchido automaticamente pela IA, sem necessidade de ação do usuário.');
subHead(doc, 'Editar e limpar');
paragraph(doc,
  'Clique em "Editar" na aba do resultado para editar o texto diretamente. Após gerar, a rede ' +
  'fica travada — para trocar de rede clique em "Limpar" e gere novamente.');

// 3
sectionHeader(doc, 3, 'Banco de Posts');
paragraph(doc, 'O Banco reúne todos os posts gerados e salvos. Use os filtros para encontrar posts por status ou rede social.');
subHead(doc, 'Status disponíveis');
bulletList(doc, [
  'Rascunho — recém-gerado, ainda não revisado',
  'Aguardando aprovação — enviado para aprovação por email',
  'Aprovado — aprovado para publicação',
  'Publicado — já publicado nas redes sociais',
]);
subHead(doc, 'Ações em cada post');
bulletList(doc, [
  'Ver completo — abre o post com data, horário e imagem em modal',
  'Copiar — copia o texto para a área de transferência',
  'Baixar mídia — faz download da imagem ou vídeo original',
  'Alterar data — altera a data de publicação e atualiza o Calendário',
  'Aprovar por email — envia o post para aprovação',
  'Aprovado / Publicado — muda o status manualmente',
  'Excluir — move para a Lixeira (não exclui imediatamente)',
]);
subHead(doc, 'Indicador de expiração');
paragraph(doc,
  'Posts com data de publicação exibem um contador regressivo. Quando faltam 3 dias ou menos, ' +
  'o aviso fica amarelo. Com 1 dia ou no dia, fica vermelho. Somente posts com status ' +
  '"Publicado" são removidos automaticamente após 5 dias da data de publicação.');

// 4
sectionHeader(doc, 4, 'Lixeira');
paragraph(doc,
  'Ao excluir um post, ele vai para a Lixeira — não é apagado imediatamente. A Lixeira aparece ' +
  'no final da aba Banco quando há posts excluídos.');
bulletList(doc, [
  'Cada post mostra quantos dias restam antes da remoção permanente (7 dias)',
  'Use "Restaurar" para recuperar o post e devolvê-lo ao Banco',
  'Use "Excluir" para remover permanentemente (com confirmação)',
  'Use "Esvaziar lixeira" para remover todos de uma vez',
]);

// 5
sectionHeader(doc, 5, 'Exportar posts');
paragraph(doc, 'No Banco de Posts, clique em "Exportar posts". Um modal abre com todos os posts formatados em texto legível.');
bulletList(doc, [
  '"Copiar tudo" — copia todo o conteúdo para colar num documento de texto',
  '"Gerar PDF" — abre o diálogo de impressão do navegador para salvar como PDF',
]);
noteItalic(doc, 'As imagens dos posts não são exportadas — apenas texto e metadados.');

// 6
sectionHeader(doc, 6, 'Calendário Editorial');
paragraph(doc,
  'O Calendário exibe posts e espaços vazios da programação selecionada no seletor. Cada ' +
  'programação funciona como uma "vista" separada — trocar a programação atualiza todo o ' +
  'calendário.');
subHead(doc, 'Cards do Calendário');
paragraph(doc,
  'Cada post aparece como um card colorido com o nome da rede, o horário (quando definido) e ' +
  'um ícone de câmera quando há imagem. Clique no card para ver o post completo com data, ' +
  'horário, imagem e texto.');
subHead(doc, 'Espaços vazios');
paragraph(doc,
  'Espaços pré-definidos pela programação aparecem com borda tracejada e cor da rede ' +
  'correspondente. Clique num espaço vazio para ir ao Gerador com a data e a rede já ' +
  'configuradas.');
subHead(doc, 'Alterar data pelo Calendário');
paragraph(doc,
  'Clique num post no Calendário para abrir o modal e use "Alterar data" para mover o post ' +
  'para outra data. O post é atualizado automaticamente no banco e no calendário.');

// 7
sectionHeader(doc, 7, 'Programações');
paragraph(doc,
  'Programações são grades editoriais com espaços pré-definidos por data e rede social. Você ' +
  'pode ter várias programações salvas e alternar entre elas no seletor do Calendário.');
subHead(doc, 'Programação "Posts gerais"');
paragraph(doc,
  'Criada automaticamente e indestrutível. Recebe todos os posts criados livremente no ' +
  'Gerador. Funciona como a programação padrão — qualquer post sem vínculo com outra ' +
  'programação aparece aqui.');
subHead(doc, 'Criar programação com IA');
paragraph(doc,
  'No Calendário, clique em "Criar programação com IA". Defina o nome, o período e as redes ' +
  'sociais. A IA decide quantos posts criar, em quais datas e horários, considerando uma ' +
  'frequência saudável e o Perfil da empresa — incluindo, quando disponíveis, os resumos ' +
  'ativos do Lumen Mind. Pode sugerir mais de um post da mesma rede num mesmo dia quando ' +
  'fizer sentido estratégico.');
subHead(doc, 'Editar uma programação');
paragraph(doc,
  'Clique em "Editar programação" para ativar o modo de edição. Qualquer dia do calendário ' +
  'fica clicável. Ao clicar numa data, um modal permite adicionar ou remover espaços por rede ' +
  'social usando botões + e -. Clique em "Concluir edição" ao terminar.');
subHead(doc, 'Preencher um espaço vazio');
paragraph(doc,
  'Clique no espaço tracejado no calendário. O Gerador abre com a data e a rede já ' +
  'configuradas, e o horário preenchido automaticamente pela IA. Descreva o tema e gere o ' +
  'post. Ao salvar, o espaço é preenchido e substituído pelo post real no calendário.');

// 8
sectionHeader(doc, 8, 'Aba Comentários');
paragraph(doc, 'A aba Comentários gera respostas para comentários recebidos nas redes sociais, no tom da sua marca.');
subHead(doc, 'Como usar');
bulletList(doc, [
  '1. Selecione a rede social de onde veio o comentário',
  '2. Escolha o tom da resposta',
  '3. Escolha a postura: Concordar, Discordar, Neutro ou Contornar',
  '4. Cole o comentário recebido (obrigatório)',
  '5. Cole a legenda do post que gerou o comentário (opcional)',
  '6. Adicione um argumento ou explicação a incorporar (opcional)',
  '7. Clique em "Gerar resposta"',
]);
subHead(doc, 'Posturas disponíveis');
bulletList(doc, [
  'Concordar — agradecer e reforçar o engajamento positivo',
  'Discordar — rebater com respeito e firmeza, mantendo a postura da marca',
  'Neutro — responder sem concordar nem discordar explicitamente',
  'Contornar — transformar a crítica em oportunidade, mostrando evolução da marca',
]);
noteItalic(doc, 'O histórico de respostas não é salvo — a aba é efêmera. Use "Copiar" para guardar a resposta antes de fechar ou limpar.');

// 9
sectionHeader(doc, 9, 'Fluxo de aprovação');
paragraph(doc,
  'No Banco de Posts, clique em "Aprovar por email" no card desejado. Insira o email do ' +
  'aprovador e clique em Enviar. O post muda para "Aguardando aprovação" automaticamente.');
paragraph(doc,
  'O aprovador recebe o texto por email. Quando aprovado, mude o status para "Aprovado" ' +
  'manualmente no Banco. Quando publicado nas redes, mude para "Publicado" para acionar a ' +
  'contagem de expiração.');

// 10
sectionHeader(doc, 10, 'Perfil da empresa e Resumos do Mind');
paragraph(doc,
  'O Perfil é a base de todos os posts gerados. Quanto mais completo, mais preciso e alinhado ' +
  'com a marca será o conteúdo. Ele não fica mais dentro do Post — agora é uma página própria, ' +
  'chamada Perfil, compartilhada com o Lumen Mind e as próximas ferramentas Lumen. Preencha:');
bulletList(doc, [
  'Nome da empresa',
  'História e descrição — o que a empresa faz, há quanto tempo, onde atua',
  'Propósito — a missão ou razão de existir da empresa',
  'Cliente ideal — quem é o público-alvo',
  'Tom de voz e personalidade — como a marca se comunica',
  'Diferenciais — o que torna a empresa única',
]);
noteItalic(doc, 'Clique em "Salvar perfil" após preencher. O perfil fica salvo na nuvem e é usado por todas as ferramentas Lumen.');
subHead(doc, 'Resumos ativos do Lumen Mind');
paragraph(doc,
  'No Lumen Mind, você pode salvar vários resumos (de análises ou conversas) e marcar quais ' +
  'ficam ativos, na aba Históricos. O Lumen Post busca automaticamente todos os resumos ' +
  'marcados como ativos e os usa juntos como contexto extra ao gerar posts e programações — ' +
  'sem precisar configurar nada aqui no Post.');

// 11
sectionHeader(doc, 11, 'Expiração automática de posts');
paragraph(doc,
  'Para evitar acúmulo de conteúdo, posts com status "Publicado" são removidos ' +
  'automaticamente do Banco e do Calendário 5 dias após a data de publicação.');
table(doc, ['Status', 'Expira automaticamente?'], [
  ['Publicado', 'Sim — 5 dias após a data de publicação'],
  ['Rascunho', 'Nunca'],
  ['Aprovado', 'Nunca'],
  ['Sem data definida', 'Nunca'],
], [180, 324], 1);

// 12
sectionHeader(doc, 12, 'Segurança e dados');
paragraph(doc,
  'Todos os posts, perfil, resumos e programações ficam salvos na nuvem via Supabase, ' +
  'vinculados ao seu ID de usuário. Nenhum outro usuário tem acesso aos seus dados.');
paragraph(doc,
  'O texto do tema e a imagem são enviados para a IA apenas no momento de gerar o post. ' +
  'Nenhum dado é compartilhado com terceiros para fins de publicidade.');

doc.moveDown(1);
doc.font('Helvetica').fontSize(9).fillColor(TEXT).text('Lumen Post v3.1 · Lumen Labs · 2026', MARGIN, doc.y, { width: CONTENT_W, align: 'center' });
doc.font('Helvetica').fontSize(9).text('Para suporte, entre em contato pela aba Ajuda dentro da ferramenta.', MARGIN, doc.y + 2, { width: CONTENT_W, align: 'center' });

finalizeFooters(doc, 'Lumen Post · Guia do Usuário v3.1');

doc.end();
console.log('PDF gerado:', OUT);
