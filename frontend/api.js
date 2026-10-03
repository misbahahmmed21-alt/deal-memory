const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof data === "object" && data && "detail" in data ? data.detail : data;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }

  return data;
}

export const api = {
  getMemories: () => request("/memories"),
  processMeeting: ({ transcript, source, date }) =>
    request("/process", {
      method: "POST",
      body: JSON.stringify({ transcript, source, date })
    }),
  ask: (question) =>
    request("/ask", {
      method: "POST",
      body: JSON.stringify({ question })
    })
};
