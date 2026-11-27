const pool = require('../db')

const apply = process.argv.includes('--apply')
const testShopPattern = '^Barbearia E2E [0-9]+$'

async function run() {
  const matches = await pool.query(
    `SELECT b.id, b.nome, u.email
     FROM barbearias b JOIN usuarios u ON u.id = b.usuario_id
     WHERE b.nome ~* $1 OR u.email ILIKE '%@example.test'
     ORDER BY b.id`,
    [testShopPattern]
  )

  console.log(`${matches.rowCount} barbearia(s) de teste encontrada(s).`)
  for (const row of matches.rows) console.log(`- #${row.id}: ${row.nome}`)
  if (!apply) {
    console.log('Nenhum dado foi removido. Execute novamente com --apply para confirmar.')
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM agendamentos a
       USING barbearias b, usuarios u
       WHERE a.barbearia_id = b.id AND b.usuario_id = u.id
         AND (b.nome ~* $1 OR u.email ILIKE '%@example.test')`,
      [testShopPattern]
    )
    const shops = await client.query(
      `DELETE FROM barbearias b USING usuarios u
       WHERE b.usuario_id = u.id AND (b.nome ~* $1 OR u.email ILIKE '%@example.test')`,
      [testShopPattern]
    )
    const users = await client.query(
      `DELETE FROM usuarios u
       WHERE u.email ILIKE '%@example.test'
         AND NOT EXISTS (SELECT 1 FROM barbearias b WHERE b.usuario_id = u.id)`
    )
    await client.query('COMMIT')
    console.log(`${shops.rowCount} barbearia(s) e ${users.rowCount} usuário(s) de teste removidos.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

run().catch((error) => {
  console.error('Falha ao limpar dados de teste:', error.message)
  process.exitCode = 1
}).finally(() => pool.end())
