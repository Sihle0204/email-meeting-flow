import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, streamText } from "ai";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
    return res;
  };
}

/** Streams a Responses call server-side and returns parsed JSON. */
export async function askJson<T>(instructions: string, prompt: string): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let text: string;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions: `${instructions}\nRespond with a single valid JSON object only, no markdown fences.`,
      prompt,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    text = await result.text;
  } catch (e) {
    const err = (e as { lastError?: unknown }).lastError ?? e;
    if (APICallError.isInstance(err)) {
      if (err.statusCode === 429) throw new Error("Too many requests right now — please wait a moment and try again.");
      if (err.statusCode === 402) throw new Error("AI credits are used up. Add credits in workspace billing to continue.");
      if (err.statusCode === 403) throw new Error("AI access is blocked for this workspace.");
    }
    console.error(e);
    throw new Error("The AI request failed. Please try again.");
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI returned an unexpected response.");
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new Error("The AI returned an unexpected response.");
  }
}
