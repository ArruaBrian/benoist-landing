/* FunnelConstructor: Manual funnel builder with progressive stages, KPIs, and optimize button.
 * User pastes data per stage from ChatGPT. No agent chain needed.
 */

const CONSTRUCTOR_STAGES = [
  {
    id: "alcance",
    n: 1,
    title: "Alcance",
    desc: "Cuánta gente ve tu estrategia. Ej: anuncios, volantes, QR, Instagram.",
    fields: [
      { key: "acciones", label: "Acciones de alcance", placeholder: "Pegá las acciones que te dio ChatGPT para esta etapa...", type: "textarea" },
      { key: "kpi", label: "KPI principal", placeholder: "Ej: 1500 impresiones/día", type: "text" },
    ],
  },
  {
    id: "primer_contacto",
    n: 2,
    title: "Primer Contacto",
    desc: "El usuario escanea, entra al WhatsApp, llega a la landing, inicia conversación.",
    fields: [
      { key: "acciones", label: "Acciones de primer contacto", placeholder: "Pegá las acciones para esta etapa...", type: "textarea" },
      { key: "kpi", label: "KPI principal", placeholder: "Ej: 3% tasa de contacto", type: "text" },
    ],
  },
  {
    id: "proceso_venta",
    n: 3,
    title: "Proceso de Venta",
    desc: "Variante interna: venta directa, cotización o agendamiento.",
    fields: [
      { key: "modelo_venta", label: "Modelo de venta", placeholder: "Ej: venta directa / cotización / agendamiento", type: "text" },
      { key: "acciones", label: "Pasos del proceso", placeholder: "Pegá los pasos del proceso de venta...", type: "textarea" },
      { key: "kpi", label: "KPI principal", placeholder: "Ej: 60% de cotizaciones respondidas", type: "text" },
    ],
  },
  {
    id: "conversion",
    n: 4,
    title: "Conversión",
    desc: "Cuánta gente efectivamente compra.",
    fields: [
      { key: "acciones", label: "Acciones de conversión", placeholder: "Pegá las acciones para cerrar ventas...", type: "textarea" },
      { key: "kpi", label: "KPI principal", placeholder: "Ej: 2% tasa de conversión", type: "text" },
    ],
  },
  {
    id: "recompra",
    n: 5,
    title: "Recompra",
    desc: "Cuánta gente vuelve a comprar.",
    fields: [
      { key: "acciones", label: "Acciones de recompra", placeholder: "Pegá las acciones de fidelización y recompra...", type: "textarea" },
      { key: "kpi", label: "KPI principal", placeholder: "Ej: 15% tasa de recompra", type: "text" },
    ],
  },
];

function isStageComplete(stageData) {
  if (!stageData) return false;
  return !!(stageData.acciones && stageData.acciones.trim() && stageData.kpi && stageData.kpi.trim());
}

function isFunnelComplete(stages) {
  return CONSTRUCTOR_STAGES.every(s => isStageComplete(stages[s.id]));
}

