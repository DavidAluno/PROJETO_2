import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, formatarValor } from '../api'
import { AppShell } from '../components/AppShell'
import { Button, EmptyState, ErrorState, LoadingState, Rating } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

export default function Favoritos() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  async function load() {
    setLoading(true); setError('')
    try { setShops(await apiFetch('/favoritos')) } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  async function remove(shop) {
    try {
      await apiFetch(`/favoritos/${shop.id}`, { method: 'DELETE' })
      setShops((current) => current.filter((item) => item.id !== shop.id))
      toast.success(`${shop.nome} saiu dos seus favoritos.`)
    } catch (actionError) { toast.error(actionError.message) }
  }

  return <AppShell role="cliente" eyebrow="MINHAS BARBEARIAS" title="As escolhas que você salvou."><div className="bc-favorites-page">{loading ? <LoadingState label="Carregando suas barbearias"/> : error ? <ErrorState description={error} action={<Button variant="secondary" onClick={load}>Tentar novamente</Button>}/> : shops.length ? <div className="bc-favorites-grid">{shops.map((shop) => <article key={shop.id}><header><span>{shop.nome.slice(0, 1)}</span><div><h2>{shop.nome}</h2><Rating value={shop.media_avaliacoes} count={shop.total_avaliacoes}/></div></header><p>{shop.endereco}</p><div className="bc-favorite-services">{(shop.especialidades || 'Corte, barba e estilo').split(',').slice(0, 3).map((item) => <i key={item}>{item.trim()}</i>)}</div><footer><span>{shop.preco_inicial ? `A partir de ${formatarValor(shop.preco_inicial)}` : 'Serviços em atualização'}</span><div><Button variant="ghost" onClick={() => remove(shop)}>Remover</Button><Button onClick={() => navigate('/agendamento', { state: { barbearia: shop } })}>Agendar</Button></div></footer></article>)}</div> : <EmptyState eyebrow="SUA LISTA ESTÁ VAZIA" title="Salve barbearias para comparar depois." description="No perfil da barbearia, toque em Favoritar. Ela ficará aqui para uma reserva rápida." action={<Button onClick={() => navigate('/mapa')}>Explorar no mapa</Button>}/>}</div></AppShell>
}
