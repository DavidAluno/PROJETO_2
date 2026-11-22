import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { AppShell } from "../components/AppShell";
import { Button, ErrorState, Input, LoadingState } from "../components/ui";
import { useToast } from "../contexts/ToastContext";

export default function EditarBarbearia() {
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await apiFetch("/agendamentos/dashboard");
      if (!dashboard.barbearia) {
        navigate("/barbeiro/cadastrar", { replace: true });
        return;
      }
      setShop(dashboard.barbearia);
      setForm({
        ...dashboard.barbearia,
        descricao: dashboard.barbearia.descricao || "",
        especialidades: dashboard.barbearia.especialidades || "",
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);
  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "endereco" ? { latitude: null, longitude: null } : {}),
    }));
  }
  function captureCurrentLocation() {
    if (!navigator.geolocation)
      return setError(
        "Seu navegador não oferece localização. Vamos usar o endereço informado.",
      );
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })),
      () =>
        setError(
          "Localização não compartilhada. Vamos usar o endereço informado.",
        ),
      { enableHighAccuracy: false, timeout: 9000 },
    );
  }
  async function submit(event) {
    event.preventDefault();
    if (!form) return;
    setError("");
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        endereco: form.endereco.trim(),
        descricao: form.descricao.trim(),
        especialidades: form.especialidades.trim(),
      };
      if (
        Number.isFinite(Number(form.latitude)) &&
        Number.isFinite(Number(form.longitude))
      )
        Object.assign(payload, {
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        });
      const updated = await apiFetch(`/barbearias/${shop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setShop(updated);
      setForm({
        ...updated,
        descricao: updated.descricao || "",
        especialidades: updated.especialidades || "",
      });
      toast.success("Perfil público atualizado.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <AppShell
        role="barbeiro"
        eyebrow="PERFIL PÚBLICO"
        title="Editar barbearia."
      >
        <LoadingState label="Carregando sua barbearia" />
      </AppShell>
    );
  if (error && !form)
    return (
      <AppShell
        role="barbeiro"
        eyebrow="PERFIL PÚBLICO"
        title="Editar barbearia."
      >
        <ErrorState
          description={error}
          action={<Button onClick={load}>Tentar novamente</Button>}
        />
      </AppShell>
    );
  const hasCoordinates =
    Number.isFinite(Number(form?.latitude)) &&
    Number.isFinite(Number(form?.longitude));
  return (
    <AppShell
      role="barbeiro"
      eyebrow="PERFIL PÚBLICO"
      title="Como os clientes encontram você."
    >
      <form className="bc-shop-setup" onSubmit={submit}>
        <section>
          <p className="bc-kicker">NO MAPA E NO PERFIL</p>
          <h2>Deixe sua casa com a sua cara.</h2>
          <p>
            Alterar o endereço localiza novamente sua barbearia; você também
            pode usar a localização atual.
          </p>
        </section>
        <div className="bc-shop-setup-fields">
          <Input
            label="Nome da barbearia"
            maxLength="140"
            value={form.nome}
            onChange={(event) => update("nome", event.target.value)}
            required
          />
          <label className="bc-field">
            <span>Descrição</span>
            <textarea
              maxLength="600"
              rows="4"
              value={form.descricao}
              onChange={(event) => update("descricao", event.target.value)}
            />
          </label>
          <Input
            label="Especialidades"
            maxLength="300"
            value={form.especialidades}
            onChange={(event) => update("especialidades", event.target.value)}
          />
          <Input
            label="Endereço"
            maxLength="300"
            value={form.endereco}
            onChange={(event) => update("endereco", event.target.value)}
            required
          />
          <div className="bc-location-card">
            <span>⌖</span>
            <div>
              <b>Localização do mapa</b>
              <p>
                {hasCoordinates
                  ? "Ponto de mapa definido."
                  : "O endereço será localizado ao salvar."}
              </p>
              <small>
                {hasCoordinates
                  ? `Lat. ${Number(form.latitude).toFixed(5)} · Long. ${Number(form.longitude).toFixed(5)}`
                  : "Sem coordenadas informadas."}
              </small>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={captureCurrentLocation}
            >
              Usar minha localização
            </Button>
          </div>
          {error && (
            <p className="bc-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="bc-setup-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/barbeiro")}
            >
              Voltar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
