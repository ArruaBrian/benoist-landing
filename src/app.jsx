/* Main App shell: sidebar + main + aside + routing */

const NumBadge = ({ value, done }) => (
  <div className="nav-num">
    {done ? (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 8.5l2.5 2.5L12 5.5" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <span>{value}</span>
    )}
  </div>
);

function Sidebar({ onOpenStatus, className = "" }) {
  const { state, navigate } = useStore();
  const route = state.route;

  const onbActive = route.view === "onboarding";
  const onbDone = state.onboarding.completed;

  return (
    <aside className={"sidebar " + className}>
      <div className="brand">
        <div className="brand-mark" aria-label="Fórmula">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="7" y="8" width="18" height="3.2" rx="1.6" fill="#0a0a0a" />
            <rect x="7" y="14.4" width="13" height="3.2" rx="1.6" fill="#0a0a0a" />
            <rect x="7" y="20.8" width="8" height="3.2" rx="1.6" fill="#0a0a0a" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Fórmula</div>
        </div>
        <div className="brand-sub">v0.1</div>
      </div>

      <div className="nav-section">Tu negocio</div>
      <div className="nav-list">
        <button
          className={"nav-item " + (route.view === "welcome" ? "active" : "")}
          onClick={() => navigate("welcome")}
        >
          <NumBadge value="·" />
          <span className="nav-label">Inicio</span>
        </button>
        <button
          className={"nav-item " + (onbActive ? "active" : "") + (onbDone ? " done" : "")}
          onClick={() => navigate("onboarding")}
        >
          <NumBadge value="0" done={onbDone} />
          <span className="nav-label">Onboarding</span>
          {!onbDone && <span className="nav-meta">{state.onboarding.step + 1}/4</span>}
        </button>
        <button
          className={"nav-item " + (route.view === "profile" ? "active" : "")}
          onClick={() => navigate("profile")}
        >
          <NumBadge value="≡" />
          <span className="nav-label">Perfil del Negocio</span>
        </button>
        <button
          className={"nav-item " + (route.view === "funnel" ? "active" : "")}
          onClick={() => navigate("funnel")}
        >
          <NumBadge value="▽" />
          <span className="nav-label">Constructor de Funnel</span>
        </button>
      </div>

      <button className="sidebar-foot conn-pill" onClick={onOpenStatus} title="Estado de conexión">
        <div className={"dot " + (state.settings.apiKey ? "ok" : "warn")} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {state.settings.apiKey ? "Modelo Fórmula" : "Sin conectar"}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-3)" }}>→</span>
      </button>
    </aside>
  );
}

