/* Global store: business profile, conversations, deliverables.
 * Persists to localStorage. Connection settings come from window.__FORMULA_ENV
 * (set in index.html) and are NOT persisted nor user-editable from the UI.
 */

const STORAGE_KEY = "formula.v1";

function readEnv() {
  const env = (typeof window !== "undefined" && window.__FORMULA_ENV) || {};
  return {
    apiKey: env.apiKey || "",
    model: env.model || "MiniMax-M2.7-highspeed",
    region: env.region || "intl",
    configured: !!env.apiKey,
  };
}

const DEFAULT_STATE = {
  onboarding: {
    step: 0,
    completed: false,
  },
  business: {
    nombre: "", rubro: "", descripcion: "", antiguedad: "", empleados: "",
    ubicacion: "", instagram: "", sitioWeb: "", facturacionAprox: "",
    productos: "", productoEstrella: "", productoEstrellaRazon: "",
    facturacion: "", costosFijos: "", costosVariables: "", ticketPromedio: "",
    capitalDisponible: "", ventasMensuales: "", tiempoEspera: "",
    clienteIdeal: "", ubicacionCliente: "", nivelEconomico: "",
    procesoCompra: "", medios: "",
  },
  estimates: {},
  conversations: {},
  deliverables: {},
  route: { view: "welcome", agentId: null },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...structuredClone(DEFAULT_STATE), settings: readEnv() };
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      business: { ...DEFAULT_STATE.business, ...(parsed.business || {}) },
      onboarding: { ...DEFAULT_STATE.onboarding, ...(parsed.onboarding || {}) },
      estimates: parsed.estimates || {},
      conversations: parsed.conversations || {},
      deliverables: parsed.deliverables || {},
      route: parsed.route || { view: "welcome", agentId: null },
      // settings always come from env, never persisted
      settings: readEnv(),
    };
  } catch (e) {
    console.warn("Failed to load state", e);
    return { ...structuredClone(DEFAULT_STATE), settings: readEnv() };
  }
}

function saveState(state) {
  try {
    // Strip settings before persisting
    const { settings, ...persistable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch (e) {
    console.warn("Failed to save state", e);
  }
}

const StoreContext = React.createContext(null);

function StoreProvider({ children }) {
  const [state, setState] = React.useState(loadState);

  React.useEffect(() => { saveState(state); }, [state]);

  const api = React.useMemo(() => ({
    state,
    setState,
    setBusinessField(key, value, isEstimate) {
      setState(s => ({
        ...s,
        business: { ...s.business, [key]: value },
        estimates: isEstimate === undefined
          ? s.estimates
          : { ...s.estimates, [key]: !!isEstimate },
      }));
    },
    markEstimate(key, isEstimate) {
      setState(s => ({ ...s, estimates: { ...s.estimates, [key]: !!isEstimate } }));
    },
    setOnboardingStep(step) {
      setState(s => ({ ...s, onboarding: { ...s.onboarding, step } }));
    },
    completeOnboarding() {
      setState(s => ({ ...s, onboarding: { ...s.onboarding, completed: true } }));
    },
    navigate(view, agentId = null) {
      setState(s => ({ ...s, route: { view, agentId } }));
    },
    appendMessage(agentId, msg) {
      setState(s => ({
        ...s,
        conversations: {
          ...s.conversations,
          [agentId]: [...(s.conversations[agentId] || []), msg],
        },
      }));
    },
    updateLastMessage(agentId, patch) {
      setState(s => {
        const conv = s.conversations[agentId] || [];
        if (!conv.length) return s;
        const next = conv.slice();
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return { ...s, conversations: { ...s.conversations, [agentId]: next } };
      });
    },
    clearConversation(agentId) {
      setState(s => {
        const c = { ...s.conversations };
        delete c[agentId];
        return { ...s, conversations: c };
      });
    },
    setDeliverable(agentId, data) {
      setState(s => ({
        ...s,
        deliverables: { ...s.deliverables, [agentId]: data },
      }));
    },
    clearDeliverable(agentId) {
      setState(s => {
        const d = { ...s.deliverables };
        delete d[agentId];
        return { ...s, deliverables: d };
      });
    },
    resetAll() {
      const blank = structuredClone(DEFAULT_STATE);
      blank.settings = readEnv();
      localStorage.removeItem("formula.celebrationSeen");
      setState(blank);
    },
  }), [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

const useStore = () => React.useContext(StoreContext);

window.StoreProvider = StoreProvider;
window.useStore = useStore;
