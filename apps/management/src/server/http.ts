export function json(data: unknown, status = 200, headers?: Headers): Response {
  const h = headers ?? new Headers();
  if (!h.has("content-type")) {
    h.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function jsonNotFound(): Response {
  return json({ error: "not_found" }, 404);
}
