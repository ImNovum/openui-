// Chat endpoint. The browser calls /api/chat (see page.tsx) and this handler
// calls DeepSeek's OpenAI-compatible Chat Completions API directly with
// stream: true, then pipes the stream straight back to the browser. page.tsx
// parses it with openAIReadableStreamAdapter(), which expects the OpenAI SDK's
// Stream.toReadableStream() NDJSON shape (one JSON ChatCompletionChunk per
// line) — exactly what we return here.
//
// No n8n proxy in the middle for chat. Configure via env vars:
//   DEEPSEEK_API_KEY   (required)
//   DEEPSEEK_BASE_URL  (default https://api.deepseek.com)
//   DEEPSEEK_MODEL     (default deepseek-chat)

import librarySpec from "@/generated/spec.json";
import { promptOptions } from "@/lib/prompt-options";
import { generateSystemPrompt } from "@openuidev/lang-core";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

// Instructs the model to emit OpenUI Lang so the components render.
const SYSTEM_PROMPT = generateSystemPrompt({
  library: librarySpec,
  promptOptions,
});

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return errorResponse(
      500,
      "DEEPSEEK_API_KEY is not configured. Add it to the Vercel project environment variables and redeploy.",
    );
  }

  let payload: { messages?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  const messages = payload.messages;
  if (!Array.isArray(messages)) {
    return errorResponse(400, "`messages` must be an array.");
  }

  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
  });

  try {
    const stream = await client.chat.completions.create(
      {
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      },
      { signal: req.signal },
    );

    // toReadableStream() emits one JSON ChatCompletionChunk per line (NDJSON),
    // matching what openAIReadableStreamAdapter() parses on the client.
    return new Response(
      stream.toReadableStream() as unknown as ReadableStream<Uint8Array>,
      {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
        },
      },
    );
  } catch (err) {
    console.error(err);
    const reason = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(502, `DeepSeek request failed: ${reason}`);
  }
}
