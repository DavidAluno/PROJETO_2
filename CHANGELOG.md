# Changelog

Todas as mudanças relevantes deste projeto serão registradas neste arquivo.

## [1.0.0] - 2026-11-22

### Adicionado

- Mapa de descoberta, filtros, geolocalização consentida e perfil público da barbearia.
- Agenda real com serviços, horários de funcionamento, bloqueios, favoritos, avaliações e notificações.
- PWA instalável e carregamento sob demanda das páginas.
- Pipeline de integração contínua com PostgreSQL, lint, build, auditoria de dependências e E2E.

### Segurança

- Sessões isoladas por guia com `sessionStorage`.
- Rate limiting, Helmet, validação de upload por assinatura e proteção contra dupla reserva.
- JWT com expiração de um dia e autorização por tipo de conta revalidada no banco.

### Corrigido

- Servidor local limitado a `127.0.0.1`, com allowlist de arquivos e sem travessia de diretórios.
- Login normaliza e-mail em caixa alta/baixa.
- Respostas internas do banco não são expostas ao cliente.
