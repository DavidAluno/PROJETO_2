import { useEffect, useMemo, useState } from "react";
import { apiFetch, formatarDataHora, formatarValor } from "../api";
import { AppShell } from "../components/AppShell";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  StatusBadge,
} from "../components/ui";
import { useToast } from "../contexts/ToastContext";

const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const defaultPeriods = () =>
  days.flatMap((_, day) =>
    day === 0 ? [] : [{ dia_semana: day, inicio: "09:00", fim: "19:00" }],
  );
const normalize = (period) => ({
  ...period,
  inicio: String(period.inicio).slice(0, 5),
  fim: String(period.fim).slice(0, 5),
});

export default function AgendaBarbeiro() {
  const [services, setServices] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceModal, setServiceModal] = useState(null);
  const [blockModal, setBlockModal] = useState(false);
  const toast = useToast();
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [serviceData, hoursData, blocksData, pending] = await Promise.all(
        [
          apiFetch("/servicos/meus"),
          apiFetch("/agenda/funcionamento"),
          apiFetch("/agenda/bloqueios"),
          apiFetch("/agendamentos/pendentes?limite=6"),
        ],
      );
      setServices(serviceData);
      setPeriods(hoursData.periodos.map(normalize));
      setBlocks(blocksData);
      setBookings(pending.itens || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const grouped = useMemo(
    () =>
      days.map((_, day) =>
        periods.filter((period) => Number(period.dia_semana) === day),
      ),
    [periods],
  );
  function setDayOpen(day, open) {
    setPeriods((current) =>
      open
        ? [...current, { dia_semana: day, inicio: "09:00", fim: "19:00" }]
        : current.filter((period) => Number(period.dia_semana) !== day),
    );
  }
  function updatePeriod(day, index, field, value) {
    setPeriods((current) =>
      current.map((period) =>
        Number(period.dia_semana) === day &&
        grouped[day].indexOf(period) === index
          ? { ...period, [field]: value }
          : period,
      ),
    );
  }
  function deletePeriod(day, index) {
    setPeriods((current) =>
      current.filter(
        (period) =>
          !(
            Number(period.dia_semana) === day &&
            grouped[day].indexOf(period) === index
          ),
      ),
    );
  }
  async function saveHours() {
    try {
      await apiFetch("/agenda/funcionamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodos: periods.map(({ dia_semana, inicio, fim }) => ({
            dia_semana: Number(dia_semana),
            inicio,
            fim,
          })),
        }),
      });
      toast.success("Horários de funcionamento salvos.");
    } catch (saveError) {
      toast.error(saveError.message);
    }
  }
  async function saveService(data) {
    try {
      const saved = serviceModal?.id
        ? await apiFetch(`/servicos/${serviceModal.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
        : await apiFetch("/servicos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
      setServices((current) =>
        serviceModal?.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved],
      );
      setServiceModal(null);
      toast.success(
        serviceModal?.id
          ? "Serviço atualizado."
          : "Serviço adicionado à sua vitrine.",
      );
    } catch (saveError) {
      toast.error(saveError.message);
    }
  }
  async function removeService(item) {
    try {
      await apiFetch(`/servicos/${item.id}`, { method: "DELETE" });
      setServices((current) =>
        current.filter((service) => service.id !== item.id),
      );
      toast.success("Serviço removido.");
    } catch (removeError) {
      toast.error(removeError.message);
    }
  }
  async function createBlock(data) {
    try {
      const saved = await apiFetch("/agenda/bloqueios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setBlocks((current) =>
        [...current, saved].sort(
          (a, b) => new Date(a.inicio) - new Date(b.inicio),
        ),
      );
      setBlockModal(false);
      toast.success("Período bloqueado para reservas.");
    } catch (saveError) {
      toast.error(saveError.message);
    }
  }
  async function removeBlock(block) {
    try {
      await apiFetch(`/agenda/bloqueios/${block.id}`, { method: "DELETE" });
      setBlocks((current) => current.filter((item) => item.id !== block.id));
      toast.success("Bloqueio removido.");
    } catch (removeError) {
      toast.error(removeError.message);
    }
  }
  if (loading)
    return (
      <AppShell role="barbeiro" eyebrow="OPERAÇÃO" title="Agenda e serviços.">
        <LoadingState label="Montando sua operação" />
      </AppShell>
    );
  if (error)
    return (
      <AppShell role="barbeiro" eyebrow="OPERAÇÃO" title="Agenda e serviços.">
        <ErrorState
          description={error}
          action={
            <Button variant="secondary" onClick={load}>
              Tentar novamente
            </Button>
          }
        />
      </AppShell>
    );
  return (
    <AppShell role="barbeiro" eyebrow="OPERAÇÃO" title="Agenda e serviços.">
      <div className="bc-operation-grid">
        <section className="bc-operation-card bc-service-manager">
          <div className="bc-section-title">
            <div>
              <p className="bc-kicker">VITRINE</p>
              <h2>Serviços reais.</h2>
            </div>
            <Button onClick={() => setServiceModal({})}>+ Adicionar</Button>
          </div>
          {services.length ? (
            <div className="bc-managed-services">
              {services.map((item) => (
                <article key={item.id}>
                  <div>
                    <b>{item.nome}</b>
                    <small>
                      {item.duracao_minutos} min ·{" "}
                      {item.ativo ? "Ativo" : "Pausado"}
                    </small>
                  </div>
                  <strong>{formatarValor(item.preco)}</strong>
                  <button
                    onClick={() => setServiceModal(item)}
                    aria-label={`Editar ${item.nome}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeService(item)}
                    aria-label={`Remover ${item.nome}`}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="PRIMEIRO PASSO"
              title="Adicione o primeiro serviço."
              description="Sem serviços, os clientes não podem reservar horários reais."
              action={
                <Button onClick={() => setServiceModal({})}>
                  Cadastrar serviço
                </Button>
              }
            />
          )}
        </section>
        <section className="bc-operation-card bc-hours-manager">
          <div className="bc-section-title">
            <div>
              <p className="bc-kicker">DISPONIBILIDADE</p>
              <h2>Horário de funcionamento.</h2>
            </div>
            <Button onClick={saveHours}>Salvar</Button>
          </div>
          {!periods.length && (
            <p className="bc-config-note">
              Aplique o horário base abaixo e ajuste o que precisar. Nada é
              publicado até você salvar.
            </p>
          )}
          <div className="bc-day-config">
            {days.map((day, dayIndex) => (
              <article key={day}>
                <div>
                  <label className="bc-switch">
                    <input
                      type="checkbox"
                      checked={grouped[dayIndex].length > 0}
                      onChange={(event) =>
                        setDayOpen(dayIndex, event.target.checked)
                      }
                    />
                    <span />
                    {day}
                  </label>
                </div>
                {grouped[dayIndex].length ? (
                  <div className="bc-periods">
                    {grouped[dayIndex].map((period, index) => (
                      <div key={`${day}-${index}`}>
                        <input
                          aria-label={`Início ${day}`}
                          type="time"
                          value={period.inicio}
                          onChange={(event) =>
                            updatePeriod(
                              dayIndex,
                              index,
                              "inicio",
                              event.target.value,
                            )
                          }
                        />
                        <span>até</span>
                        <input
                          aria-label={`Fim ${day}`}
                          type="time"
                          value={period.fim}
                          onChange={(event) =>
                            updatePeriod(
                              dayIndex,
                              index,
                              "fim",
                              event.target.value,
                            )
                          }
                        />
                        {grouped[dayIndex].length > 1 && (
                          <button
                            onClick={() => deletePeriod(dayIndex, index)}
                            aria-label="Remover intervalo"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="bc-add-period"
                      onClick={() =>
                        setPeriods((current) => [
                          ...current,
                          {
                            dia_semana: dayIndex,
                            inicio: "14:00",
                            fim: "19:00",
                          },
                        ])
                      }
                    >
                      + intervalo
                    </button>
                  </div>
                ) : (
                  <span className="bc-closed-day">Fechado</span>
                )}
              </article>
            ))}
          </div>
          {!periods.length && (
            <Button
              variant="secondary"
              onClick={() => setPeriods(defaultPeriods())}
            >
              Usar horário base (seg–sáb)
            </Button>
          )}
        </section>
        <section className="bc-operation-card bc-block-manager">
          <div className="bc-section-title">
            <div>
              <p className="bc-kicker">PROTEJA SUA AGENDA</p>
              <h2>Bloqueios.</h2>
            </div>
            <Button variant="secondary" onClick={() => setBlockModal(true)}>
              + Bloquear
            </Button>
          </div>
          {blocks.length ? (
            <div className="bc-block-list">
              {blocks.map((block) => (
                <article key={block.id}>
                  <div>
                    <b>
                      {formatarDataHora(block.inicio)} →{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(block.fim))}
                    </b>
                    <small>{block.motivo || "Indisponível"}</small>
                  </div>
                  <button onClick={() => removeBlock(block)}>Remover</button>
                </article>
              ))}
            </div>
          ) : (
            <p className="bc-config-note">
              Bloqueie horários pessoais, almoço ou folgas. Eles somem da
              reserva imediatamente.
            </p>
          )}
        </section>
        <section className="bc-operation-card bc-operation-agenda">
          <div className="bc-section-title">
            <div>
              <p className="bc-kicker">PRÓXIMOS PEDIDOS</p>
              <h2>Agenda em movimento.</h2>
            </div>
          </div>
          {bookings.length ? (
            <div className="bc-mini-bookings">
              {bookings.slice(0, 6).map((booking) => (
                <article key={booking.id}>
                  <time>{formatarDataHora(booking.data_hora)}</time>
                  <div>
                    <b>{booking.nome_cliente}</b>
                    <small>
                      {booking.servico} · {formatarValor(booking.valor)}
                    </small>
                  </div>
                  <StatusBadge status={booking.status} />
                </article>
              ))}
            </div>
          ) : (
            <p className="bc-config-note">
              Os pedidos recebidos aparecerão aqui assim que sua vitrine estiver
              pronta.
            </p>
          )}
        </section>
      </div>
      <ServiceModal
        item={serviceModal}
        onClose={() => setServiceModal(null)}
        onSave={saveService}
      />
      <BlockModal
        open={blockModal}
        onClose={() => setBlockModal(false)}
        onSave={createBlock}
      />
    </AppShell>
  );
}

function ServiceModal({ item, onClose, onSave }) {
  const [data, setData] = useState({
    nome: item?.nome || "",
    preco: item?.preco || "",
    duracao_minutos: item?.duracao_minutos || 30,
    ativo: item?.ativo ?? true,
  });
  useEffect(
    () =>
      setData({
        nome: item?.nome || "",
        preco: item?.preco || "",
        duracao_minutos: item?.duracao_minutos || 30,
        ativo: item?.ativo ?? true,
      }),
    [item],
  );
  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.id ? "Editar serviço" : "Novo serviço"}
    >
      <form
        className="bc-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...data,
            preco: Number(data.preco),
            duracao_minutos: Number(data.duracao_minutos),
          });
        }}
      >
        <label className="bc-field">
          <span>Nome do serviço</span>
          <input
            required
            maxLength="100"
            value={data.nome}
            onChange={(event) => setData({ ...data, nome: event.target.value })}
            placeholder="Ex.: Corte degradê"
          />
        </label>
        <div className="bc-modal-grid">
          <label className="bc-field">
            <span>Preço</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={data.preco}
              onChange={(event) =>
                setData({ ...data, preco: event.target.value })
              }
              placeholder="35,00"
            />
          </label>
          <label className="bc-field">
            <span>Duração (min)</span>
            <input
              required
              min="10"
              max="360"
              step="5"
              type="number"
              value={data.duracao_minutos}
              onChange={(event) =>
                setData({ ...data, duracao_minutos: event.target.value })
              }
            />
          </label>
        </div>
        {item?.id && (
          <label className="bc-switch">
            <input
              type="checkbox"
              checked={data.ativo}
              onChange={(event) =>
                setData({ ...data, ativo: event.target.checked })
              }
            />
            <span />
            Serviço disponível para reservas
          </label>
        )}
        <div className="bc-modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar serviço</Button>
        </div>
      </form>
    </Modal>
  );
}
function BlockModal({ open, onClose, onSave }) {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Bloquear horário">
      <form
        className="bc-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
            motivo,
          });
        }}
      >
        <label className="bc-field">
          <span>Começa em</span>
          <input
            required
            type="datetime-local"
            value={inicio}
            onChange={(event) => setInicio(event.target.value)}
          />
        </label>
        <label className="bc-field">
          <span>Termina em</span>
          <input
            required
            type="datetime-local"
            value={fim}
            onChange={(event) => setFim(event.target.value)}
          />
        </label>
        <label className="bc-field">
          <span>
            Motivo <small>(opcional)</small>
          </span>
          <input
            maxLength="180"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ex.: almoço, compromisso"
          />
        </label>
        <div className="bc-modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Bloquear período</Button>
        </div>
      </form>
    </Modal>
  );
}
