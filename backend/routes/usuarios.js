const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters')

const SEGREDO = process.env.JWT_SECRET

if (!SEGREDO) {
  throw new Error('JWT_SECRET não foi configurado no ambiente')
}

router.post('/cadastrar', registerLimiter, async (req, res) => {
  const { nome, email, senha, tipo } = req.body

  if (!nome?.trim() || !email || !senha || !tipo) {
    return res.status(400).json({ erro: 'Preencha todos os campos' })
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 180) {
    return res.status(400).json({ erro: 'Informe um e-mail válido' })
  }

  if (senha.length < 8) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres' })
  }

  if (!['cliente', 'barbeiro'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de usuário inválido' })
  }

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10)
    const resultado = await pool.query(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
      [nome.trim(), email.trim().toLowerCase(), senhaCriptografada, tipo]
    )
    res.status(201).json(resultado.rows[0])
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Este email já está cadastrado' })
    }
    console.error('Falha ao cadastrar usuário:', erro)
    res.status(500).json({ sucesso: false, erro: 'Não foi possível criar sua conta agora.' })
  }
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, senha } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!normalizedEmail || !senha) {
    return res.status(400).json({ erro: 'Informe email e senha' })
  }

  try {
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [normalizedEmail]
    )

    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' })
    }

    const usuario = resultado.rows[0]
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' })
    }

    const token = jwt.sign(
      { id: usuario.id, tipo: usuario.tipo },
      SEGREDO,
      { expiresIn: '1d' }
    )

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      }
    })
  } catch (erro) {
    console.error('Falha no login:', erro)
    res.status(500).json({ sucesso: false, erro: 'Não foi possível entrar agora. Tente novamente.' })
  }
})

module.exports = router
