-- O nome do serviço passa a ser sempre obtido de servicos.id.
-- Em bancos legados, preserva dados ao associar registros por barbearia e nome.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agendamentos' AND column_name = 'servico'
  ) THEN
    UPDATE agendamentos a
    SET servico_id = s.id
    FROM servicos s
    WHERE a.servico_id IS NULL
      AND a.barbearia_id = s.barbearia_id
      AND LOWER(TRIM(a.servico)) = LOWER(TRIM(s.nome));

    ALTER TABLE agendamentos DROP COLUMN servico;
  END IF;
END $$;
