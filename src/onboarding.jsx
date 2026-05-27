/* 4-step onboarding wizard.
 * Step 1: Datos del negocio
 * Step 2: Productos y producto estrella
 * Step 3: Datos financieros
 * Step 4: Investigación de mercado
 *
 * Every field supports "marcar como estimado" and an AI help bubble
 * that asks the Agente Fórmula to explain that field.
 */

function HelpBubble({ open, anchor, content, loading, onClose }) {
  if (!open || !anchor) return null;
  const rect = anchor.getBoundingClientRect();
  const style = {
    top: rect.bottom + 6,
    left: Math.min(rect.left, window.innerWidth - 340),
  };
  return (
    <div className="help-pop" style={style}>
      {loading ? (
        <div style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          Pensando…
        </div>
      ) : (
        <div>{formatRich(content)}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

function FieldWithHelp({ fieldKey, label, hint, helpPrompt, children }) {
  const { state, markEstimate } = useStore();
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [helpAnchor, setHelpAnchor] = React.useState(null);
  const [helpText, setHelpText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const btnRef = React.useRef(null);

  async function openHelp() {
    setHelpAnchor(btnRef.current);
    setHelpOpen(true);
    if (helpText) return;
    setLoading(true);
    try {
      const out = await minimaxChat({
        apiKey: state.settings.apiKey,
        model: state.settings.model,
        region: state.settings.region,
        messages: [
          { role: "system", content: "Sos el Agente Fórmula. Explicá el siguiente concepto en 2 párrafos cortos, cálidos y simples, en español. NO uses jerga. Cerrá con una pregunta que ayude al emprendedor a estimar el dato si no lo conoce." },
          { role: "user", content: helpPrompt },
        ],
        maxTokens: 350,
      });
      setHelpText(out);
    } catch (e) {
      setHelpText("No pude consultar al agente. " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Field
        label={label}
        hint={hint}
        isEstimate={state.estimates[fieldKey]}
        onToggleEstimate={(v) => markEstimate(fieldKey, v)}
        onHelp={undefined}
      >
        {children}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <button
            ref={btnRef}
            type="button"
            className="hint help"
            onClick={openHelp}
            style={{ background: "transparent", border: 0, padding: 0 }}
          >
            ? Preguntale al Agente Fórmula
          </button>
        </div>
      </Field>
      <HelpBubble
        open={helpOpen}
        anchor={helpAnchor}
        content={helpText}
        loading={loading}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}

function StepShell({ step, total, eyebrow, title, desc, children, onPrev, onNext, onFinish, nextLabel = "Siguiente", canNext = true, isLast }) {
  const { navigate } = useStore();
  return (
    <div className="content">
      <div className="onboarding">
        <div className="step-progress">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={"step-pip " + (i < step ? "done" : i === step ? "active" : "")} />
          ))}
        </div>
        <div className="step-header">
          <div className="step-eyebrow">{eyebrow}</div>
          <h1 className="step-title">{title}</h1>
          <p className="step-desc">{desc}</p>
        </div>
        {children}
        <div className="step-footer">
          {step > 0 && <Button variant="ghost" onClick={onPrev}>← Anterior</Button>}
          <div className="spacer" />
          <Button variant="ghost" onClick={() => navigate("welcome")}>Guardar y salir</Button>
          {!isLast ? (
            <Button variant="primary" onClick={onNext} disabled={!canNext}>{nextLabel}</Button>
          ) : (
            <Button variant="primary" onClick={onFinish}>Finalizar onboarding ✓</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardingStep1() {
  const { state, setBusinessField } = useStore();
  const b = state.business;
  return (
    <>
      <div className="field-grid">
        <FieldWithHelp fieldKey="nombre" label="Nombre del negocio" helpPrompt="¿Qué tiene que tener el nombre de un negocio para usarlo en una plataforma de marketing? ¿Sirve un nombre informal o de fantasía?">
          <TextInput value={b.nombre} onChange={(v) => setBusinessField("nombre", v)} placeholder="Ej: Panadería Don Luis" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="rubro" label="Rubro" helpPrompt="¿Qué se considera rubro de un negocio? Dame 3 ejemplos de cómo definirlo en una frase.">
          <TextInput value={b.rubro} onChange={(v) => setBusinessField("rubro", v)} placeholder="Ej: Gastronomía / Panadería artesanal" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="descripcion" label="Descripción breve" helpPrompt="¿Cómo describo en 2 frases qué hace mi negocio, para qué cliente, y qué lo hace distinto?">
          <TextArea value={b.descripcion} onChange={(v) => setBusinessField("descripcion", v)} placeholder="¿Qué vendés, a quién, y qué te hace distinto?" rows={3} />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="antiguedad" label="Antigüedad" helpPrompt="¿Por qué importa la antigüedad del negocio para planificar marketing y publicidad?">
          <TextInput value={b.antiguedad} onChange={(v) => setBusinessField("antiguedad", v)} placeholder="Ej: 2 años" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="empleados" label="Empleados" helpPrompt="¿Por qué se pregunta cantidad de empleados? ¿Incluyo familiares que ayudan? ¿Yo me cuento?">
          <TextInput value={b.empleados} onChange={(v) => setBusinessField("empleados", v)} placeholder="Ej: 3 (yo + 2)" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="ubicacion" label="Ubicación principal" helpPrompt="¿Qué nivel de detalle hace falta en la ubicación? ¿Ciudad, barrio, país?">
          <TextInput value={b.ubicacion} onChange={(v) => setBusinessField("ubicacion", v)} placeholder="Ciudad, país (o múltiples)" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="facturacionAprox" label="Facturación aproximada (USD/mes)" helpPrompt="¿Qué cuenta como facturación mensual? ¿Es bruto o neto? Si no sé el número exacto, ¿cómo lo estimo?">
          <TextInput value={b.facturacionAprox} onChange={(v) => setBusinessField("facturacionAprox", v)} placeholder="USD/mes (podés estimar)" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="instagram" label="Instagram (opcional)" helpPrompt="¿Es importante tener Instagram para el agente de publicidad? ¿Qué pasa si no tengo?">
          <TextInput value={b.instagram} onChange={(v) => setBusinessField("instagram", v)} placeholder="@usuario" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="sitioWeb" label="Sitio web (opcional)" helpPrompt="¿Necesito un sitio web propio o alcanza con redes y WhatsApp?">
          <TextInput value={b.sitioWeb} onChange={(v) => setBusinessField("sitioWeb", v)} placeholder="https://..." />
        </FieldWithHelp>
      </div>
    </>
  );
}

function OnboardingStep2() {
  const { state, setBusinessField } = useStore();
  const b = state.business;
  return (
    <>
      <div className="field-grid">
        <FieldWithHelp fieldKey="productos" label="Productos / servicios que vendés actualmente" helpPrompt="¿Cómo armo la lista de productos? ¿Conviene listar todos, solo los principales, o agruparlos por categoría?">
          <TextArea value={b.productos} onChange={(v) => setBusinessField("productos", v)} placeholder="Listalos separados por coma o saltos de línea" rows={4} />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="productoEstrella" label="Producto estrella (uno solo)" helpPrompt="¿Qué es un producto estrella? ¿Por qué tengo que enfocarme en UNO en lugar de vender muchas cosas a la vez?">
          <TextInput value={b.productoEstrella} onChange={(v) => setBusinessField("productoEstrella", v)} placeholder="El que más rentabilidad / volumen / recompra tiene" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="productoEstrellaRazon" label="¿Por qué ése es tu producto estrella?" helpPrompt="¿Qué criterios uso para elegir el producto estrella? margen, recompra, demanda, facilidad de venta…">
          <TextArea value={b.productoEstrellaRazon} onChange={(v) => setBusinessField("productoEstrellaRazon", v)} placeholder="Margen, recompra, demanda, lo que mejor te sale..." rows={3} />
        </FieldWithHelp>
      </div>

      <div className="tip-card">
        <div className="tip-label">Tip de Fórmula</div>
        <div className="tip-body">
          Producto estrella = <strong>QUÉ</strong> vendés.<br />
          Oferta = <strong>CÓMO</strong> lo vendés.<br />
          La oferta la construimos después con el Agente de Oferta. Acá solo necesitamos definir bien el producto.
        </div>
      </div>
    </>
  );
}

function OnboardingStep3() {
  const { state, setBusinessField } = useStore();
  const b = state.business;
  return (
    <>
      <div className="estim-banner">
        <div>Si no conocés un número exacto, <strong style={{ color: "var(--fg)" }}>estimalo</strong> y marcá la casilla "Estimado". Toda la cadena de agentes va a saber que ese dato es aproximado y va a recomendar con prudencia.</div>
      </div>
      <div className="field-grid">
        <FieldWithHelp fieldKey="facturacion" label="Facturación mensual (USD)" helpPrompt="¿Qué cuenta como facturación? ¿Promedio o el último mes? ¿Bruto o neto?">
          <TextInput value={b.facturacion} onChange={(v) => setBusinessField("facturacion", v)} placeholder="Ej: 8000" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="costosFijos" label="Costos fijos mensuales (USD)" helpPrompt="¿Qué entra en costos fijos? Dame una lista típica y cómo estimarlos si nunca los anoté.">
          <TextInput value={b.costosFijos} onChange={(v) => setBusinessField("costosFijos", v)} placeholder="Alquiler, sueldos, servicios..." />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="costosVariables" label="Costos variables (USD)" helpPrompt="¿Qué se considera costo variable? ¿Lo expreso por unidad, por mes, o como porcentaje?">
          <TextInput value={b.costosVariables} onChange={(v) => setBusinessField("costosVariables", v)} placeholder="Por unidad o por mes" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="ticketPromedio" label="Ticket promedio (USD)" helpPrompt="¿Cómo calculo el ticket promedio si no lo tengo medido?">
          <TextInput value={b.ticketPromedio} onChange={(v) => setBusinessField("ticketPromedio", v)} placeholder="Promedio por venta" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="capitalDisponible" label="Capital disponible para invertir (USD)" helpPrompt="¿Qué cuenta como capital disponible? ¿Es lo que tengo libre de gastos o también préstamos posibles?">
          <TextInput value={b.capitalDisponible} onChange={(v) => setBusinessField("capitalDisponible", v)} placeholder="Para publicidad / equipamiento / crecimiento" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="ventasMensuales" label="Ventas mensuales (cantidad)" helpPrompt="¿Cuento solo las que cerré o también cotizaciones? ¿Tickets o clientes únicos?">
          <TextInput value={b.ventasMensuales} onChange={(v) => setBusinessField("ventasMensuales", v)} placeholder="Cantidad de operaciones" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="tiempoEspera" label="Tiempo de espera aceptable para ver resultados" helpPrompt="¿Por qué se pregunta esto? ¿Cómo influye en la estrategia que el sistema recomiende crecimiento rápido o lento?">
          <TextInput value={b.tiempoEspera} onChange={(v) => setBusinessField("tiempoEspera", v)} placeholder="1 mes / 3 meses / 6 meses..." />
        </FieldWithHelp>
      </div>
    </>
  );
}

function OnboardingStep4() {
  const { state, setBusinessField } = useStore();
  const b = state.business;
  return (
    <>
      <div className="field-grid">
        <FieldWithHelp fieldKey="clienteIdeal" label="¿Quién es tu cliente ideal?" helpPrompt="¿Cómo describo a un cliente ideal sin caer en estereotipos? ¿Qué datos importan: edad, profesión, situación, intereses?">
          <TextArea value={b.clienteIdeal} onChange={(v) => setBusinessField("clienteIdeal", v)} placeholder="Edad, situación, qué problema le resolvés..." rows={3} />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="ubicacionCliente" label="¿Dónde vive / está tu cliente?" helpPrompt="¿Conviene un radio específico o pensarlo a nivel ciudad/país? ¿Y si vendo online?">
          <TextInput value={b.ubicacionCliente} onChange={(v) => setBusinessField("ubicacionCliente", v)} placeholder="Ciudad, barrio, país, radio..." />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="nivelEconomico" label="Nivel económico aproximado" helpPrompt="¿Cómo identifico el nivel económico del cliente sin caer en suposiciones? ¿Por precio? ¿Por barrio?">
          <TextInput value={b.nivelEconomico} onChange={(v) => setBusinessField("nivelEconomico", v)} placeholder="Bajo / medio / medio-alto / alto" />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="procesoCompra" label="¿Qué analiza antes de comprarte?" helpPrompt="¿Qué quiere decir el proceso de compra del cliente? ¿Es lo mismo para un producto barato que para uno caro?">
          <TextArea value={b.procesoCompra} onChange={(v) => setBusinessField("procesoCompra", v)} placeholder="Precio, recomendación, reseñas, tiempo de decisión..." rows={3} />
        </FieldWithHelp>

        <FieldWithHelp fieldKey="medios" label="¿Dónde consume publicidad tu cliente?" helpPrompt="¿Por qué importa saber dónde consume publicidad? ¿Cómo lo averiguo si no tengo data?">
          <TextArea value={b.medios} onChange={(v) => setBusinessField("medios", v)} placeholder="Instagram, TikTok, radio, diarios locales, WhatsApp..." rows={3} />
        </FieldWithHelp>
      </div>
    </>
  );
}

function Onboarding() {
  const { state, setOnboardingStep, completeOnboarding, navigate } = useStore();
  const step = state.onboarding.step;
  const TOTAL = 4;

  const titles = [
    { eyebrow: `Paso 1 de ${TOTAL} · Datos del negocio`, title: "Empecemos por lo básico", desc: "Quién sos, qué hacés y a qué escala. Si no tenés un dato exacto, no pasa nada: marcá la casilla 'Estimado' y seguimos." },
    { eyebrow: `Paso 2 de ${TOTAL} · Productos`, title: "Tu producto estrella", desc: "La mayoría de los emprendedores vende demasiadas cosas a la vez. Acá te ayudamos a elegir UN producto ancla en el que enfocar todo." },
    { eyebrow: `Paso 3 de ${TOTAL} · Finanzas`, title: "Hablemos de plata", desc: "Sin números reales no podemos armar estrategia. Cargá lo que tengas: la IA después detecta huecos y costos olvidados." },
    { eyebrow: `Paso 4 de ${TOTAL} · Mercado`, title: "Conocé a tu cliente", desc: "Quién te compra, dónde está, qué consume. Si no sabés bien, los agentes te ayudan a investigar después." },
  ];

  const t = titles[step];

  return (
    <StepShell
      step={step}
      total={TOTAL}
      eyebrow={t.eyebrow}
      title={t.title}
      desc={t.desc}
      onPrev={() => setOnboardingStep(Math.max(0, step - 1))}
      onNext={() => setOnboardingStep(Math.min(TOTAL - 1, step + 1))}
      onFinish={() => { completeOnboarding(); navigate("profile"); }}
      isLast={step === TOTAL - 1}
    >
      {step === 0 && <OnboardingStep1 />}
      {step === 1 && <OnboardingStep2 />}
      {step === 2 && <OnboardingStep3 />}
      {step === 3 && <OnboardingStep4 />}
    </StepShell>
  );
}

window.Onboarding = Onboarding;
