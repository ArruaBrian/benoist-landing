/* Shared UI components */

function Button({ children, variant = "default", size, onClick, disabled, type = "button", ...rest }) {
  const cls = ["btn"];
  if (variant === "primary") cls.push("primary");
  if (variant === "ghost") cls.push("ghost");
  if (size === "sm") cls.push("sm");
  return (
    <button type={type} className={cls.join(" ")} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

function Field({ label, hint, help, children, fullWidth, isEstimate, onToggleEstimate, onHelp }) {
  return (
    <div className={"field" + (fullWidth ? " full" : "")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="label">{label}</span>
        {onHelp && (
          <span className="hint help" onClick={onHelp}>? Ayuda</span>
        )}
        {isEstimate !== undefined && (
          <label style={{ marginLeft: "auto", display: "inline-flex", gap: 5, alignItems: "center", fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!isEstimate}
              onChange={e => onToggleEstimate(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Estimado
          </label>
        )}
      </div>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, ...rest }) {
  return (
    <input
      className="input"
      type="text"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, ...rest }) {
  return (
    <textarea
      className="textarea"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      {...rest}
    />
  );
}

function Modal({ open, onClose, title, subtitle, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function ConnectionInfoModal({ open, onClose }) {
  const { state } = useStore();
  const configured = !!state.settings.apiKey;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modelo Fórmula"
      subtitle="Estado de la conexión"
      footer={<Button variant="primary" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className={"dot " + (configured ? "ok" : "warn")} style={{ width: 12, height: 12 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {configured ? "Modelo Fórmula conectado" : "Sin conectar"}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
            {configured
              ? "El asistente está listo para conversar con vos en tiempo real."
              : "La conexión todavía no se inicializó en este entorno."}
          </div>
        </div>
      </div>

      {!configured && (
        <div style={{ padding: 14, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>
          La conexión del modelo Fórmula se inicializa desde la configuración del entorno.<br />
          Si estás corriendo este prototipo de forma local, editá el archivo <code>env.js</code> del proyecto y completá el campo <code>apiKey</code>. Después recargá esta página.
        </div>
      )}

      <div className="hint" style={{ fontSize: 11, lineHeight: 1.5 }}>
        Para mantener el flujo simple, en este prototipo no hay un panel para pegar credenciales — la conexión se administra externamente.
      </div>
    </Modal>
  );
}

function Toast({ message, kind, onClose }) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose?.(), 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className={"toast" + (kind === "err" ? " err" : "")}>{message}</div>
  );
}

/* Tiny markdown-ish formatter for chat messages.
 * Handles **bold**, *italic*, `code`, lists (- or *), and ### headers.
 */
function formatRich(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let listBuf = null;
  let listType = null;

  function flushList() {
    if (!listBuf) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    out.push(<Tag key={"l" + out.length}>{listBuf.map((it, i) => <li key={i}>{renderInline(it)}</li>)}</Tag>);
    listBuf = null;
    listType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trim = line.trim();
    const ulMatch = trim.match(/^[-*•]\s+(.*)/);
    const olMatch = trim.match(/^(\d+)\.\s+(.*)/);
    const hMatch = trim.match(/^###\s+(.*)/);
    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuf = listBuf || [];
      listBuf.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuf = listBuf || [];
      listBuf.push(olMatch[2]);
      continue;
    }
    flushList();
    if (hMatch) {
      out.push(<h3 key={"h" + i}>{renderInline(hMatch[1])}</h3>);
    } else if (trim === "") {
      out.push(<div key={"sp" + i} style={{ height: 6 }} />);
    } else {
      out.push(<p key={"p" + i} style={{ margin: "4px 0" }}>{renderInline(line)}</p>);
    }
  }
  flushList();
  return out;
}

function renderInline(text) {
  // Tokenize **bold**, *italic*, `code`
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

Object.assign(window, {
  Button, Field, TextInput, TextArea, Modal, ConnectionInfoModal, Toast, formatRich,
});
