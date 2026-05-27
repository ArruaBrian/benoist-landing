/* Chat view for a specific agent. */

function Chat({ agentId, onToast }) {
  const store = useStore();
  const { state, appendMessage, updateLastMessage, clearConversation, setDeliverable, clearDeliverable, navigate } = store;
  const agent = AGENTS_BY_ID[agentId];
  const messages = state.conversations[agentId] || [];
  const ready = isAgentReady(state, agent);
  const missing = missingDeps(state, agent);

  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [generatingDeliverable, setGeneratingDeliverable] = React.useState(false);
  const abortRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const composerRef = React.useRef(null);

  React.useEffect(() => {
    // scroll to bottom on new messages
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Send an initial greeting from the agent the first time the user opens it.
  React.useEffect(() => {
    if (messages.length === 0 && agent && state.settings.apiKey && ready) {
      sendInitialGreeting();
    }
    // eslint-disable-next-line
  }, [agentId]);

  function buildSystemPrompt() {
    return agent.system({
      businessSummary: getBusinessSummary(state),
      deliverableSummary: getDeliverableSummary(state, agent),
    });
  }

  async function sendInitialGreeting() {
    // Ask the agent to say hello, introduce itself and ask the first focused question.
    setStreaming(true);
    appendMessage(agentId, { role: "assistant", content: "", ts: Date.now(), streaming: true });
    const sysPrompt = buildSystemPrompt();
    const userKick = "Presentate brevemente (1 párrafo, máximo 2 frases), demostrando que ya leíste el Perfil del Negocio y los entregables previos (mencioná 1-2 datos concretos que ya tenés: ej. el rubro, el producto estrella, una cifra clave). Después hacele UNA primera pregunta concreta que NO esté ya respondida en el contexto. Si la información ya disponible alcanza para empezar a trabajar, proponé directamente el primer paso en lugar de preguntar. Sin teoría, sin saludos genéricos.";
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      await minimaxChat({
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        region: state.settings.region,
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userKick },
        ],
        signal: controller.signal,
        onDelta: (_d, full) => {
          updateLastMessage(agentId, { content: full });
        },
      });
      updateLastMessage(agentId, { streaming: false });
    } catch (e) {
      updateLastMessage(agentId, { content: "⚠️ " + e.message, streaming: false, error: true });
      onToast?.({ message: "Error al consultar el modelo Fórmula: " + e.message, kind: "err" });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    if (!state.settings.apiKey) {
      onToast?.({ message: "Configurá tu API key primero desde Ajustes", kind: "err" });
      return;
    }
    setInput("");
    appendMessage(agentId, { role: "user", content: text, ts: Date.now() });
    appendMessage(agentId, { role: "assistant", content: "", ts: Date.now(), streaming: true });
    setStreaming(true);

    const history = [
      { role: "system", content: buildSystemPrompt() },
      ...messages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      await minimaxChat({
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        region: state.settings.region,
        messages: history,
        signal: controller.signal,
        onDelta: (_d, full) => updateLastMessage(agentId, { content: full }),
      });
      updateLastMessage(agentId, { streaming: false });
    } catch (e) {
      updateLastMessage(agentId, { content: "⚠️ " + e.message, streaming: false, error: true });
      onToast?.({ message: "Error: " + e.message, kind: "err" });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function generateDeliverable() {
    if (!agent.deliverable) return;
    if (!state.settings.apiKey) {
      onToast?.({ message: "Configurá tu API key", kind: "err" });
      return;
    }
    setGeneratingDeliverable(true);
    const sysPrompt = buildSystemPrompt();
    const schemaDesc = agent.deliverable.fields.map(f => `  "${f.k}": "${f.label}"`).join(",\n");
    const extractPrompt = `
A partir de TODA la conversación anterior, generá el entregable final estructurado de este agente como un objeto JSON.

Devolvé EXCLUSIVAMENTE un bloque JSON entre tres backticks, sin texto antes ni después, con este esquema (cada valor es un string en español, conciso, basado en lo conversado):

\`\`\`json
{
${schemaDesc}
}
\`\`\`

Si algún campo no se discutió, dejalo como string vacío "". No inventes datos que no aparezcan en la conversación.
`.trim();

    const history = [
      { role: "system", content: sysPrompt },
      ...messages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: extractPrompt },
    ];

    try {
      const out = await minimaxChat({
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        region: state.settings.region,
        messages: history,
        temperature: 0.2,
        maxTokens: 1200,
      });
      // Extract JSON
      const m = out.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = m ? m[1].trim() : out.trim();
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        // Try to find first {...}
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw e;
      }
      setDeliverable(agentId, parsed);
      onToast?.({ message: `Entregable de "${agent.short}" generado ✓` });
    } catch (e) {
      onToast?.({ message: "No pude generar el entregable: " + e.message, kind: "err" });
    } finally {
      setGeneratingDeliverable(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoResize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  }

  if (!ready) {
    return (
      <div className="content">
        <div className="onboarding" style={{ paddingTop: 60 }}>
          <div className="step-eyebrow">Bloqueado</div>
          <h1 className="step-title">Este agente todavía no puede arrancar</h1>
          <p className="step-desc">
            {agent.name} depende de información que aún no generamos. La cadena de agentes está pensada para que cada uno reciba contexto real del anterior — sin eso, las recomendaciones serían genéricas.
          </p>
          <div style={{ marginTop: 24, padding: 16, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8 }}>
            <div className="label" style={{ marginBottom: 8 }}>Falta completar</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {missing.map(m => <li key={m} style={{ color: "var(--warn)" }}>{m}</li>)}
            </ul>
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            {!state.onboarding.completed && (
              <Button variant="primary" onClick={() => navigate("onboarding")}>Ir al onboarding →</Button>
            )}
            <Button variant="ghost" onClick={() => navigate("hub")}>Volver al hub</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content chat">
      <div className="chat-stream" ref={streamRef}>
        <div className="agent-intro">
          <h3>{agent.name}</h3>
          <p>{agent.blurb}</p>
          {agent.deps?.length > 0 && (
            <div className="deps">
              {agent.deps.map(d => {
                const label = d === "onboarding" ? "Onboarding" : (AGENTS_BY_ID[d]?.short || d);
                const ok = d === "onboarding" ? state.onboarding.completed : !!state.deliverables[d];
                return <span key={d} className={"dep-pill " + (ok ? "ready" : "missing")}>{label}</span>;
              })}
            </div>
          )}
        </div>

        {messages.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            <div className="msg-avatar">{m.role === "user" ? "Tú" : agent.short.slice(0, 2).toUpperCase()}</div>
            <div className="msg-body">
              <div className="msg-author">{m.role === "user" ? "Vos" : agent.name}</div>
              <div className="msg-content">
                {formatRich(m.content)}
                {m.streaming && <span className="cursor" />}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="empty">
            <div className="empty-mono" style={{ marginBottom: 8 }}>Esperando inicialización</div>
            {!state.settings.apiKey && (
              <div>Configurá tu API key en Ajustes para empezar.</div>
            )}
          </div>
        )}
      </div>

      <div className="composer">
        <div className="composer-inner">
          <textarea
            ref={composerRef}
            placeholder={`Escribile a ${agent.short}... (Enter para enviar, Shift+Enter salto de línea)`}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e); }}
            onKeyDown={handleKey}
            disabled={streaming}
          />
          <div className="composer-actions">
            <span className="hint">Modelo Fórmula · activo</span>
            <div className="spacer" />
            {agent.deliverable && messages.some(m => m.role === "assistant" && m.content) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDeliverable}
                disabled={generatingDeliverable || streaming}
              >
                {generatingDeliverable ? "Generando…" : (state.deliverables[agentId] ? "Regenerar entregable" : "Finalizar y generar entregable")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (confirm("¿Borrar esta conversación?")) { clearConversation(agentId); clearDeliverable(agentId); } }}
              disabled={streaming}
            >
              Reiniciar
            </Button>
            <Button variant="primary" size="sm" onClick={send} disabled={streaming || !input.trim()}>
              {streaming ? "…" : "Enviar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Chat = Chat;
