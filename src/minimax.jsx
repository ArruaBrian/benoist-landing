/* MiniMax API wrapper
 * Endpoint: https://api.minimaxi.chat/v1/text/chatcompletion_v2 (intl)
 *           https://api.minimax.chat/v1/text/chatcompletion_v2 (cn)
 * Format: OpenAI compatible
 * Streams via SSE.
 */

const MINIMAX_ENDPOINTS = {
  intl: "https://api.minimaxi.chat/v1/text/chatcompletion_v2",
  cn: "https://api.minimax.chat/v1/text/chatcompletion_v2",
};

async function minimaxChat({
  apiKey,
  model = "MiniMax-M2.7-highspeed",
  region = "intl",
  messages,
  temperature = 0.7,
  maxTokens = 2048,
  onDelta,
  signal,
}) {
  if (!apiKey) throw new Error("El modelo Fórmula no está configurado en este entorno.");
  const url = MINIMAX_ENDPOINTS[region] || MINIMAX_ENDPOINTS.intl;

  const useStream = typeof onDelta === "function";

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: useStream,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const txt = await res.text();
      detail = txt;
    } catch (e) {}
    throw new Error(`Modelo Fórmula ${res.status}: ${detail.slice(0, 300) || res.statusText}`);
  }

  if (!useStream) {
    const json = await res.json();
    // OpenAI-compatible
    return json?.choices?.[0]?.message?.content ?? "";
  }

  // Stream SSE
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE lines
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        return full;
      }
      try {
        const evt = JSON.parse(payload);
        // OpenAI-compatible delta
        const delta = evt?.choices?.[0]?.delta?.content
          ?? evt?.choices?.[0]?.message?.content
          ?? "";
        if (delta) {
          full += delta;
          onDelta(delta, full);
        }
        // Some MiniMax responses signal completion via finish_reason
        const finish = evt?.choices?.[0]?.finish_reason;
        if (finish && finish !== "null") {
          // continue reading; some servers send extra usage chunk
        }
      } catch (e) {
        // ignore malformed line
      }
    }
  }
  return full;
}

window.minimaxChat = minimaxChat;
