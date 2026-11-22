import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../api";
import { AppShell } from "../components/AppShell";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
} from "../components/ui";
import { useToast } from "../contexts/ToastContext";

const allowed = ["image/jpeg", "image/png", "image/webp"];

export default function Portfolio() {
  const [shop, setShop] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileInput = useRef(null);
  const toast = useToast();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/agenda/funcionamento");
      setShop(data.barbearia);
      if (data.barbearia)
        setItems(await apiFetch(`/portfolio/barbearia/${data.barbearia.id}`));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  function chooseFile(candidate) {
    if (!candidate) return;
    if (!allowed.includes(candidate.type))
      return toast.error("Escolha uma imagem JPG, PNG ou WebP.");
    if (candidate.size > 5 * 1024 * 1024)
      return toast.error("A imagem deve ter no máximo 5 MB.");
    if (preview) URL.revokeObjectURL(preview);
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }
  async function upload(event) {
    event.preventDefault();
    if (!file || !title.trim())
      return toast.warning(
        "Dê um título e escolha uma foto antes de publicar.",
      );
    setUploading(true);
    try {
      const form = new FormData();
      form.append("titulo", title.trim());
      form.append("descricao", description.trim());
      form.append("imagem", file);
      const created = await apiFetch("/portfolio", {
        method: "POST",
        body: form,
        timeout: 30000,
      });
      setItems((current) => [created, ...current]);
      setTitle("");
      setDescription("");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      if (fileInput.current) fileInput.current.value = "";
      toast.success("Foto adicionada ao seu portfólio.");
    } catch (uploadError) {
      toast.error(uploadError.message);
    } finally {
      setUploading(false);
    }
  }
  async function saveEdit(data) {
    try {
      const updated = await apiFetch(`/portfolio/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(null);
      toast.success("Informações da foto atualizadas.");
    } catch (saveError) {
      toast.error(saveError.message);
    }
  }
  async function remove(item) {
    try {
      await apiFetch(`/portfolio/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((photo) => photo.id !== item.id));
      toast.success("Foto removida do portfólio.");
    } catch (removeError) {
      toast.error(removeError.message);
    }
  }
  if (loading)
    return (
      <AppShell
        role="barbeiro"
        eyebrow="VITRINE VISUAL"
        title="Seu melhor trabalho, primeiro."
      >
        <LoadingState label="Carregando portfólio" />
      </AppShell>
    );
  if (error)
    return (
      <AppShell
        role="barbeiro"
        eyebrow="VITRINE VISUAL"
        title="Seu melhor trabalho, primeiro."
      >
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
  if (!shop)
    return (
      <AppShell
        role="barbeiro"
        eyebrow="VITRINE VISUAL"
        title="Seu melhor trabalho, primeiro."
      >
        <EmptyState
          title="Cadastre a barbearia antes do portfólio."
          description="Assim suas fotos aparecem no perfil público certo."
        />
      </AppShell>
    );
  return (
    <AppShell
      role="barbeiro"
      eyebrow="VITRINE VISUAL"
      title="Mostre antes de explicar."
    >
      <div className="bc-portfolio-manager">
        <section className="bc-upload-panel">
          <div>
            <p className="bc-kicker">NOVA FOTO</p>
            <h2>Seu corte é seu melhor argumento.</h2>
            <p>
              Fotos reais ajudam o cliente a decidir antes de pedir um horário.
            </p>
          </div>
          <form onSubmit={upload}>
            <button
              type="button"
              className={`bc-dropzone ${preview ? "has-preview" : ""}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(event.dataTransfer.files?.[0]);
              }}
            >
              {preview ? (
                <img src={preview} alt="Prévia da foto escolhida" />
              ) : (
                <>
                  <span>↑</span>
                  <b>Solte a foto aqui</b>
                  <small>
                    ou clique para escolher · JPG, PNG ou WebP até 5 MB
                  </small>
                </>
              )}
            </button>
            <input
              ref={fileInput}
              className="bc-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <label className="bc-field">
              <span>Título do corte</span>
              <input
                required
                maxLength="100"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Degradê baixo com acabamento"
              />
            </label>
            <label className="bc-field">
              <span>
                Descrição <small>(opcional)</small>
              </span>
              <textarea
                maxLength="400"
                rows="3"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tipo de corte, acabamento ou procedimento"
              />
            </label>
            <Button type="submit" loading={uploading}>
              Publicar no portfólio
            </Button>
          </form>
        </section>
        <section className="bc-my-gallery">
          <div className="bc-section-title">
            <div>
              <p className="bc-kicker">PORTFÓLIO PÚBLICO</p>
              <h2>
                {items.length} foto{items.length === 1 ? "" : "s"} que vendem
                seu trabalho.
              </h2>
            </div>
          </div>
          {items.length ? (
            <div className="bc-portfolio-grid-manager">
              {items.map((item) => (
                <article key={item.id}>
                  <img
                    loading="lazy"
                    src={mediaUrl(item.imagem_url)}
                    alt={item.titulo}
                  />
                  <div>
                    <b>{item.titulo}</b>
                    <p>{item.descricao || "Sem descrição."}</p>
                  </div>
                  <footer>
                    <button onClick={() => setEditing(item)}>Editar</button>
                    <button onClick={() => remove(item)}>Remover</button>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="SEU PORTFÓLIO ESTÁ VAZIO"
              title="Adicione sua primeira foto."
              description="Comece por um corte que represente o tipo de cliente que você quer atrair."
            />
          )}
        </section>
      </div>
      <EditPhotoModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />
    </AppShell>
  );
}
function EditPhotoModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.titulo || "");
  const [description, setDescription] = useState(item?.descricao || "");
  useEffect(() => {
    setTitle(item?.titulo || "");
    setDescription(item?.descricao || "");
  }, [item]);
  return (
    <Modal open={Boolean(item)} onClose={onClose} title="Editar foto">
      <form
        className="bc-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ titulo: title, descricao: description });
        }}
      >
        <label className="bc-field">
          <span>Título</span>
          <input
            required
            maxLength="100"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="bc-field">
          <span>Descrição</span>
          <textarea
            maxLength="400"
            rows="4"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="bc-modal-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar alterações</Button>
        </div>
      </form>
    </Modal>
  );
}
