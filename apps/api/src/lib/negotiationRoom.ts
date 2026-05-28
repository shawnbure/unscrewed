// Durable Object: one instance per negotiation thread.
// Holds the live WebSocket fan-out + the current contract draft.
// Persistent messages live in D1; the DO is only a realtime relay.

import type { Env } from "../env.js";

interface DraftState {
  terms?: string;
  meetupLocation?: string;
  meetupAt?: string;
  updatedAt?: number;
}

export class NegotiationRoom {
  state: DurableObjectState;
  env: Env;
  sockets = new Set<WebSocket>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/broadcast") {
      const payload = await req.text();
      this.broadcast(payload);
      return new Response("ok");
    }
    // WebSocket upgrade
    if (req.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      this.accept(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("not found", { status: 404 });
  }

  accept(ws: WebSocket) {
    ws.accept();
    this.sockets.add(ws);
    ws.addEventListener("close", () => this.sockets.delete(ws));
    ws.addEventListener("error", () => this.sockets.delete(ws));
    ws.addEventListener("message", async (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (msg.type === "draft_contract") {
          const draft: DraftState = {
            terms: msg.terms,
            meetupLocation: msg.meetupLocation,
            meetupAt: msg.meetupAt,
            updatedAt: Date.now(),
          };
          await this.state.storage.put("draft", draft);
          this.broadcast(
            JSON.stringify({ type: "draft_updated", draft, at: Date.now() })
          );
        }
      } catch (e) {
        ws.send(
          JSON.stringify({ type: "error", message: (e as Error).message })
        );
      }
    });
    // Send current draft snapshot on connect
    this.state.storage.get<DraftState>("draft").then((draft) => {
      if (draft) ws.send(JSON.stringify({ type: "draft_updated", draft }));
    });
  }

  broadcast(payload: string) {
    for (const ws of this.sockets) {
      try {
        ws.send(payload);
      } catch {
        this.sockets.delete(ws);
      }
    }
  }
}
