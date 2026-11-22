const fs = require('fs/promises')
const path = require('path')
const pool = require('../db')

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(120) PRIMARY KEY,
    aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  const migrationsDir = path.join(__dirname, 'migrations')
  const migrations = (await fs.readdir(migrationsDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()
  for (const file of migrations) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE id = $1', [file])
    if (applied.rows.length) continue
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Migração aplicada: ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  console.log('Banco BarberConnect atualizado com sucesso.')
}
main().catch(error => { console.error('Falha ao aplicar migrações:', error.message); process.exitCode = 1 }).finally(() => pool.end())
