import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { AppShell } from '../components/AppShell'
import { Button, Input } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

const emptyForm = { nome: '', descricao: '', especialidades: '', endereco: '', latitude: null, longitude: null }

export default function CadastrarBarbearia() {
  const [form, setForm] = useState(emptyForm)
  const [locationMessage, setLocationMessage] = useState('Informe o endereço completo. Nós localizaremos a barbearia no mapa ao salvar.')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  function captureCurrentLocation() {
    if (!navigator.geolocation) return setLocationMessage('Seu navegador não oferece localização. Vamos usar o endereço informado.')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude }))
        setLocationMessage('Localização atual capturada. Confira se o endereço corresponde ao ponto no mapa.')
      },
      () => setLocationMessage('Localização não compartilhada. Vamos usar o endereço informado.'),
      { enableHighAccuracy: false, timeout: 9000 }
    )
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.nome.trim().length < 3 || form.endereco.trim().length < 8) return setError('Informe o nome e um endereço completo da barbearia.')
    setSaving(true)
    try {
      const payload = { nome: form.nome.trim(), endereco: form.endereco.trim(), descricao: form.descricao.trim(), especialidades: form.especialidades.trim() }
      if (Number.isFinite(form.latitude) && Number.isFinite(form.longitude)) Object.assign(payload, { latitude: form.latitude, longitude: form.longitude })
      await apiFetch('/barbearias/cadastrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success('Barbearia cadastrada. Agora configure serviços e horários.')
      navigate('/barbeiro/agenda')
    } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  const hasCoordinates = Number.isFinite(form.latitude) && Number.isFinite(form.longitude)
  return <AppShell role="barbeiro" eyebrow="PRIMEIRA CONFIGURAÇÃO" title="Coloque sua barbearia no mapa."><form className="bc-shop-setup" onSubmit={submit}><section><p className="bc-kicker">PERFIL PÚBLICO</p><h2>O básico que faz você ser encontrado.</h2><p>Depois você adiciona horários, serviços e um portfólio que mostra seu trabalho de verdade.</p></section><div className="bc-shop-setup-fields"><Input label="Nome da barbearia" maxLength="140" value={form.nome} onChange={(event) => update('nome', event.target.value)} placeholder="Ex.: Barbearia do João" required/><label className="bc-field"><span>Descrição</span><textarea maxLength="600" rows="4" value={form.descricao} onChange={(event) => update('descricao', event.target.value)} placeholder="Fale sobre seu estilo, atendimento e ambiente."/></label><Input label="Especialidades" maxLength="300" value={form.especialidades} onChange={(event) => update('especialidades', event.target.value)} placeholder="Ex.: Degradê, barba, corte social" hint="Separe por vírgulas para criar tags no perfil."/><Input label="Endereço" maxLength="300" value={form.endereco} onChange={(event) => update('endereco', event.target.value)} placeholder="Rua, número, bairro e cidade" required/><div className="bc-location-card"><span>⌖</span><div><b>Localização do mapa</b><p>{locationMessage}</p><small>{hasCoordinates ? `Lat. ${form.latitude.toFixed(5)} · Long. ${form.longitude.toFixed(5)}` : 'Será obtida pelo endereço informado.'}</small></div><Button type="button" variant="ghost" onClick={captureCurrentLocation}>Usar minha localização</Button></div>{error && <p className="bc-form-error" role="alert">{error}</p>}<div className="bc-setup-actions"><Button type="button" variant="ghost" onClick={() => navigate('/barbeiro')}>Voltar</Button><Button type="submit" loading={saving}>Cadastrar e configurar agenda →</Button></div></div></form></AppShell>
}
