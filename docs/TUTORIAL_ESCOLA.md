# Guia rápido - BarberConnect na escola

## Antes da apresentação (uma única vez)

1. Envie as alterações do projeto para o repositório e publique o serviço no Render usando o arquivo `render.yaml`.
2. No painel do Render, abra o serviço **barberconnect** e copie a URL pública, no formato `https://...onrender.com`.
3. Em **Environment**, configure `ADMIN_EMAILS=davidcostaalmeida3@gmail.com` e faça um novo deploy.
4. Abra a URL em uma janela anônima, faça login e confirme que o mapa, os perfis e os agendamentos carregam.
5. Guarde a URL no celular, envie por e-mail ou coloque-a em um QR Code para abrir rapidamente no dia.

## No notebook da escola

1. Conecte o notebook à internet e abra Chrome, Edge ou Firefox atualizado.
2. Cole a URL pública do BarberConnect na barra de endereços.
3. Não instale Node.js, VS Code, PostgreSQL, extensões ou qualquer programa. O navegador é suficiente.
4. Faça login com a conta de cliente em uma guia e com a conta de barbeiro em outra guia anônima ou outro perfil do navegador.
5. Para demonstrar a administração, entre com `davidcostaalmeida3@gmail.com`, abra **Admin** e confirme que a lista não possui cadastros E2E.
6. Antes de projetar a tela, atualize a página uma vez e confira a conexão com a internet.

## Se ocorrer algum problema

- **A página demora ao abrir:** aguarde até um minuto. Serviços gratuitos podem despertar após ficarem inativos.
- **Login não funciona:** confira se a URL é a do serviço publicado, não `localhost`. `localhost` funciona somente no computador que executa o servidor.
- **Sem internet:** a demonstração completa não poderá funcionar sem o servidor hospedado. Use as capturas de tela e explique que a API e o banco estão na nuvem.
- **Botão Admin não aparece:** confirme o e-mail em `ADMIN_EMAILS`, reinicie o serviço no Render e entre novamente na conta.

## Observação técnica

O modo local continua disponível para desenvolvimento. `npm run dev` agora verifica dependências ausentes e executa `npm ci` automaticamente. Mesmo assim, o modo local exige Node.js e PostgreSQL; por isso a URL publicada é a opção recomendada para a escola.
