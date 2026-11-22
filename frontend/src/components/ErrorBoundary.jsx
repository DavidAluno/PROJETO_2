import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado na interface:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <main className="bc-fatal-error" role="alert"><p className="bc-kicker">ERRO INESPERADO</p><h1>Esta tela saiu do trilho.</h1><p>Atualize a página para voltar ao BarberConnect.</p><button type="button" onClick={() => window.location.reload()}>Atualizar página</button></main>
    }
    return this.props.children
  }
}
