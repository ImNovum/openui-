// Chat endpoint. The browser calls /api/chat (see page.tsx). This handler
// forwards the request to the n8n brain (N8N_WEBHOOK_URL), which runs the
// Osiris assistant and returns an OpenAI-format NDJSON stream, then pipes that
// stream straight back to the browser. page.tsx parses it with
// openAIReadableStreamAdapter(), which expects one JSON ChatCompletionChunk per line.
//
// Configure via env vars:
//   N8N_WEBHOOK_URL   (required, e.g. https://host/webhook/Chat)

export const runtime = "nodejs";
export const maxDuration = 60;

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!N8N_WEBHOOK_URL) {
    return errorResponse(500, "N8N_WEBHOOK_URL is not configured. Add it to the Vercel project environment variables and redeploy.");
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return errorResponse(400, "Request body could not be read.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: req.signal,
    });
  } catch (err) {
    console.error(err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(502, `n8n brain request failed: ${reason}`);
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || upstream.statusText, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