function FunnelConstructor() {
  const { state, setFunnelStage, setFunnelRecommendations, setFunnelOptimizing } = useStore();
  const funnel = state.funnel;
  const stages = funnel.stages;
  const [error, setError] = React.useState(null);

  // Determine which stages are unlocked (progressive)
  const getStageStatus = (idx) => {
    if (idx === 0) return "active";
    const prevStage = CONSTRUCTOR_STAGES[idx - 1];
    if (isStageComplete(stages[prevStage.id])) {
      return isStageComplete(stages[CONSTRUCTOR_STAGES[idx].id]) ? "complete" : "active";
    }
    return "locked";
  };

  // All stages before current are "complete" if they have data
  const getEffectiveStatus = (idx) => {
    if (isStageComplete(stages[CONSTRUCTOR_STAGES[idx].id])) return "complete";
    // Check all previous stages are complete
    for (let i = 0; i < idx; i++) {
      if (!isStageComplete(stages[CONSTRUCTOR_STAGES[i].id])) return "locked";
    }
    return "active";
  };

  const allComplete = isFunnelComplete(stages);

  const handleOptimize = async () => {
    if (!allComplete) return;
    setError(null);
    setFunnelOptimizing(true);

    // Build funnel summary for the AI
    const funnelSummary = CONSTRUCTOR_STAGES.map(s => {
      const d = stages[s.id];
      let text = `Etapa ${s.n}: ${s.title}\n`;
      text += `  Acciones: ${d.acciones}\n`;
      text += `  KPI: ${d.kpi}\n`;
      if (d.modelo_venta) text += `  Modelo de venta: ${d.modelo_venta}\n`;
      return text;
    }).join("\n");

    const businessSummary = window.getBusinessSummary ? window.getBusinessSummary(state) : "";

    const systemPrompt = `Sos un consultor experto en funnels de venta para emprendedores. Te van a dar un funnel armado con 5 etapas (Alcance, Primer Contacto, Proceso de Venta, Conversión, Recompra) junto con el contexto del negocio.

Tu trabajo es analizar el funnel y dar recomendaciones CONCRETAS y EJECUTABLES para mejorarlo. No teoría, no explicaciones largas.

Para cada etapa, identificá:
- Qué está bien y se puede mantener.
- Qué se puede mejorar y cómo (acción concreta).
- Si hay un cuello de botella o punto débil evidente.

Al final, dá 3 recomendaciones prioritarias ordenadas por impacto.

Formato: usá negritas (**texto**), listas con guiones, y sé directo. Máximo 400 palabras totales.`;

    const userMsg = `Contexto del negocio:\n${businessSummary}\n\nFunnel actual:\n${funnelSummary}\n\nAnalizá este funnel y dame recomendaciones concretas para optimizarlo.`;

    try {
      const result = await window.minimaxChat({
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        region: state.settings.region,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.6,
        maxTokens: 1500,
      });
      setFunnelRecommendations(result);
    } catch (e) {
      setError(e.message || "Error al optimizar el funnel");
      setFunnelOptimizing(false);
    }
  };

  return (
    <div className="content">
      <div className="funnel-constructor">
        <div className="funnel-constructor-header">
          <h2>Constructor de Funnel</h2>
          <p>Completá cada etapa con los datos que te dio ChatGPT. Las etapas se desbloquean progresivamente.</p>
        </div>

        <div className="funnel-constructor-stages">
          {CONSTRUCTOR_STAGES.map((stage, idx) => {
            const status = getEffectiveStatus(idx);
            const stageData = stages[stage.id] || {};

            return (
              <div
                key={stage.id}
                className={`funnel-constructor-stage status-${status}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="funnel-constructor-stage-header">
                  <div className="funnel-constructor-stage-num">
                    {status === "complete" ? (
                      <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                        <path d="M4 8.5l2.5 2.5L12 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : status === "locked" ? (
                      <span style={{ fontSize: 10 }}>🔒</span>
                    ) : (
                      <span>{stage.n}</span>
                    )}
                  </div>
                  <div>
                    <div className="funnel-constructor-stage-title">{stage.title}</div>
                    <div className="funnel-constructor-stage-desc">{stage.desc}</div>
                  </div>
                </div>

                {status !== "locked" && (
                  <div className="funnel-constructor-stage-fields">
                    {stage.fields.map(field => (
                      <Field key={field.key} label={field.label}>
                        {field.type === "textarea" ? (
                          <TextArea
                            value={stageData[field.key] || ""}
                            onChange={(val) => setFunnelStage(stage.id, { ...stageData, [field.key]: val })}
                            placeholder={field.placeholder}
                            rows={4}
                            disabled={status === "locked"}
                          />
                        ) : (
                          <TextInput
                            value={stageData[field.key] || ""}
                            onChange={(val) => setFunnelStage(stage.id, { ...stageData, [field.key]: val })}
                            placeholder={field.placeholder}
                            disabled={status === "locked"}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="funnel-constructor-progress">
          <div className="funnel-constructor-progress-bar">
            <div
              className="funnel-constructor-progress-fill"
              style={{ width: `${(CONSTRUCTOR_STAGES.filter((s) => isStageComplete(stages[s.id])).length / CONSTRUCTOR_STAGES.length) * 100}%` }}
            />
          </div>
          <span className="funnel-constructor-progress-text">
            {CONSTRUCTOR_STAGES.filter((s) => isStageComplete(stages[s.id])).length} / {CONSTRUCTOR_STAGES.length} etapas completas
          </span>
        </div>

        {/* Optimize button */}
        {allComplete && (
          <div className="funnel-constructor-optimize">
            <Button
              variant="primary"
              onClick={handleOptimize}
              disabled={funnel.optimizing}
            >
              {funnel.optimizing ? "Optimizando..." : "Optimizar Funnel →"}
            </Button>
            <span className="funnel-constructor-optimize-hint">
              Analiza tu funnel con IA y te da recomendaciones concretas para mejorar cada etapa.
            </span>
          </div>
        )}

        {error && (
          <div className="funnel-constructor-error">
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {/* Recommendations */}
        {funnel.recommendations && (
          <div className="funnel-constructor-recommendations">
            <div className="funnel-constructor-recommendations-header">
              <h3>Recomendaciones de optimización</h3>
              <Button variant="ghost" size="sm" onClick={() => setFunnelRecommendations(null)}>Cerrar</Button>
            </div>
            <div className="funnel-constructor-recommendations-body" dangerouslySetInnerHTML={{ __html: formatRecommendations(funnel.recommendations) }} />
            <div className="funnel-constructor-recommendations-footer">
              <Button variant="ghost" size="sm" onClick={handleOptimize} disabled={funnel.optimizing}>
                {funnel.optimizing ? "Analizando..." : "Volver a analizar"}
              </Button>
            </div>
          </div>
        )}

        {/* Visual funnel preview when complete */}
        {allComplete && !funnel.recommendations && (
          <div className="funnel-constructor-preview">
            <h3>Vista previa del funnel</h3>
            <FunnelVisual data={{
              alcance_acciones: stages.alcance.acciones,
              alcance_kpi: stages.alcance.kpi,
              primer_contacto_acciones: stages.primer_contacto.acciones,
              primer_contacto_kpi: stages.primer_contacto.kpi,
              modelo_venta: stages.proceso_venta.modelo_venta,
              proceso_venta_pasos: stages.proceso_venta.acciones,
              conversion_kpi: stages.conversion.kpi,
              recompra_acciones: stages.recompra.acciones,
              recompra_kpi: stages.recompra.kpi,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

// Simple markdown-like formatter for recommendations
function formatRecommendations(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/<\/ul>\s*<ul>/g, "")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

window.FunnelConstructor = FunnelConstructor;
