/*
 * Permite que `npm run dev` se recupere quando alguém clonou o repositório,
 * mas esqueceu de executar `npm ci`. Não substitui o Node/npm: eles continuam
 * sendo requisitos para executar o projeto localmente.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectDir = path.resolve(__dirname, '..')
const packageJson = require(path.join(projectDir, 'package.json'))
const required = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
const missing = required.filter((name) => !fs.existsSync(path.join(projectDir, 'node_modules', ...name.split('/'), 'package.json')))

if (missing.length === 0) process.exit(0)

console.log(`Dependências ausentes (${missing.length}). Preparando o BarberConnect...`)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const installCommand = fs.existsSync(path.join(projectDir, 'package-lock.json')) ? 'ci' : 'install'
const result = spawnSync(npmCommand, [installCommand], { cwd: projectDir, stdio: 'inherit' })

if (result.error || result.status !== 0) {
  console.error('Não foi possível instalar as dependências automaticamente. Verifique o Node.js, o npm e a conexão com a internet.')
  process.exit(result.status || 1)
}
