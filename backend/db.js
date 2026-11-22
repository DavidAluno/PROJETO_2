require('dotenv').config({ quiet: true })

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'barberconnect',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
})

pool.on('error', (error) => {
  console.error('Erro inesperado em conexão ociosa do PostgreSQL:', error.message)
})

module.exports = pool
