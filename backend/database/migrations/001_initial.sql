CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('cliente', 'barbeiro')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbearias (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(140) NOT NULL,
  descricao TEXT,
  especialidades TEXT,
  endereco TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  disponivel BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  barbearia_id INT NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  duracao_minutos SMALLINT NOT NULL CHECK (duracao_minutos BETWEEN 10 AND 360),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES usuarios(id),
  barbearia_id INT NOT NULL REFERENCES barbearias(id),
  servico_id INT NOT NULL REFERENCES servicos(id),
  data_hora TIMESTAMPTZ NOT NULL,
  urgente BOOLEAN NOT NULL DEFAULT FALSE,
  valor DECIMAL(10,2),
  duracao_minutos INT,
  status VARCHAR(15) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'urgente', 'confirmado', 'recusado', 'cancelado', 'concluido', 'expirado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS agendamento_horario_ativo_unico
  ON agendamentos (barbearia_id, data_hora)
  WHERE status NOT IN ('recusado', 'cancelado', 'expirado');

CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  barbearia_id INT NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  titulo VARCHAR(100) NOT NULL,
  descricao TEXT,
  imagem_url TEXT NOT NULL,
  media_public_id VARCHAR(220),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id SERIAL PRIMARY KEY,
  barbearia_id INT NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  inicio TIME NOT NULL,
  fim TIME NOT NULL,
  CHECK (fim > inicio)
);

CREATE TABLE IF NOT EXISTS bloqueios_horario (
  id SERIAL PRIMARY KEY,
  barbearia_id INT NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo VARCHAR(180),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fim > inicio)
);

CREATE TABLE IF NOT EXISTS favoritos (
  cliente_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  barbearia_id INT NOT NULL REFERENCES barbearias(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cliente_id, barbearia_id)
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES usuarios(id),
  barbearia_id INT NOT NULL REFERENCES barbearias(id),
  agendamento_id INT REFERENCES agendamentos(id) ON DELETE CASCADE,
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacoes_agendamento
  ON avaliacoes(agendamento_id) WHERE agendamento_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS avaliacoes_clientes (
  id SERIAL PRIMARY KEY,
  barbeiro_id INT NOT NULL REFERENCES usuarios(id),
  cliente_id INT NOT NULL REFERENCES usuarios(id),
  agendamento_id INT NOT NULL UNIQUE REFERENCES agendamentos(id),
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_barbearia ON servicos(barbearia_id, ativo);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia_data ON agendamentos(barbearia_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_data ON agendamentos(cliente_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_barbearia_criado ON portfolio(barbearia_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_bloqueios_barbearia_periodo ON bloqueios_horario(barbearia_id, inicio, fim);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida, criado_em DESC);
