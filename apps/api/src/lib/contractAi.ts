// AI-powered contract drafter.
// Uses Cloudflare Workers AI (Llama 3.3 70B fp8-fast) to convert a barter
// negotiation thread into a plain-language ContractTerms object that both
// parties can edit and sign.
//
// We force JSON output via a strict system prompt + a fallback parser. The
// LLM occasionally wraps JSON in prose; the parser extracts the first {...}
// block. If parsing fails entirely, we return a reasonable scaffold so the
// UI can show editable fields.

import type { Env } from "../env.js";

export interface DraftContext {
  listingTitle: string;
  listingDescription: string;
  listerName: string;
  listerWants: string;
  requesterName: string;
  requesterOffering: string;
  messages: { sender: "lister" | "requester"; body: string }[];
}

export interface AiDraftTerms {
  whatPartyAGives: string;
  whatPartyBGives: string;
  meetupLocation?: string;
  meetupAt?: string;
  conditions?: string;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `You are a contract-writing assistant for a peer-to-peer barter marketplace.

Given a listing and a negotiation thread, draft a SHORT, fair, plain-language barter agreement between two private parties.

Output ONLY a valid JSON object — no markdown, no backticks, no commentary.
The object must have these keys:
- "whatPartyAGives": one or two sentences. Party A is the lister.
- "whatPartyBGives": one or two sentences. Party B is the requester.
- "meetupLocation": one short sentence with where/how they'll meet, OR an empty string if not discussed.
- "meetupAt": ISO 8601 date-time, OR an empty string if not specifically agreed.
- "conditions": one or two short sentences of mutually agreed conditions
  (e.g. "Item is sold as-is", "Service to be completed by date X").

Rules:
- Be specific. Reference quantities, hours, items by name as discussed.
- Plain English. No legal boilerplate.
- The platform (unscrewed.lol) is NEVER a party to this contract.
- If a field has not been clearly discussed, write a sensible neutral default.`;

export async function draftContractTerms(
  env: Env,
  ctx: DraftContext
): Promise<AiDraftTerms> {
  const transcript = ctx.messages
    .map((m) => `${m.sender === "lister" ? "A (lister)" : "B (requester)"}: ${m.body}`)
    .join("\n");

  const userPrompt = `Listing title: ${ctx.listingTitle}
Description: ${ctx.listingDescription}

Party A (lister): ${ctx.listerName}
What A wants in trade: ${ctx.listerWants}

Party B (requester): ${ctx.requesterName}
What B is offering: ${ctx.requesterOffering}

Negotiation transcript:
${transcript || "(no messages yet)"}

Draft the contract terms JSON now.`;

  let raw = "";
  try {
    const out: any = await env.AI.run(MODEL as any, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.4,
    });
    raw = coerceToString(out);
  } catch (e) {
    console.warn("[contractAi] AI run failed", e);
  }

  return parseOrFallback(raw, ctx);
}

// Workers AI response shapes vary by model and runtime version. Coerce
// anything reasonable into a string we can scan for a JSON block.
function coerceToString(out: any): string {
  if (out == null) return "";
  if (typeof out === "string") return out;
  // Common chat shape: { response: "..." }
  if (typeof out.response === "string") return out.response;
  // Some models return { response: [{ text: "..." }] }
  if (Array.isArray(out.response)) {
    return out.response
      .map((p: any) =>
        typeof p === "string" ? p : (p?.text ?? p?.content ?? "")
      )
      .join("");
  }
  // OpenAI-style chat completion
  if (Array.isArray(out.choices)) {
    return out.choices
      .map(
        (ch: any) => ch?.message?.content ?? ch?.delta?.content ?? ch?.text ?? ""
      )
      .join("");
  }
  // Llama tool-call shape: { response: { ... } }
  if (out.response && typeof out.response === "object") {
    if (typeof out.response.content === "string") return out.response.content;
    if (typeof out.response.text === "string") return out.response.text;
    return JSON.stringify(out.response);
  }
  // Fallback: stringify the whole envelope so parseOrFallback can still try
  try {
    return JSON.stringify(out);
  } catch {
    return "";
  }
}

function parseOrFallback(raw: string, ctx: DraftContext): AiDraftTerms {
  // Defensive: even if some upstream slips a non-string through, don't crash.
  if (typeof raw !== "string") raw = String(raw ?? "");
  if (raw) {
    // Extract the first balanced {...} JSON object the model returned.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const obj = JSON.parse(raw.slice(start, end + 1));
        const result: AiDraftTerms = {
          whatPartyAGives: stringField(obj.whatPartyAGives, ctx.listingTitle),
          whatPartyBGives: stringField(obj.whatPartyBGives, ctx.requesterOffering),
          meetupLocation: optionalString(obj.meetupLocation),
          meetupAt: optionalString(obj.meetupAt),
          conditions: optionalString(obj.conditions),
        };
        return result;
      } catch (e) {
        console.warn("[contractAi] JSON parse failed:", e);
      }
    }
  }
  // Fallback: scaffold from raw inputs so the UI still gets editable fields.
  return {
    whatPartyAGives: ctx.listingTitle
      ? `${ctx.listerName} provides: ${ctx.listingTitle}`
      : "(describe what the lister gives)",
    whatPartyBGives: ctx.requesterOffering
      ? `${ctx.requesterName} provides: ${ctx.requesterOffering}`
      : "(describe what the requester gives)",
    meetupLocation: "",
    meetupAt: "",
    conditions:
      "Item or service is provided as-is unless otherwise agreed. Both parties confirm they have the right to trade what they are offering.",
  };
}

function stringField(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}
function optionalString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  return "";
}
