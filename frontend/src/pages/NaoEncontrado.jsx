import { Link } from 'react-router-dom'
import { getUsuarioLogado } from '../api'

export default function NaoEncontrado() {
  const user = getUsuarioLogado()
  const destination = user?.tipo === 'barbeiro' ? '/barbeiro' : user ? '/mapa' : '/'
  return <main className="bc-fatal-error"><p className="bc-kicker">ERRO 404</p><h1>Esta página não existe.</h1><p>Volte para um caminho conhecido do BarberConnect.</p><Link to={destination}>Voltar ao início</Link></main>
}
