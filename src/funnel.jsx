/* Visual funnel renderer for the "funnel" agent deliverable.
 * Renders the 5 brief stages with tapering width, action chips and KPI badges.
 */

const FUNNEL_STAGES = [
  {
    n: 1,
    id: "alcance",
    title: "Alcance",
    desc: "Cuánta gente ve la estrategia.",
    width: 100,
    accionesKey: "alcance_acciones",
    kpiKey: "alcance_kpi",
  },
  {
    n: 2,
    id: "primer_contacto",
    title: "Primer contacto",
    desc: "El usuario escanea, entra al WhatsApp, llega a la landing, inicia conversación.",
    width: 84,
    accionesKey: "primer_contacto_acciones",
    kpiKey: "primer_contacto_kpi",
  },
  {
    n: 3,
    id: "proceso_venta",
    title: "Proceso de venta",
    desc: "Variante interna: venta directa, cotización o agendamiento.",
    width: 68,
    accionesKey: "proceso_venta_pasos",
    kpiKey: null,
    showModelo: true,
  },
  {
    n: 4,
    id: "conversion",
    title: "Conversión",
    desc: "Cuánta gente efectivamente compra.",
    width: 52,
    accionesKey: null,
    kpiKey: "conversion_kpi",
  },
  {
    n: 5,
    id: "recompra",
    title: "Recompra",
    desc: "Cuánta gente vuelve a comprar.",
    width: 38,
    accionesKey: "recompra_acciones",
    kpiKey: "recompra_kpi",
  },
];

function splitItems(text) {
  if (!text) return [];
  return String(text)
    .split(/\n|[•·]|[,;](?=\s)/)
    .map(s => s.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function FunnelVisual({ data, compact }) {
  if (!data) return null;
  const modelo = (data.modelo_venta || "").toLowerCase();
  const modeloLabel = modelo.includes("direct") ? "Venta directa"
    : modelo.includes("cotiz") ? "Cotización"
    : modelo.includes("agend") ? "Agendamiento"
    : data.modelo_venta || "";

  return (
    <div className={"funnel " + (compact ? "compact" : "")}>
      <div className="funnel-spine" aria-hidden="true" />
      {FUNNEL_STAGES.map((s, idx) => {
        const acciones = s.accionesKey ? splitItems(data[s.accionesKey]) : [];
        const kpi = s.kpiKey ? data[s.kpiKey] : null;
        const empty = !acciones.length && !kpi && !(s.showModelo && modeloLabel);
        return (
          <div
            key={s.id}
            className={"funnel-stage " + (empty ? "empty" : "")}
            style={{ width: compact ? "100%" : `${s.width}%`, animationDelay: `${idx * 70}ms` }}
          >
            <div className="funnel-stage-rail">
              <div className="funnel-stage-dot">{s.n}</div>
              {idx < FUNNEL_STAGES.length - 1 && <div className="funnel-stage-line" />}
            </div>
            <div className="funnel-stage-card">
              <div className="funnel-stage-head">
                <div className="funnel-stage-title">{s.title}</div>
                {kpi && (
                  <div className="funnel-kpi" title="KPI principal">
                    <span className="funnel-kpi-label">KPI</span>
                    <span className="funnel-kpi-value">{kpi}</span>
                  </div>
                )}
              </div>
              {!compact && <div className="funnel-stage-desc">{s.desc}</div>}
              {s.showModelo && modeloLabel && (
                <div className="funnel-modelo">
                  <span className="funnel-modelo-tag">Modelo</span>
                  <span className="funnel-modelo-value">{modeloLabel}</span>
                </div>
              )}
              {acciones.length > 0 && (
                <div className="funnel-actions">
                  {acciones.map((a, i) => (
                    <div key={i} className="funnel-action">{a}</div>
                  ))}
                </div>
              )}
              {empty && (
                <div className="funnel-stage-empty">— sin acciones definidas —</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

window.FunnelVisual = FunnelVisual;
