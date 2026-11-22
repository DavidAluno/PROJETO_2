import { useEffect, useId, useRef } from "react";

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`bc-button bc-button-${variant} ${className}`}
      disabled={loading || props.disabled}
    >
      {loading && <span className="bc-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      {...props}
      type={props.type || "button"}
      className={`bc-icon-button-new ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, hint, className = "", id, ...props }) {
  const fieldId = id || props.name;
  return (
    <label className={`bc-field ${error ? "has-error" : ""}`} htmlFor={fieldId}>
      <span>{label}</span>
      <input
        id={fieldId}
        className={className}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {hint && !error && <small>{hint}</small>}
      {error && <small className="bc-field-error">{error}</small>}
    </label>
  );
}

export function Select({ label, error, children, id, ...props }) {
  const fieldId = id || props.name;
  return (
    <label className={`bc-field ${error ? "has-error" : ""}`} htmlFor={fieldId}>
      <span>{label}</span>
      <select id={fieldId} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error && <small className="bc-field-error">{error}</small>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, className = "" }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
    const frame = window.requestAnimationFrame(() => {
      const [first] = focusable();
      (first || dialogRef.current)?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="bc-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex="-1"
        className={`bc-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="bc-modal-head">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Fechar" onClick={onClose}>
            ×
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Badge({ children, tone = "default" }) {
  return <span className={`bc-badge is-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const labels = {
    pendente: "Aguardando confirmação",
    confirmado: "Confirmado",
    urgente: "Pedido de encaixe",
    recusado: "Recusado",
    cancelado: "Cancelado",
    concluido: "Concluído",
    expirado: "Expirado",
  };
  const tone = ["confirmado", "concluido"].includes(status)
    ? "success"
    : ["cancelado", "recusado", "expirado"].includes(status)
      ? "danger"
      : status === "urgente"
        ? "warning"
        : "default";
  return <Badge tone={tone}>{labels[status] || status}</Badge>;
}

export function Rating({ value = 0, count, compact = false }) {
  const rating = Number(value || 0);
  return (
    <span
      className={`bc-rating ${compact ? "is-compact" : ""}`}
      aria-label={`Avaliação ${rating.toFixed(1)} de 5`}
    >
      <span aria-hidden="true">★</span>
      <b>{rating ? rating.toFixed(1) : "Novo"}</b>
      {count !== undefined && (
        <small>
          · {count} {Number(count) === 1 ? "avaliação" : "avaliações"}
        </small>
      )}
    </span>
  );
}

export function Avatar({ name = "", src, size = "md" }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BC";
  return (
    <span className={`bc-avatar is-${size}`}>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <span className={`bc-skeleton ${className}`} aria-hidden="true" />;
}

export function LoadingState({ label = "Carregando" }) {
  return (
    <div className="bc-loading-state">
      <span className="bc-spinner" />
      <p>{label}…</p>
    </div>
  );
}

export function EmptyState({
  eyebrow = "AINDA NÃO HÁ NADA AQUI",
  title,
  description,
  action,
}) {
  return (
    <section className="bc-empty-state-new">
      <p className="bc-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div>{action}</div>}
    </section>
  );
}

export function ErrorState({
  title = "Não foi possível carregar agora",
  description,
  action,
}) {
  return (
    <section className="bc-error-state">
      <p className="bc-kicker">ALGO SAIU FORA DO CORTE</p>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}
