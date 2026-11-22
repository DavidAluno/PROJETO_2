// Localmente a API roda em 3001; na hospedagem ela compartilha o mesmo domínio.
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function mediaUrl(url) {
  if (!url) return ''
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export function getUsuarioLogado() {
  try {
    return JSON.parse(sessionStorage.getItem('usuario'))
  } catch {
    return null
  }
}

export function getAuthHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(path, options = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 12000)
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) },
      signal: options.signal || controller.signal
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/usuarios/')) {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('usuario')
        window.setTimeout(() => window.location.assign('/'), 80)
      }
      const error = new Error(data.erro || 'Não foi possível concluir essa ação agora')
      error.status = response.status
      throw error
    }
    return data.dados ?? data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A solicitação demorou demais. Verifique sua conexão e tente novamente.', { cause: error })
    if (error instanceof TypeError) throw new Error('Não conseguimos falar com o servidor. Verifique sua conexão e tente novamente.', { cause: error })
    throw error
  } finally { window.clearTimeout(timeout) }
}

export function formatarDataHora(valor) {
  if (!valor) return 'Horário não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor))
}

export function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') return 'A combinar'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
}
