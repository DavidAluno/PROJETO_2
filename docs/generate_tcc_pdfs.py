from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output' / 'pdf'
OUTPUT.mkdir(parents=True, exist_ok=True)

BG = colors.HexColor('#10110d')
LIME = colors.HexColor('#d9ff3f')
LIGHT = colors.HexColor('#f6f6f1')
MUTED = colors.HexColor('#5e6658')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BCover', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=28, leading=32, textColor=BG, spaceAfter=14))
styles.add(ParagraphStyle(name='BSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=17, textColor=MUTED, spaceAfter=20))
styles.add(ParagraphStyle(name='BHeading', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=BG, spaceBefore=10, spaceAfter=10))
styles.add(ParagraphStyle(name='BBody', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.5, leading=15, textColor=BG, spaceAfter=8))
styles.add(ParagraphStyle(name='BStep', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.5, leading=15, textColor=BG, leftIndent=14, firstLineIndent=-14, spaceAfter=7))
styles.add(ParagraphStyle(name='BLabel', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#506000'), spaceAfter=5))
styles.add(ParagraphStyle(name='BQuote', parent=styles['BodyText'], fontName='Helvetica-Oblique', fontSize=10.5, leading=15, textColor=BG, backColor=colors.HexColor('#edf8cf'), borderColor=colors.HexColor('#c1db68'), borderWidth=.5, borderPadding=10, spaceBefore=4, spaceAfter=12))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#d9ded2'))
    canvas.line(2*cm, 1.55*cm, A4[0]-2*cm, 1.55*cm)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2*cm, 1.1*cm, 'BarberConnect - material de apresentação do TCC')
    canvas.drawRightString(A4[0]-2*cm, 1.1*cm, f'Página {doc.page}')
    canvas.restoreState()

def doc_for(path):
    return SimpleDocTemplate(str(path), pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2.2*cm, title='BarberConnect - TCC')

def guide_pdf():
    story = [
        Paragraph('BarberConnect', styles['BCover']),
        Paragraph('Guia prático para iniciar a demonstração no notebook da escola', styles['BSubtitle']),
        Paragraph('Opção recomendada: site publicado', styles['BHeading']),
        Paragraph('Esta é a forma indicada para a banca. O notebook da escola precisa somente de navegador e internet. Node.js, VS Code e PostgreSQL ficam fora do computador da apresentação.', styles['BBody']),
        Paragraph('URL pública para preencher antes da banca: ________________________________________________', styles['BQuote']),
        Paragraph('Antes do dia da apresentação', styles['BHeading']),
        Paragraph('<b>1.</b> Crie o banco gratuito no Supabase e copie a DATABASE_URL privada.', styles['BStep']),
        Paragraph('<b>2.</b> Envie a versão validada ao repositório e publique o projeto no Render pelo arquivo render.yaml.', styles['BStep']),
        Paragraph('<b>3.</b> Na criação do Blueprint, cole a DATABASE_URL do Supabase e configure ADMIN_EMAILS com davidcostaalmeida3@gmail.com.', styles['BStep']),
        Paragraph('<b>4.</b> Copie a URL pública gerada pelo Render e abra-a em uma janela anônima.', styles['BStep']),
        Paragraph('<b>5.</b> Faça um teste completo: login, mapa, agendamento, painel do barbeiro e duas contas em guias distintas.', styles['BStep']),
        Paragraph('No notebook da escola', styles['BHeading']),
        Paragraph('<b>1.</b> Conecte-se à internet e abra Chrome, Edge ou Firefox.', styles['BStep']),
        Paragraph('<b>2.</b> Cole a URL pública na barra de endereços.', styles['BStep']),
        Paragraph('<b>3.</b> Não instale programas. O sistema já está hospedado: API no Render e banco no Supabase.', styles['BStep']),
        Paragraph('<b>4.</b> Abra uma guia para cliente e uma guia anônima para barbeiro. As sessões não se misturam.', styles['BStep']),
        Paragraph('<b>5.</b> Entre com o e-mail administrador caso precise usar a tela Admin para moderar cadastros.', styles['BStep']),
        PageBreak(),
        Paragraph('Plano B e conferência rápida', styles['BCover']),
        Paragraph('O que fazer caso algo não saia como planejado', styles['BSubtitle']),
        Paragraph('Checklist de 2 minutos', styles['BHeading']),
        Paragraph('<b>1.</b> Atualize a página uma vez antes de projetar a tela.', styles['BStep']),
        Paragraph('<b>2.</b> Confirme o ícone de internet e a URL pública. Não use localhost no notebook da escola.', styles['BStep']),
        Paragraph('<b>3.</b> Se o primeiro acesso demorar, aguarde até um minuto: provedores gratuitos podem despertar após inatividade.', styles['BStep']),
        Paragraph('<b>4.</b> Se o Admin não aparecer, saia e entre novamente após conferir ADMIN_EMAILS no painel de hospedagem.', styles['BStep']),
        Paragraph('Importante', styles['BHeading']),
        Paragraph('O modo local é para desenvolvimento. Embora npm run dev recupere automaticamente dependências ausentes, ele ainda precisa de Node.js e PostgreSQL. Para a escola, use a URL hospedada.', styles['BQuote']),
        Paragraph('Fluxo que deve ser demonstrado', styles['BHeading']),
        Paragraph('Cliente entra - encontra uma barbearia no mapa - abre o perfil e portfólio - escolhe serviço e horário - confirma o agendamento. Em outra guia, o barbeiro vê o pedido, organiza a agenda e conclui o atendimento.', styles['BBody']),
    ]
    doc_for(OUTPUT / 'Guia_Escola_BarberConnect.pdf').build(story, onFirstPage=footer, onLaterPages=footer)

def script_pdf():
    story = [
        Paragraph('Roteiro de apresentação', styles['BCover']),
        Paragraph('BarberConnect - TCC para duas pessoas - duração sugerida: 8 a 10 minutos', styles['BSubtitle']),
        Paragraph('Divisão simples', styles['BHeading']),
        Table([
            ['Pessoa 1', 'Contexto, problema, cliente e descoberta no mapa'],
            ['Pessoa 2', 'Barbeiro, arquitetura, segurança e encerramento'],
        ], colWidths=[3.2*cm, 12.6*cm], style=TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#edf8cf')),
            ('TEXTCOLOR', (0,0), (-1,-1), BG),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), .5, colors.HexColor('#cbd4c2')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
            ('TOPPADDING', (0,0), (-1,-1), 9), ('BOTTOMPADDING', (0,0), (-1,-1), 9),
        ])), Spacer(1, 16),
        Paragraph('Pessoa 1 - abertura e experiência do cliente (aprox. 4 minutos)', styles['BHeading']),
        Paragraph('<b>1. Abertura.</b> "Nosso projeto é o BarberConnect, uma plataforma que aproxima clientes de barbearias. O problema que resolvemos é a dificuldade de encontrar profissionais, comparar serviços e marcar um horário de forma organizada."', styles['BStep']),
        Paragraph('<b>2. Objetivo.</b> "Para o cliente, o sistema mostra localização, serviços, portfólio e avaliações. Para o barbeiro, ele organiza agenda, serviços e presença digital."', styles['BStep']),
        Paragraph('<b>3. Demonstração no mapa.</b> Abra a conta de cliente. Mostre a pesquisa, os filtros e os cards de barbearia. Diga: "Aqui o usuário escolhe com base em distância, nota, disponibilidade e especialidades reais cadastradas."', styles['BStep']),
        Paragraph('<b>4. Perfil e confiança.</b> Abra uma barbearia. Mostre serviços, preço, duração, avaliações e portfólio. Diga: "O portfólio ajuda o cliente a avaliar o estilo do profissional antes de reservar."', styles['BStep']),
        Paragraph('<b>5. Agendamento.</b> Selecione um serviço e um horário. Diga: "O sistema não aceita um horário arbitrário: a API consulta horários de funcionamento, bloqueios e reservas existentes antes de confirmar."', styles['BStep']),
        Paragraph('<b>6. Transição.</b> "Agora vamos mostrar o outro lado: como o barbeiro recebe e administra esse atendimento."', styles['BQuote']),
        PageBreak(),
        Paragraph('Pessoa 2 - barbeiro, tecnologia e encerramento (aprox. 4 minutos)', styles['BCover']),
        Paragraph('<b>1. Painel do barbeiro.</b> Em outra guia, entre como barbeiro. Mostre o dashboard, métricas, agenda e status. Diga: "O profissional consegue acompanhar pedidos e transformar a agenda em uma rotina organizada."', styles['BStep']),
        Paragraph('<b>2. Gestão.</b> Mostre serviços, horários de funcionamento, bloqueios de agenda e portfólio. Diga: "Essas configurações não são apenas visuais: elas determinam os horários disponíveis ao cliente."', styles['BStep']),
        Paragraph('<b>3. Segurança e banco.</b> "Usamos React e Vite no frontend; Node.js, Express e PostgreSQL no backend. A autenticação usa JWT, senhas são protegidas com bcrypt, e há validações de perfil e posse dos dados."', styles['BStep']),
        Paragraph('<b>4. Integridade.</b> "No banco, agendamentos usam transação e uma restrição única para impedir dupla reserva. Também há migrations versionadas para reproduzir a estrutura do banco."', styles['BStep']),
        Paragraph('<b>5. Qualidade.</b> "O projeto possui lint, build, testes automatizados, E2E, pipeline de CI e publicação preparada para Render. A aplicação também é PWA e mantém sessões independentes por guia."', styles['BStep']),
        Paragraph('<b>6. Encerramento.</b> "Como próximos passos, poderíamos incluir pagamentos, lembretes por WhatsApp e mais análises para o barbeiro. Hoje, o produto já entrega o fluxo principal completo: descobrir, escolher, agendar, atender e avaliar."', styles['BStep']),
        Paragraph('Dica final para os dois', styles['BHeading']),
        Paragraph('Evitem ler o texto inteiro. Use o roteiro como guia, mantenham a demonstração em um caminho simples e tenham uma captura de tela disponível apenas como plano B para falhas de internet.', styles['BQuote']),
    ]
    doc_for(OUTPUT / 'Roteiro_Apresentacao_BarberConnect.pdf').build(story, onFirstPage=footer, onLaterPages=footer)

if __name__ == '__main__':
    guide_pdf()
    script_pdf()
    print(OUTPUT)
