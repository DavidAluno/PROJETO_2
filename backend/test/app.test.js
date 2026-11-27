const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')

// O teste não acessa o banco: ele valida o contrato público básico da API.
process.env.JWT_SECRET ||= 'teste-local-sem-segredo-real'
const app = require('../server')

test('GET /api/health informa que a API está disponível', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.equal(response.body.sucesso, true)
  assert.match(response.body.dados.mensagem, /funcionando/i)
})

test('rota inexistente mantém o envelope de erro da API', async () => {
  const response = await request(app).get('/rota-inexistente')

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, { sucesso: false, erro: 'Rota não encontrada.' })
})
