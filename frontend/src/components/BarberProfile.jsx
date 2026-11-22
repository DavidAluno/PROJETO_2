import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, formatarValor, getUsuarioLogado, mediaUrl } from "../api";
import { useToast } from "../contexts/ToastContext";
import { Avatar, Badge, Button, LoadingState, Modal, Rating } from "./ui";
import { formatDistance, haversineKm } from "../utils/geo";

const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function BarberProfile({ barbearia, userPosition, onClose }) {
  const [profile, setProfile] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [image, setImage] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();
  const user = getUsuarioLogado();
  const barbeariaId = barbearia?.id;

  useEffect(() => {
    if (!barbeariaId) return undefined;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const details = await apiFetch(`/barbearias/${barbeariaId}`);
        const isFavorite =
          user?.tipo === "cliente"
            ? await apiFetch(`/favoritos/status/${barbeariaId}`).catch(() => ({
                favorito: false,
              }))
            : { favorito: false };
        if (active) {
          setProfile(details);
          setFavorite(Boolean(isFavorite.favorito));
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [barbeariaId, user?.tipo]);

  async function toggleFavorite() {
    try {
      await apiFetch(`/favoritos/${barbearia.id}`, {
        method: favorite ? "DELETE" : "POST",
      });
      setFavorite((value) => !value);
      toast.success(
        favorite
          ? "Removida dos seus favoritos."
          : "Salva em Minhas barbearias.",
      );
    } catch (actionError) {
      toast.error(actionError.message);
    }
  }
  const distance =
    profile && userPosition ? haversineKm(userPosition, profile) : null;
  const addressLink = profile
    ? `https://www.openstreetmap.org/?mlat=${profile.latitude}&mlon=${profile.longitude}#map=17/${profile.latitude}/${profile.longitude}`
    : "#";

  return (
    <>
      <Modal
        open={Boolean(barbearia)}
        onClose={onClose}
        title={profile?.nome || "Perfil da barbearia"}
        className="bc-profile-modal"
      >
        {loading ? (
          <LoadingState label="Montando o perfil" />
        ) : error ? (
          <div className="bc-profile-error">
            <p>{error}</p>
            <Button variant="secondary" onClick={onClose}>
              Voltar
            </Button>
          </div>
        ) : (
          <div className="bc-profile">
            <header className="bc-profile-hero">
              <div className="bc-profile-avatar">
                <Avatar name={profile.nome} size="lg" />
              </div>
              <div>
                <p className="bc-kicker">
                  {profile.disponivel
                    ? "ATENDENDO AGORA"
                    : "INDISPONÍVEL NO MOMENTO"}
                </p>
                <h3>{profile.nome}</h3>
                <p>{profile.endereco}</p>
                <div className="bc-profile-rating">
                  <Rating
                    value={profile.media_avaliacoes}
                    count={profile.total_avaliacoes}
                  />
                  {distance !== null && <span>{formatDistance(distance)}</span>}
                </div>
              </div>
            </header>
            <div className="bc-profile-actions">
              {user?.tipo === "cliente" && (
                <Button
                  onClick={() =>
                    navigate("/agendamento", { state: { barbearia: profile } })
                  }
                  disabled={!profile.servicos.length}
                >
                  Escolher horário →
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  window.open(addressLink, "_blank", "noopener,noreferrer")
                }
              >
                Como chegar
              </Button>
              {user?.tipo === "cliente" && (
                <Button variant="ghost" onClick={toggleFavorite}>
                  {favorite ? "♥ Favorita" : "♡ Favoritar"}
                </Button>
              )}
            </div>
            <section className="bc-profile-section">
              <h4>O trabalho</h4>
              <p>
                {profile.descricao ||
                  "Esta barbearia ainda não adicionou uma descrição."}
              </p>
              {profile.especialidades && (
                <div className="bc-badge-row">
                  {profile.especialidades.split(",").map((item) => (
                    <Badge key={item}>{item.trim()}</Badge>
                  ))}
                </div>
              )}
            </section>
            <section className="bc-profile-section">
              <div className="bc-section-title">
                <h4>Serviços</h4>
                <span>{profile.servicos.length} ativos</span>
              </div>
              {profile.servicos.length ? (
                <div className="bc-service-list">
                  {profile.servicos.map((service) => (
                    <div key={service.id}>
                      <span>
                        <b>{service.nome}</b>
                        <small>{service.duracao_minutos} min</small>
                      </span>
                      <strong>{formatarValor(service.preco)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bc-profile-muted">
                  Os serviços ainda não foram configurados. Volte mais tarde ou
                  escolha outra barbearia.
                </p>
              )}
            </section>
            <section className="bc-profile-section">
              <div className="bc-section-title">
                <h4>Portfólio</h4>
                <span>{profile.portfolio.length} fotos</span>
              </div>
              {profile.portfolio.length ? (
                <div className="bc-portfolio-grid-public">
                  {profile.portfolio.map((item) => (
                    <button key={item.id} onClick={() => setImage(item)}>
                      <img
                        loading="lazy"
                        src={mediaUrl(item.imagem_url)}
                        alt={item.titulo}
                      />
                      <span>{item.titulo}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="bc-profile-muted">
                  Ainda não há fotos no portfólio.
                </p>
              )}
            </section>
            <section className="bc-profile-section">
              <div className="bc-section-title">
                <h4>Avaliações</h4>
                <span>{profile.total_avaliacoes} no total</span>
              </div>
              {profile.distribuicao_avaliacoes.length > 0 && (
                <div className="bc-rating-distribution">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = Number(
                      profile.distribuicao_avaliacoes.find(
                        (item) => Number(item.nota) === score,
                      )?.quantidade || 0,
                    );
                    const percentage = profile.total_avaliacoes
                      ? (count / profile.total_avaliacoes) * 100
                      : 0;
                    return (
                      <div key={score}>
                        <span>{score} ★</span>
                        <i>
                          <b style={{ width: `${percentage}%` }} />
                        </i>
                        <small>{count}</small>
                      </div>
                    );
                  })}
                </div>
              )}
              {profile.avaliacoes.length ? (
                <div className="bc-review-list">
                  {profile.avaliacoes.map((review) => (
                    <article key={review.id}>
                      <Avatar name={review.nome_cliente} size="sm" />
                      <div>
                        <b>{review.nome_cliente}</b>
                        <Rating value={review.nota} compact />
                        <p>{review.comentario || "Sem comentário."}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="bc-profile-muted">
                  Seja a primeira pessoa a avaliar após um atendimento.
                </p>
              )}
            </section>
            <section className="bc-profile-section">
              <h4>Horário de funcionamento</h4>
              {profile.horarios.length ? (
                <div className="bc-hours-list">
                  {weekdays.map((day, dayIndex) => {
                    const periods = profile.horarios.filter(
                      (item) => Number(item.dia_semana) === dayIndex,
                    );
                    return (
                      <div key={day}>
                        <span>{day}</span>
                        <b>
                          {periods.length
                            ? periods
                                .map(
                                  (item) =>
                                    `${String(item.inicio).slice(0, 5)}–${String(item.fim).slice(0, 5)}`,
                                )
                                .join(" · ")
                            : "Fechado"}
                        </b>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="bc-profile-muted">
                  Horários ainda não configurados.
                </p>
              )}
            </section>
          </div>
        )}
      </Modal>
      {image && (
        <Modal
          open={Boolean(image)}
          onClose={() => setImage(null)}
          title={image.titulo}
          className="bc-lightbox"
        >
          <img src={mediaUrl(image.imagem_url)} alt={image.titulo} />
          {image.descricao && <p>{image.descricao}</p>}
        </Modal>
      )}
    </>
  );
}
