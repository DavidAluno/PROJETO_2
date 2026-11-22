require('dotenv').config({ quiet: true })

const { Pool } = require('pg')

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'barberconnect',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    }

const pool = new Pool(poolConfig)

pool.on('error', (error) => {
  console.error('Erro inesperado em conexão ociosa do PostgreSQL:', error.message)
})

module.exports = pool
