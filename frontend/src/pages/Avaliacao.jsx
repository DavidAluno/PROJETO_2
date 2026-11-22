import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { AppShell } from '../components/AppShell'
import { Button, EmptyState } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

export default function Avaliacao() {
  const [nota, setNota] = useState(5); const [comentario, setComentario] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const navigate = useNavigate(); const appointment = useLocation().state?.agendamento; const toast = useToast()
  async function send(event) { event.preventDefault(); setError(''); setSaving(true); try { await apiFetch('/avaliacoes/criar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agendamento_id: appointment.id, nota, comentario }) }); toast.success('Avaliação publicada. Obrigado por compartilhar sua experiência!'); navigate('/meus-cortes') } catch (saveError) { setError(saveError.message) } finally { setSaving(false) } }
  if (!appointment) return <AppShell role="cliente" eyebrow="AVALIAÇÕES" title="Conte como foi."><EmptyState title="Escolha um atendimento concluído." description="Suas avaliações ficam disponíveis na central de agendamentos após o corte." action={<Button onClick={() => navigate('/meus-cortes')}>Ver meus cortes</Button>}/></AppShell>
  return <AppShell role="cliente" eyebrow="AVALIAÇÕES" title="Como foi o atendimento?"><form className="bc-review-form" onSubmit={send}><header><p className="bc-kicker">{appointment.nome_barbearia.toUpperCase()}</p><h2>{appointment.servico}</h2><p>Sua avaliação só aparece para atendimentos que realmente aconteceram.</p></header><div className="bc-star-picker" aria-label={`Nota selecionada: ${nota} de 5`}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= nota ? 'active' : ''} onClick={() => setNota(value)} aria-label={`${value} estrela${value > 1 ? 's' : ''}`}>★</button>)}</div><label className="bc-field"><span>Conte um pouco mais <small>(opcional)</small></span><textarea maxLength="600" rows="5" value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="O que mais te marcou no atendimento?"/><small>{comentario.length}/600</small></label>{error && <p className="bc-form-error" role="alert">{error}</p>}<div><Button variant="ghost" onClick={() => navigate('/meus-cortes')}>Voltar</Button><Button type="submit" loading={saving}>Publicar avaliação</Button></div></form></AppShell>
}
