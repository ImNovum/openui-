// Server-side proxy to the n8n webhook. The browser calls /api/chat (see
// page.tsx) and this handler forwards the request to n8n, then streams the
// upstream response back unchanged so page.tsx keeps parsing the same OpenAI
// NDJSON chunk shape via openAIReadableStreamAdapter().

const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!WEBHOOK_URL) {
    return errorResponse(500, "N8N_WEBHOOK_URL is not configured on the server.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        Accept: "application/x-ndjson",
      },
      body: await req.text(),
      signal: req.signal, // propagate browser aborts to the upstream request
    });
  } catch (err) {
    console.error(err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(502, `Failed to reach the n8n webhook: ${reason}`);
  }

  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 500);
    console.error(`n8n webhook responded ${upstream.status}: ${detail}`);
    return errorResponse(
      502,
      `n8n webhook responded with ${upstream.status}${detail ? `: ${detail}` : ""}`,
    );
  }

  // Keep the exact Content-Type and chunk shape page.tsx already parses.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
