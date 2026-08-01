#!/usr/bin/env python3
"""
Gera o Guia do Usuário do Lumen Post em PDF.

    python3 tools/gerar_guia.py

Escreve public/guia_usuario_lumen_post.pdf.

Este script existe porque o guia anterior não tinha um. Quando o conteúdo
precisava mudar, a única saída era carimbar texto por cima do PDF pronto — o
que funciona uma vez e apodrece na segunda. Aqui o guia é o CONTEUDO abaixo:
para atualizar, edite o texto e rode o comando.

Ao mudar a ferramenta, lembre que a Ajuda existe em dois lugares: o FAQ dentro
do index.html e este guia. Os dois precisam ser atualizados juntos.

Requer: pip install reportlab
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
import os

VERSAO = "4.0"
DATA = "Julho 2026"

# ─────────────────────────────────────────────────────────────────────────────
# CONTEÚDO — é isto que se edita.
#
# ("secao",  "Título da seção")        abre uma seção numerada
# ("sub",    "Subtítulo")              subtítulo dentro da seção
# ("p",      "parágrafo")              texto corrido
# ("li",     "item de lista")          item com marcador
# ("passo",  "item numerado")          passo de um procedimento
# ("nota",   "texto")                  caixa destacada
# ("tabela", [(col1, col2), ...])      duas colunas
# ─────────────────────────────────────────────────────────────────────────────

CONTEUDO = [
    ("secao", "Primeiros passos"),
    ("p", "Antes de gerar posts, preencha o Perfil da empresa. Ele fica numa página própria, "
          "chamada Perfil, no menu do site, e é compartilhado com o Lumen Mind e com as próximas "
          "ferramentas Lumen."),
    ("p", "O que você escreve lá — história, propósito, cliente ideal, tom de voz, diferenciais e "
          "restrições de marca — é usado pela IA em todo post gerado. Perfil vago produz post vago."),
    ("nota", "Marque também o que você consegue produzir com frequência: fotos, vídeos curtos ou "
             "artes prontas. Quando o Lumen Post monta uma programação sozinho, ele só sugere "
             "formatos que você tem como executar."),
    ("p", "A ferramenta funciona em computador, tablet e celular. Tudo é salvo na nuvem e sincroniza "
          "entre os dispositivos."),

    ("secao", "Aba Gerar — criação de posts"),
    ("sub", "O caminho, em ordem"),
    ("passo", "Selecione uma ou mais redes sociais"),
    ("passo", "Escolha o formato de cada rede"),
    ("passo", "Diga se você já tem a foto ou o vídeo, ou se ainda vai produzir"),
    ("passo", "Suba o material, quando houver"),
    ("passo", "Descreva o tema e escolha o tom"),
    ("passo", "Defina data e horário, se quiser (opcional)"),
    ("passo", "Clique em Gerar"),

    ("sub", "Formatos"),
    ("p", "Cada rede publica de maneiras diferentes, e cada uma delas pede um texto diferente. Um "
          "post de imagem única precisa de legenda; um carrossel precisa do texto de cada cartão; "
          "um vídeo curto precisa de roteiro. Não é a mesma coisa escrita de outro jeito — é "
          "conteúdo de natureza diferente."),
    ("p", "Por isso o formato é escolhido antes de gerar, e a ferramenta entrega o que aquele "
          "formato realmente pede. Os formatos de cada rede aparecem num bloco próprio, logo abaixo "
          "da seleção de redes."),

    ("sub", "Já tenho ou Ainda vou produzir"),
    ("p", "São dois momentos diferentes do trabalho, e eles pedem coisas opostas da IA."),
    ("li", "Já tenho — a foto ou o vídeo estão prontos. Você sobe o arquivo e recebe o texto pronto "
           "para publicar."),
    ("li", "Ainda vou produzir — você tem o tema, mas não tem o material. A IA não escreve a "
           "legenda: ela diz o que produzir. Que foto tirar e de que ângulo, o que mostrar em cada "
           "cartão, o roteiro do vídeo com o que falar e o que aparece na tela."),
    ("p", "Ao escolher Ainda vou produzir, o campo de arquivo desaparece — não há o que anexar — e "
          "o post é salvo com o status Em produção, esperando você gravar ou fotografar."),

    ("sub", "Imagens e vídeos"),
    ("p", "Os formatos que trabalham com várias imagens, como carrossel e stories, aceitam até dez "
          "de uma vez. A ordem em que você as escolhe é a ordem em que elas entram no post, e o "
          "texto segue essa ordem."),
    ("p", "A IA olha o material antes de escrever. Nas imagens ela vê a foto inteira; nos vídeos, "
          "o navegador extrai alguns quadros e são eles que ela analisa. Se o vídeo estiver num "
          "formato que o navegador não consegue abrir, a prévia avisa e o texto sai a partir do tema."),
    ("p", "Gerando para várias redes ao mesmo tempo, você pode subir imagens e vídeo juntos. Cada "
          "rede usa o que o formato dela pede, e a prévia mostra o que foi anexado."),

    ("sub", "Geração para várias redes"),
    ("p", "Ao selecionar mais de uma rede, cada uma recebe um texto adaptado à rede e ao formato "
          "escolhido, gerados em paralelo. O resultado aparece em abas separadas, cada uma com "
          "botões próprios de Copiar, Editar e Salvar. Use Salvar todas para guardar de uma vez."),

    ("secao", "Formatos de cada rede"),
    ("p", "Todo formato existe nos dois momentos: com o material em mãos, entrega o texto; sem o "
          "material, entrega a orientação do que produzir."),
    ("tabela", [
        ("Instagram", "Feed, Carrossel, Reels e Stories"),
        ("TikTok", "Vídeo e Foto (Photo Mode)"),
        ("Facebook", "Feed, Reels e Stories"),
        ("LinkedIn", "Post, Carrossel (documento) e Vídeo"),
        ("YouTube", "Vídeo longo e Shorts"),
        ("Pinterest", "Pin e Pin em vídeo"),
    ]),
    ("nota", "As redes que trabalham com título separado — YouTube e Pinterest — recebem título e "
             "descrição, não só o texto do post. No YouTube o título é o que mais pesa para ser "
             "encontrado e clicado."),

    ("secao", "Banco de Posts"),
    ("p", "Reúne todos os posts gerados e salvos. Dá para filtrar por status e por rede social."),
    ("p", "Cada post tem ações de Ver completo, Copiar, Baixar mídia, Alterar data, mudar status "
          "e Excluir."),
    ("sub", "Status"),
    ("li", "Em produção — tem orientação, falta o material"),
    ("li", "Rascunho — pronto, ainda não enviado para aprovação"),
    ("li", "Aprovado — liberado para publicar"),
    ("li", "Publicado — já foi ao ar"),
    ("sub", "Terminar um post Em produção"),
    ("p", "Quando o material estiver pronto, abra o post no Banco e clique em Já produzi — gerar "
          "legenda. A ferramenta reabre o gerador com rede, formato, tema, tom e data já "
          "preenchidos, pedindo só o arquivo."),
    ("p", "A IA recebe o roteiro que ela mesma escreveu junto com o que você produziu. Se você "
          "gravou diferente do planejado, ela segue o material, não o roteiro. Ao salvar, o post "
          "deixa de ser um roteiro e passa a ser o post final — não ficam os dois no Banco."),

    ("secao", "Lixeira"),
    ("p", "Post excluído vai para a Lixeira, no final da aba Banco, e fica sete dias disponível para "
          "restauração. Depois disso é removido em definitivo. Também dá para esvaziar a lixeira "
          "manualmente."),
    ("p", "Excluir uma programação inteira leva junto os posts dela que ainda estão em produção, em "
          "rascunho. Os aprovados e publicados ficam no Banco: são trabalho "
          "aprovado ou conteúdo que já foi ao ar. O aviso de confirmação diz quantos vão e quantos "
          "ficam."),

    ("secao", "Calendário Editorial"),
    ("p", "Mostra os posts distribuídos ao longo do mês. Clique num dia para ver o que está "
          "programado, ou num espaço vazio para criar o post daquela data."),
    ("p", "Posts Em produção aparecem com contorno tracejado, para não se confundirem com o que já "
          "pode ir ao ar."),

    ("secao", "Programações"),
    ("p", "Uma programação é um plano de publicação para um período. Você pode ter várias ao mesmo "
          "tempo — uma campanha de lançamento e o conteúdo do mês, por exemplo — e alternar entre "
          "elas no seletor acima do calendário."),
    ("sub", "Criar uma programação com IA"),
    ("p", "No Calendário, clique em Criar programação com IA e defina o nome, o período e as redes. "
          "A IA decide quantos posts criar, em quais datas e horários, e sugere um tema para cada "
          "um — considerando o perfil da empresa e, quando houver, os resumos do Lumen Mind."),
    ("p", "Nas redes que têm formatos, ela também escolhe o formato de cada post e varia ao longo do "
          "período. Aqui ela respeita o que você marcou no Perfil: quem não marca vídeo não recebe "
          "formatos de vídeo na programação."),
    ("p", "O formato escolhido aparece no espaço do calendário, e o gerador já abre nele quando você "
          "clica para preencher."),

    ("secao", "Perfil da empresa e resumos do Mind"),
    ("p", "O Perfil é preenchido uma vez e usado por todas as ferramentas Lumen. Quanto mais "
          "concreto, melhor o texto: números reais, diferenciais verdadeiros e o jeito como a "
          "empresa fala."),
    ("p", "Se você usa o Lumen Mind, os resumos marcados como ativos lá entram automaticamente nos "
          "posts gerados aqui — o que os clientes elogiam, reclamam e valorizam passa a informar o "
          "conteúdo."),

    ("secao", "Fluxo de aprovação"),
    ("p", "Use Copiar no Banco de Posts e mande o texto para quem vai aprovar pelo canal que essa "
          "pessoa já usa. Com a resposta, marque o post como Aprovado e, depois de publicar, como "
          "Publicado — o status acompanha onde cada post está."),
    ("nota", "O envio direto para aprovação está sendo refeito e volta em breve."),

    ("secao", "Aba Comentários"),
    ("p", "Cole o comentário recebido e, se quiser, a legenda do post que o gerou. A IA sugere uma "
          "resposta no tom da marca, respeitando as restrições do Perfil."),

    ("secao", "Link na Bio"),
    ("p", "Cria uma página própria com seus links, para colocar na bio do Instagram. Defina um "
          "endereço, um título e quantos links quiser; a prévia atualiza enquanto você edita. "
          "Depois de salvar, use Copiar link para levar o endereço para a rede."),

    ("secao", "Exportar e expiração"),
    ("p", "Exportar posts baixa todo o Banco em um arquivo de texto, com data, rede, status e "
          "conteúdo de cada post."),
    ("p", "Posts com status Publicado são removidos automaticamente cinco dias após a data de "
          "publicação, para não acumular. Os demais status nunca são removidos sozinhos, mesmo com "
          "a data vencida — por isso a contagem regressiva no Banco aparece só nos publicados."),

    ("secao", "Segurança e dados"),
    ("p", "Posts, perfil, resumos e programações ficam salvos na nuvem, vinculados ao seu login. "
          "Nenhum outro usuário tem acesso aos seus dados."),
    ("p", "O tema e o material são enviados para a IA apenas no momento de gerar o post. Nada é "
          "compartilhado com terceiros para fins de publicidade."),
]

FECHO = ("Precisa de ajuda ou encontrou um problema?",
         "Acesse a aba Ajuda dentro do Lumen Post ou escreva para contato@lumenlabs.com.br. "
         "Sua experiência como beta tester é muito valiosa.")

# ─────────────────────────────────────────────────────────────────────────────
# RENDERIZAÇÃO
# ─────────────────────────────────────────────────────────────────────────────

L, A = A4
MARGEM = 63
LARGURA = L - 2 * MARGEM
TOPO = A - 62
BASE = 92

VERDE_ESC = HexColor("#1B4332")
VERDE = HexColor("#2D6A4F")
VERDE_MED = HexColor("#40916C")
VERDE_CLA = HexColor("#74C69D")
TEXTO = HexColor("#2B2B2B")
CINZA = HexColor("#6B7280")
CINZA_CLA = HexColor("#E5E7EB")
FUNDO_NOTA = HexColor("#F0F7F3")

TITULO = f"Lumen Post · Guia do Usuário v{VERSAO}"


def quebrar(texto, fonte, tam, largura):
    """Quebra o texto em linhas que cabem na largura dada."""
    linhas, atual = [], ""
    for palavra in texto.split():
        teste = (atual + " " + palavra).strip()
        if stringWidth(teste, fonte, tam) <= largura:
            atual = teste
        else:
            if atual:
                linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


class Guia:
    def __init__(self, caminho):
        self.c = canvas.Canvas(caminho, pagesize=A4)
        self.y = TOPO
        self.pagina = 1
        self.secao = 0

    # ── infraestrutura ──
    def rodape(self):
        self.c.setFont("Helvetica", 7.5)
        self.c.setFillColor(CINZA)
        self.c.drawString(MARGEM, 52, TITULO)
        self.c.drawRightString(L - MARGEM, 52, f"Página {self.pagina}")
        self.c.setStrokeColor(CINZA_CLA)
        self.c.setLineWidth(0.5)
        self.c.line(MARGEM, 66, L - MARGEM, 66)

    def nova_pagina(self):
        self.rodape()
        self.c.showPage()
        self.pagina += 1
        self.y = TOPO

    def espaco(self, altura):
        """Garante altura livre; vira a página se não houver."""
        if self.y - altura < BASE:
            self.nova_pagina()

    # ── blocos ──
    def capa(self):
        c = self.c
        # Círculos concêntricos, bem claros, no canto superior direito
        c.setFillColor(HexColor("#EAF3EE"))
        for r in (210, 150, 92):
            c.circle(L - 40, A - 90, r, stroke=0, fill=1)
            c.setFillColor(HexColor("#DCEBE3") if r == 210 else HexColor("#CBE0D5"))
        c.setFillColor(HexColor("#EAF3EE"))
        c.circle(30, 150, 120, stroke=0, fill=1)

        # Painel principal
        c.setFillColor(VERDE_ESC)
        c.rect(MARGEM, 118, 472, 640, stroke=0, fill=1)

        c.setFillColor(VERDE_MED)
        c.roundRect(MARGEM + 46, 690, 116, 22, 11, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGEM + 60, 697, "LUMEN LABS")

        c.setFont("Helvetica", 34)
        c.drawString(MARGEM + 46, 480, "Lumen Post")
        c.setFillColor(VERDE_CLA)
        c.setFont("Helvetica", 15)
        c.drawString(MARGEM + 46, 448, "Guia do Usuário")

        c.setStrokeColor(VERDE_MED)
        c.setLineWidth(0.7)
        c.line(MARGEM + 46, 432, MARGEM + 344, 432)
        c.setFillColor(VERDE_CLA)
        c.setFont("Helvetica", 8.5)
        c.drawCentredString(MARGEM + 195, 416, f"Versão {VERSAO} · {DATA}")
        c.line(MARGEM + 46, 404, MARGEM + 344, 404)

        c.setFillColor(HexColor("#B7D9C7"))
        c.setFont("Helvetica", 9)
        c.drawString(MARGEM + 46, 372,
                     "Ferramenta de criação de conteúdo para redes sociais com IA,")
        c.drawString(MARGEM + 46, 358,
                     "desenvolvida pela Lumen Labs para pequenos e médios empresários.")

        c.setFillColor(TEXTO)
        c.setFont("Helvetica", 13)
        c.drawString(MARGEM, 86, "Índice")
        c.showPage()
        self.pagina += 1
        self.y = TOPO

    def indice(self, secoes):
        c = self.c
        for i, nome in enumerate(secoes, 1):
            self.espaco(19)
            c.setFillColor(CINZA)
            c.setFont("Helvetica", 8.5)
            c.drawRightString(MARGEM + 14, self.y, str(i))
            c.setFillColor(TEXTO)
            c.setFont("Helvetica", 9.5)
            c.drawString(MARGEM + 26, self.y, nome)
            self.y -= 18.5
        self.y -= 12

    def h_secao(self, titulo):
        self.secao += 1
        self.espaco(52)
        c = self.c
        c.setFillColor(VERDE_ESC)
        c.roundRect(MARGEM, self.y - 22, LARGURA, 26, 5, stroke=0, fill=1)
        c.setFillColor(VERDE_MED)
        c.circle(MARGEM + 18, self.y - 9, 9, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(MARGEM + 18, self.y - 12, str(self.secao))
        c.setFont("Helvetica", 11)
        c.drawString(MARGEM + 36, self.y - 12.5, titulo)
        self.y -= 40

    def h_sub(self, titulo):
        self.espaco(30)
        self.c.setFillColor(VERDE_MED)
        self.c.setFont("Helvetica", 10.5)
        self.c.drawString(MARGEM, self.y, titulo)
        self.y -= 17

    def paragrafo(self, texto, recuo=0, cor=TEXTO, tam=9.2, entre=13.2):
        largura = LARGURA - recuo
        for linha in quebrar(texto, "Helvetica", tam, largura):
            self.espaco(entre)
            self.c.setFillColor(cor)
            self.c.setFont("Helvetica", tam)
            self.c.drawString(MARGEM + recuo, self.y, linha)
            self.y -= entre
        self.y -= 5

    def item(self, texto, marcador="•"):
        self.espaco(15)
        self.c.setFillColor(VERDE_MED)
        self.c.setFont("Helvetica", 9.2)
        self.c.drawString(MARGEM + 4, self.y, marcador)
        self.paragrafo(texto, recuo=20)
        self.y += 2

    def nota(self, texto):
        linhas = quebrar(texto, "Helvetica", 9, LARGURA - 32)
        altura = len(linhas) * 13 + 20
        self.espaco(altura + 8)
        c = self.c
        c.setFillColor(FUNDO_NOTA)
        c.roundRect(MARGEM, self.y - altura + 10, LARGURA, altura, 5, stroke=0, fill=1)
        c.setFillColor(VERDE_MED)
        c.rect(MARGEM, self.y - altura + 10, 3, altura, stroke=0, fill=1)
        y = self.y - 2
        for linha in linhas:
            c.setFillColor(HexColor("#1F4F3A"))
            c.setFont("Helvetica", 9)
            c.drawString(MARGEM + 16, y, linha)
            y -= 13
        self.y -= altura + 6

    def tabela(self, linhas):
        for esquerda, direita in linhas:
            self.espaco(20)
            c = self.c
            c.setFillColor(VERDE_MED)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(MARGEM + 4, self.y, esquerda)
            c.setFillColor(TEXTO)
            c.setFont("Helvetica", 9)
            c.drawString(MARGEM + 108, self.y, direita)
            c.setStrokeColor(CINZA_CLA)
            c.setLineWidth(0.4)
            c.line(MARGEM, self.y - 7, L - MARGEM, self.y - 7)
            self.y -= 21
        self.y -= 6

    def fecho(self, titulo, texto):
        linhas = quebrar(texto, "Helvetica", 9, LARGURA - 32)
        altura = len(linhas) * 13 + 38
        self.espaco(altura + 10)
        c = self.c
        c.setFillColor(VERDE_ESC)
        c.roundRect(MARGEM, self.y - altura + 10, LARGURA, altura, 5, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGEM + 16, self.y - 6, titulo)
        y = self.y - 26
        for linha in linhas:
            c.setFillColor(HexColor("#B7D9C7"))
            c.setFont("Helvetica", 9)
            c.drawString(MARGEM + 16, y, linha)
            y -= 13
        self.y -= altura + 6

    def salvar(self):
        self.rodape()
        self.c.save()


def gerar(caminho):
    g = Guia(caminho)
    g.capa()
    g.indice([t for tipo, t in CONTEUDO if tipo == "secao"])

    for tipo, valor in CONTEUDO:
        if tipo == "secao":
            g.h_secao(valor)
        elif tipo == "sub":
            g.h_sub(valor)
        elif tipo == "p":
            g.paragrafo(valor)
        elif tipo == "li":
            g.item(valor)
        elif tipo == "passo":
            g.item(valor, marcador="›")
        elif tipo == "nota":
            g.nota(valor)
        elif tipo == "tabela":
            g.tabela(valor)

    g.fecho(*FECHO)
    g.salvar()
    return g.pagina


if __name__ == "__main__":
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    destino = os.path.join(raiz, "public", "guia_usuario_lumen_post.pdf")
    paginas = gerar(destino)
    print(f"✓ {destino} — {paginas} páginas, versão {VERSAO}")
