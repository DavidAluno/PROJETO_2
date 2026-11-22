const assert = require('assert/strict')
const { positiveInteger, requiredId } = require('../utils/validation')

assert.equal(positiveInteger(1), 1)
assert.equal(positiveInteger('42'), 42)
assert.equal(positiveInteger(0), null)
assert.equal(positiveInteger('-2'), null)
assert.equal(positiveInteger('2.5'), null)
assert.equal(positiveInteger('abc'), null)
assert.throws(() => requiredId('abc', 'ID de barbearia'), { message: 'Informe um ID de barbearia válido.' })

console.log('VALIDATION OK: IDs inválidos são rejeitados antes das queries.')
