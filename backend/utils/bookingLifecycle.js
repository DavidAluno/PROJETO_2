const URGENT_COOLDOWN_MINUTES = Math.max(1, Number.parseInt(process.env.URGENT_COOLDOWN_MINUTES, 10) || 15)

async function expireStaleAppointments(db) {
  await db.query(
    `UPDATE agendamentos
     SET status = 'expirado'
     WHERE (status = 'pendente' AND data_hora <= NOW())
        OR (status = 'urgente' AND criado_em <= NOW() - ($1::int * INTERVAL '1 minute'))`,
    [URGENT_COOLDOWN_MINUTES]
  )
}

module.exports = { URGENT_COOLDOWN_MINUTES, expireStaleAppointments }
