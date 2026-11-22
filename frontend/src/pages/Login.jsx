import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../api'
import { useToast } from '../contexts/ToastContext'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  async function handleLogin(event) {
    event.preventDefault()
    setErro('')
    if (!/^\S+@\S+\.\S+$/.test(email) || !senha) return setErro('Informe seu e-mail e senha para entrar.')
    setCarregando(true)
    try {
      const resposta = await fetch(`${API_URL}/usuarios/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), senha }) })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) return setErro(dados.erro || 'Não foi possível entrar agora.')
      const sessao = dados.dados ?? dados
      // sessionStorage é isolado por guia: entrar ou sair aqui não altera outra sessão aberta.
      sessionStorage.setItem('token', sessao.token)
      sessionStorage.setItem('usuario', JSON.stringify(sessao.usuario))
      toast.success(`Bem-vindo de volta, ${sessao.usuario.nome.split(' ')[0]}!`)
      navigate(sessao.usuario.tipo === 'barbeiro' ? '/barbeiro' : '/mapa')
    } catch { setErro('Não conseguimos falar com o servidor. Tente novamente em instantes.') } finally { setCarregando(false) }
  }

  return <main className="bc-auth min-h-screen bg-[#10110d] text-white grid lg:grid-cols-[1.2fr_.8fr]">
    <section className="relative overflow-hidden p-7 sm:p-12 lg:p-16 flex flex-col justify-between min-h-[50vh]"><div className="bc-grid"/><div className="relative flex justify-between items-center"><span className="font-black tracking-[-.08em] text-xl">BARBER<span className="text-[#d9ff3f]">CONNECT</span></span><span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60">agenda local</span></div><div className="relative max-w-2xl py-12 lg:py-0"><p className="font-mono text-xs uppercase tracking-[.18em] text-[#d9ff3f] mb-5">Seu corte, sem tentativa e erro.</p><h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-[-.09em] leading-[.84]">Veja o corte.<br/><span className="text-[#d9ff3f]">Marque a hora.</span><br/>Saia certo.</h1><p className="mt-7 max-w-md text-white/60 text-base leading-relaxed">Compare portfólios reais, escolha um serviço e reserve um horário que existe na agenda.</p></div><div className="relative flex flex-wrap gap-3 text-xs font-semibold"><span className="bc-chip">01 · encontre no mapa</span><span className="bc-chip">02 · veja o portfólio</span><span className="bc-chip">03 · agende</span></div></section>
    <section className="bg-[#f6f6f1] text-[#10110d] flex items-center justify-center p-6 sm:p-12"><form onSubmit={handleLogin} className="bc-form w-full max-w-md" noValidate><p className="font-mono text-[11px] tracking-[.16em] uppercase text-black/50">Acesse sua conta</p><h2 className="mt-3 text-4xl sm:text-5xl leading-none font-black tracking-[-.07em]">Seu próximo<br/>corte começa aqui.</h2><p className="mt-4 text-sm text-black/60">Entre para agendar ou gerir sua barbearia.</p><div className="mt-9 space-y-5"><label className="bc-label">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" autoComplete="email" aria-invalid={Boolean(erro)} required/></label><label className="bc-label">Senha<span className="bc-auth-password"><input type={mostrarSenha ? 'text' : 'password'} value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Sua senha" autoComplete="current-password" required/><button type="button" onClick={() => setMostrarSenha((value) => !value)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button></span></label>{erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erro}</p>}<button disabled={carregando} className="bc-primary w-full" aria-busy={carregando}>{carregando ? 'Entrando…' : 'Entrar e ver barbeiros →'}</button></div><p className="mt-7 text-sm text-black/60">Ainda não tem conta? <button type="button" onClick={() => navigate('/cadastro')} className="font-bold text-black underline underline-offset-4">Criar meu acesso</button></p></form></section>
  </main>
}
export default Login
