# Publicar o BarberConnect sem banco pago do Render

Esta configuração usa **Supabase** para o PostgreSQL e **Render Free** somente para a aplicação web/API. O plano gratuito do Supabase é suficiente para uma demonstração de TCC, mas pode pausar após período de inatividade. Acesse o sistema antes da apresentação para despertá-lo.

## Parte 1 - criar o banco no Supabase

1. Acesse `https://supabase.com/dashboard` e crie uma conta.
2. Clique em **New project**.
3. Escolha um nome como `barberconnect-tcc`, uma região próxima do Brasil e crie uma senha forte para o banco. Guarde-a em local seguro.
4. Espere o projeto ficar pronto.
5. Abra **Connect** e selecione a conexão para aplicações com Node.js. Copie a URL de conexão PostgreSQL, normalmente iniciada por `postgresql://` ou `postgres://`.

> Não publique essa URL no GitHub, no README ou em capturas de tela. Ela contém a senha do banco.

## Parte 2 - publicar no Render

1. Envie para o GitHub a versão que contém o novo `render.yaml`.
2. Em `https://dashboard.render.com`, clique em **New +** e escolha **Blueprint**.
3. Selecione o repositório `DavidAluno/PROJETO_2`.
4. Na tela de variáveis, preencha **DATABASE_URL** com a URL copiada do Supabase.
5. Confira estas variáveis:
   - `DB_SSL=true`
   - `ADMIN_EMAILS=davidcostaalmeida3@gmail.com`
   - `JWT_SECRET` é gerado automaticamente pelo Render.
6. Clique para criar o serviço. O arquivo agora pede `plan: free` e não cria um banco Render.
7. Espere o deploy. Quando o log informar que o servidor está ativo, copie a URL `https://...onrender.com`.

Na primeira inicialização, o Docker executa as migrations automaticamente e cria as tabelas no Supabase.

## Parte 3 - testar antes da banca

1. Abra a URL pública em uma guia anônima.
2. Cadastre uma conta de cliente e uma de barbeiro, ou entre nas contas de demonstração.
3. Cadastre uma barbearia, serviços, horários e uma imagem de portfólio.
4. Faça um agendamento pelo cliente e aceite/conclua pelo barbeiro em outra guia.
5. Entre com `davidcostaalmeida3@gmail.com`; a opção **Admin** deve aparecer após novo login.

## Limitações importantes

- O Render Free pode hibernar após inatividade e levar aproximadamente um minuto para responder no próximo acesso.
- Projetos gratuitos do Supabase podem pausar depois de uma semana sem atividade.
- Uploads locais não são permanentes no Render Free. Para portfólios permanentes, configure `CLOUDINARY_URL` nas variáveis do Render.
- Para o dia do TCC, abra a URL alguns minutos antes e confirme o login, o mapa e as duas contas.
