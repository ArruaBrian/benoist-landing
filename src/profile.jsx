/* Final consolidated "Perfil del Negocio" view */

function ProfileView() {
  const { state, navigate } = useStore();
  const b = state.business;
  const e = state.estimates;

  // Show celebration banner the first time the user lands on profile
  // after completing onboarding.
  const [showCeleb, setShowCeleb] = React.useState(() => {
    return state.onboarding.completed && !localStorage.getItem("formula.celebrationSeen");
  });
  React.useEffect(() => {
    if (showCeleb) {
      localStorage.setItem("formula.celebrationSeen", "1");
    }
  }, [showCeleb]);

  function Card({ label, value, fieldKey }) {
    const isEst = fieldKey && e[fieldKey];
    return (
      <div className="profile-card">
        <div className="k">{label}</div>
        <div className="v">
          {value || <span style={{ color: "var(--fg-4)" }}>—</span>}
          {isEst && <span className="estim-tag" style={{ marginLeft: 8 }}>Estimado</span>}
        </div>
      </div>
    );
  }

  function DeliverableBlock({ agentId }) {
    const agent = AGENTS_BY_ID[agentId];
    const d = state.deliverables[agentId];
    if (!agent?.deliverable) return null;
    const isFunnel = agent.deliverable.visual === "funnel";
    return (
      <div className="profile-section">
        <div className="profile-section-head">
          <h2>{agent.deliverable.title}</h2>
          <span className={"badge " + (d ? "done" : "")}>{d ? "Listo" : "Pendiente"}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("agent", agentId)}>
              {d ? "Abrir chat" : "Empezar"}
            </Button>
          </div>
        </div>
        {d ? (
          isFunnel ? (
            <FunnelVisual data={d} />
          ) : (
            <div className="profile-grid">
              {agent.deliverable.fields.map(f => (
                <Card key={f.k} label={f.label} value={d[f.k]} />
              ))}
            </div>
          )
        ) : (
          <div className="empty" style={{ textAlign: "left", padding: "8px 0" }}>
            Aún no generaste este entregable. Abrí el chat del agente y, cuando hayan llegado a una conclusión, presioná "Finalizar y generar entregable".
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="profile-view">
        {showCeleb && (
          <div className="celebration" role="status">
            <div className="celebration-ring" aria-hidden="true">
              <div className="celebration-ring-inner">✓</div>
            </div>
            <div className="celebration-body">
              <div className="celebration-eyebrow">Onboarding completado</div>
              <h2>Perfecto. Tu negocio ya está cargado.</h2>
              <p>Cada agente de la cadena ahora tiene contexto real para trabajar. El próximo paso es definir tu <strong>oferta principal</strong> con el primer agente.</p>
              <div className="celebration-cta">
                <Button variant="primary" onClick={() => navigate("agent", "oferta")}>Empezar con el Agente de Oferta →</Button>
                <Button variant="ghost" onClick={() => setShowCeleb(false)}>Más tarde</Button>
              </div>
            </div>
          </div>
        )}
        <h1>Perfil del Negocio</h1>
        <div className="sub">Resumen consolidado — Onboarding + entregables de cada agente</div>

        <div className="profile-section">
          <div className="profile-section-head">
            <h2>Datos del negocio</h2>
            <span className={"badge " + (state.onboarding.completed ? "done" : "")}>
              {state.onboarding.completed ? "Onboarding completo" : "Onboarding pendiente"}
            </span>
            <div style={{ marginLeft: "auto" }}>
              <Button variant="ghost" size="sm" onClick={() => navigate("onboarding")}>Editar</Button>
            </div>
          </div>
          <div className="profile-grid">
            <Card label="Nombre" value={b.nombre} fieldKey="nombre" />
            <Card label="Rubro" value={b.rubro} fieldKey="rubro" />
            <Card label="Descripción" value={b.descripcion} fieldKey="descripcion" />
            <Card label="Antigüedad" value={b.antiguedad} fieldKey="antiguedad" />
            <Card label="Empleados" value={b.empleados} fieldKey="empleados" />
            <Card label="Ubicación" value={b.ubicacion} fieldKey="ubicacion" />
            <Card label="Facturación aprox." value={b.facturacionAprox} fieldKey="facturacionAprox" />
            <Card label="Instagram" value={b.instagram} />
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-head">
            <h2>Productos</h2>
          </div>
          <div className="profile-grid">
            <Card label="Productos" value={b.productos} />
            <Card label="Producto estrella" value={b.productoEstrella} />
            <Card label="¿Por qué?" value={b.productoEstrellaRazon} />
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-head">
            <h2>Finanzas</h2>
          </div>
          <div className="profile-grid">
            <Card label="Facturación mensual" value={b.facturacion} fieldKey="facturacion" />
            <Card label="Costos fijos" value={b.costosFijos} fieldKey="costosFijos" />
            <Card label="Costos variables" value={b.costosVariables} fieldKey="costosVariables" />
            <Card label="Ticket promedio" value={b.ticketPromedio} fieldKey="ticketPromedio" />
            <Card label="Capital disponible" value={b.capitalDisponible} fieldKey="capitalDisponible" />
            <Card label="Ventas mensuales" value={b.ventasMensuales} fieldKey="ventasMensuales" />
            <Card label="Tiempo de espera" value={b.tiempoEspera} fieldKey="tiempoEspera" />
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-head">
            <h2>Mercado</h2>
          </div>
          <div className="profile-grid">
            <Card label="Cliente ideal" value={b.clienteIdeal} />
            <Card label="Ubicación cliente" value={b.ubicacionCliente} />
            <Card label="Nivel económico" value={b.nivelEconomico} />
            <Card label="Proceso de compra" value={b.procesoCompra} />
            <Card label="Medios que consume" value={b.medios} />
          </div>
        </div>

        {AGENTS.filter(a => a.deliverable).map(a => (
          <DeliverableBlock key={a.id} agentId={a.id} />
        ))}
      </div>
    </div>
  );
}

window.ProfileView = ProfileView;
