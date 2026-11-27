import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Button, EmptyState, ErrorState, Input, LoadingState, Modal, StatusBadge } from '../components/ui'
import { apiFetch, getUsuarioLogado } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function Admin() {
  const [shops, setShops] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const user = getUsuarioLogado()

  const load = useCallback(async (search = '') => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('busca', search.trim())
      const result = await apiFetch(`/admin/barbearias${params.size ? `?${params}` : ''}`)
      setShops(result.itens || [])
    } catch (loadError) { setError(loadError.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load('') }, [load])

  async function confirmAction() {
    if (!pendingAction) return
    setSubmitting(true)
    try {
      if (pendingAction.type === 'cleanup') {
        const result = await apiFetch('/admin/limpar-dados-teste', { method: 'POST' })
        toast.success(`${result.barbearias_removidas} barbearia(s) de teste removida(s).`)
      } else {
        await apiFetch(`/admin/barbearias/${pendingAction.shop.id}`, { method: 'DELETE' })
        toast.success('Barbearia removida com sucesso.')
      }
      setPendingAction(null)
      await load(query)
    } catch (actionError) { toast.error(actionError.message) } finally { setSubmitting(false) }
  }

  const cleanup = pendingAction?.type === 'cleanup'
  return <AppShell role={user?.tipo || 'cliente'} eyebrow="ÁREA RESTRITA" title="Administração de barbearias.">
    <section className="bc-admin-page">
      <header className="bc-admin-intro"><div><p className="bc-kicker">MODERAÇÃO</p><h2>Deixe o mapa pronto para a apresentação.</h2><p>Remova cadastros de teste e gerencie somente as barbearias que realmente devem aparecer para os clientes.</p></div><Button variant="danger" onClick={() => setPendingAction({ type: 'cleanup' })}>Limpar dados de teste</Button></header>
      <form className="bc-admin-search" onSubmit={(event) => { event.preventDefault(); load() }}><Input label="Buscar barbearia ou barbeiro" name="busca" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: nome, e-mail ou responsável"/><Button type="submit" variant="secondary">Buscar</Button></form>
      {loading ? <LoadingState label="Carregando as barbearias"/> : error ? <ErrorState description={error} action={<Button variant="secondary" onClick={() => load()}>Tentar novamente</Button>}/> : shops.length ? <div className="bc-admin-list">{shops.map((shop) => <article key={shop.id}><div><b>{shop.nome}</b><small>{shop.nome_barbeiro} · {shop.email_barbeiro}</small><p>{shop.endereco}</p></div><div className="bc-admin-meta"><StatusBadge status={shop.disponivel ? 'confirmado' : 'recusado'}/><small>{shop.total_agendamentos} agendamento(s)</small></div><Button variant="danger" onClick={() => setPendingAction({ type: 'delete', shop })}>Remover</Button></article>)}</div> : <EmptyState eyebrow="SEM RESULTADOS" title="Nenhuma barbearia encontrada." description="Altere os termos de busca ou cadastre uma nova barbearia pelo painel de barbeiro."/>}
    </section>
    <Modal open={Boolean(pendingAction)} onClose={() => !submitting && setPendingAction(null)} title={cleanup ? 'Remover dados de teste?' : 'Remover esta barbearia?'}>
      <div className="bc-confirm-dialog"><p>{cleanup ? 'Esta ação remove somente barbearias criadas pelo teste E2E e contas @example.test sem barbearia. Cadastros reais não são selecionados.' : <>Você removerá <strong>{pendingAction?.shop?.nome}</strong> e os dados vinculados à barbearia. Essa ação não pode ser desfeita.</>}</p><div><Button variant="ghost" onClick={() => setPendingAction(null)} disabled={submitting}>Cancelar</Button><Button variant="danger" onClick={confirmAction} loading={submitting}>{cleanup ? 'Remover testes' : 'Remover barbearia'}</Button></div></div>
    </Modal>
  </AppShell>
}
