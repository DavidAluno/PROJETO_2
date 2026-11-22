const ACTIVE_STATUSES = ['pendente', 'confirmado', 'urgente']

function dateAtBrazilTime(date, time) {
  return new Date(`${date}T${time}:00-03:00`)
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

async function getAvailableSlots(db, { barbeariaId, servicoId, date, ignoreAppointmentId = null }) {
  const serviceResult = await db.query(
    'SELECT id, nome, preco, duracao_minutos FROM servicos WHERE id = $1 AND barbearia_id = $2 AND ativo = TRUE',
    [servicoId, barbeariaId]
  )
  if (!serviceResult.rows.length) {
    const error = new Error('Serviço indisponível para esta barbearia')
    error.status = 404
    throw error
  }

  const service = serviceResult.rows[0]
  const weekday = dateAtBrazilTime(date, '12:00').getUTCDay()
  const hours = await db.query(
    'SELECT inicio, fim FROM horarios_funcionamento WHERE barbearia_id = $1 AND dia_semana = $2 ORDER BY inicio',
    [barbeariaId, weekday]
  )

  const dayStart = dateAtBrazilTime(date, '00:00')
  const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const [appointments, blocks] = await Promise.all([
    db.query(
      `SELECT data_hora, COALESCE(duracao_minutos, 30) AS duracao_minutos
       FROM agendamentos
       WHERE barbearia_id = $1 AND status = ANY($2) AND data_hora < $4 AND data_hora >= $3
         AND ($5::int IS NULL OR id <> $5)`,
      [barbeariaId, ACTIVE_STATUSES, dayStart.toISOString(), nextDay.toISOString(), ignoreAppointmentId]
    ),
    db.query(
      'SELECT inicio, fim FROM bloqueios_horario WHERE barbearia_id = $1 AND inicio < $3 AND fim > $2',
      [barbeariaId, dayStart.toISOString(), nextDay.toISOString()]
    )
  ])

  const slots = []
  const now = Date.now()
  for (const period of hours.rows) {
    const startMinutes = timeToMinutes(period.inicio)
    const endMinutes = timeToMinutes(period.fim)
    for (let minute = startMinutes; minute + Number(service.duracao_minutos) <= endMinutes; minute += 30) {
      const start = dateAtBrazilTime(date, minutesToTime(minute))
      const end = new Date(start.getTime() + Number(service.duracao_minutos) * 60 * 1000)
      const appointmentConflict = appointments.rows.some((appointment) => {
        const appointmentStart = new Date(appointment.data_hora)
        const appointmentEnd = new Date(appointmentStart.getTime() + Number(appointment.duracao_minutos) * 60 * 1000)
        return rangesOverlap(start, end, appointmentStart, appointmentEnd)
      })
      const blocked = blocks.rows.some((block) => rangesOverlap(start, end, new Date(block.inicio), new Date(block.fim)))
      if (!appointmentConflict && !blocked && start.getTime() > now) {
        slots.push({ horario: minutesToTime(minute), data_hora: start.toISOString() })
      }
    }
  }

  return { service, hours: hours.rows, slots }
}

async function assertSlotAvailable(db, { barbeariaId, servicoId, dateTime, ignoreAppointmentId = null }) {
  const selected = new Date(dateTime)
  if (Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
    const error = new Error('Escolha um horário futuro válido')
    error.status = 400
    throw error
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(selected)
  const part = (type) => parts.find((item) => item.type === type)?.value
  const date = `${part('year')}-${part('month')}-${part('day')}`
  const available = await getAvailableSlots(db, { barbeariaId, servicoId, date, ignoreAppointmentId })
  const isAvailable = available.slots.some((slot) => slot.data_hora === selected.toISOString())
  if (!isAvailable) {
    const error = new Error('Este horário acabou de ser reservado ou não está disponível')
    error.status = 409
    throw error
  }
  return available.service
}

module.exports = { ACTIVE_STATUSES, getAvailableSlots, assertSlotAvailable }