function Topbar({ title, sub, actions, onToggleNav }) {
  return (
    <div className="topbar">
      {onToggleNav && (
        <button className="hamburger" onClick={onToggleNav} aria-label="Menú">
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
      <div>
        <div className="topbar-title">{title}</div>
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      <div className="topbar-actions">{actions}</div>
    </div>
  );
}

function Aside({ agentId, className = "" }) {
  const { state, navigate } = useStore();
  // Always show ALL existing deliverables — the user wants full business
  // context visible while talking to any agent.
  const allDeliverableAgents = AGENTS.filter(a => a.deliverable);
  const showAgents = allDeliverableAgents;
  const activeDeps = agentId ? (AGENTS_BY_ID[agentId]?.deps || []) : [];

  const hasAny = showAgents.some(a => state.deliverables[a.id]);

  return (
    <aside className={"aside " + className}>
      <div className="aside-head">
        <h3>Entregables</h3>
        <p>{agentId ? "Contexto activo" : "Resumen del negocio"}</p>
      </div>
      <div className="aside-body">
        {!hasAny && (
          <div className="empty">
            <div className="empty-mono" style={{ marginBottom: 6 }}>Sin entregables aún</div>
            <div>A medida que conversás con cada agente y presionás "Finalizar y generar entregable", los resultados estructurados aparecen acá.</div>
          </div>
        )}
        {showAgents.map(a => {
          const d = state.deliverables[a.id];
          if (!d) return null;
          const isFunnel = a.deliverable?.visual === "funnel";
          const isDep = activeDeps.includes(a.id);
          const isCurrent = a.id === agentId;
          return (
            <div key={a.id} className={"deliverable" + (isDep ? " is-dep" : "") + (isCurrent ? " is-current" : "")}>
              <div className="deliverable-head">
                <span className="label">{a.short}</span>
                {isDep && <span className="dep-pill ready" style={{ marginLeft: 6 }}>contexto</span>}
                {isCurrent && <span className="dep-pill ready" style={{ marginLeft: 6 }}>activo</span>}
                <button
                  className="hint help"
                  style={{ marginLeft: "auto", background: "transparent", border: 0 }}
                  onClick={() => navigate("agent", a.id)}
                >
                  Abrir
                </button>
              </div>
              <h4>{a.deliverable.title}</h4>
              {isFunnel ? (
                <FunnelVisual data={d} compact />
              ) : (
                <dl className="kv">
                  {a.deliverable.fields.map(f => d[f.k] ? (
                    <React.Fragment key={f.k}>
                      <dt>{f.label}</dt>
                      <dd>{d[f.k]}</dd>
                    </React.Fragment>
                  ) : null)}
                </dl>
              )}
            </div>
          );
        })}

        {agentId && AGENTS_BY_ID[agentId]?.deliverable && !state.deliverables[agentId] && (
          <div className="deliverable" style={{ borderStyle: "dashed" }}>
            <div className="deliverable-head">
              <span className="label" style={{ color: "var(--warn)" }}>{AGENTS_BY_ID[agentId].short} · pendiente</span>
            </div>
            <div className="note">
              Cuando termines la conversación con este agente, presioná <em style={{ color: "var(--accent)" }}>Finalizar y generar entregable</em> al pie del chat para que se complete acá.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Welcome({ onOpenStatus }) {
  const { state, navigate } = useStore();
  const hasKey = !!state.settings.apiKey;
  const onbDone = state.onboarding.completed;

  return (
    <div className="content">
      <div className="welcome">
        <div className="welcome-orbs" aria-hidden="true">
          <div className="welcome-orb a" />
          <div className="welcome-orb b" />
        </div>
        <div className="welcome-eyebrow">Programa Fórmula · Motor Comercial</div>
        <h1>Tu motor comercial <em>paso a paso</em>.</h1>
        <p>
          Construí tu funnel de ventas pegando lo que te dan los GPTs especializados. El sistema te muestra las etapas, carga los KPIs y te da recomendaciones para optimizar.
        </p>
        <ul>
          <li>Cargás la información de tu negocio en el onboarding. Si no sabés un dato, lo estimás.</li>
          <li>Armás tu funnel etapa por etapa pegando lo que te da ChatGPT.</li>
          <li>Una vez completo, el optimizador analiza tu funnel y te da acciones concretas para mejorar.</li>
        </ul>

        {!hasKey ? (
          <div className="env-warn">
            <div className="env-warn-head">
              <span className="dot warn" />
              <span>El modelo Fórmula todavía no está conectado en este entorno</span>
            </div>
            <p>
              La conexión se inicializa desde la configuración del entorno antes de cargar la app. Editá el archivo <code>env.js</code> del proyecto y completá el campo <code>apiKey</code>. Después recargá esta página.
            </p>
            <Button variant="ghost" size="sm" onClick={onOpenStatus}>Ver detalles</Button>
          </div>
        ) : (
          <div className="welcome-cta">
            {!onbDone && (
              <Button variant="primary" onClick={() => navigate("onboarding")}>
                {state.onboarding.step > 0 ? "Continuar onboarding →" : "Empezar onboarding →"}
              </Button>
            )}
            {onbDone && (
              <>
                <Button variant="primary" onClick={() => navigate("funnel")}>Construir Funnel →</Button>
                <Button variant="ghost" onClick={() => navigate("profile")}>Ver Perfil del Negocio</Button>
              </>
            )}
          </div>
        )}

        <div className="welcome-note">
          ⚙ Prototipo. Tu progreso queda guardado localmente en este navegador. Los GPTs especializados (mercado, oferta, canales, publicidad) se usan por separado en ChatGPT.
        </div>
      </div>
    </div>
  );
}

function App() {
  const { state, navigate, resetAll } = useStore();
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    if (!state.settings.apiKey && state.route.view !== "welcome") {
      navigate("welcome");
    }
    // eslint-disable-next-line
  }, []);

  // Close drawers when route changes
  React.useEffect(() => {
    setNavOpen(false);
  }, [state.route.view]);

  const route = state.route;

  let mainContent = null;
  let topTitle = "Fórmula";
  let topSub = "";

  if (route.view === "welcome") {
    topTitle = "Inicio";
    topSub = "Bienvenido a Fórmula";
    mainContent = <Welcome onOpenStatus={() => setStatusOpen(true)} />;
  } else if (route.view === "onboarding") {
    topTitle = "Onboarding";
    topSub = `Paso ${state.onboarding.step + 1} de 4`;
    mainContent = <Onboarding />;
  } else if (route.view === "profile") {
    topTitle = "Perfil del Negocio";
    topSub = "Consolidado";
    mainContent = <ProfileView />;
  } else if (route.view === "funnel") {
    topTitle = "Constructor de Funnel";
    topSub = "Armá tu embudo de ventas";
    mainContent = <FunnelConstructor />;
  } else {
    // Unknown route — fall back to welcome
    topTitle = "Inicio";
    topSub = "Bienvenido a Fórmula";
    mainContent = <Welcome onOpenStatus={() => setStatusOpen(true)} />;
  }

  const routeKey = route.view;

  return (
    <div className="app no-side">
      <Sidebar onOpenStatus={() => setStatusOpen(true)} className={navOpen ? "open" : ""} />
      <main className="main">
        <Topbar
          title={topTitle}
          sub={topSub}
          onToggleNav={() => setNavOpen(o => !o)}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { if (confirm("¿Reiniciar todo el negocio? Se borran datos y conversaciones.")) resetAll(); }}
              >Reset</Button>
            </>
          }
        />
        <React.Fragment key={routeKey}>{mainContent}</React.Fragment>
      </main>

      {navOpen && (
        <div className="app-scrim" onClick={() => { setNavOpen(false); }} />
      )}

      <ConnectionInfoModal open={statusOpen} onClose={() => setStatusOpen(false)} />
      <Toast
        message={toast?.message}
        kind={toast?.kind}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <StoreProvider>
    <App />
  </StoreProvider>
);
