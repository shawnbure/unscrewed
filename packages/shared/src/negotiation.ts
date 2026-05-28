import { z } from "zod";

export const NegotiationStartSchema = z.object({
  listingId: z.string().uuid(),
  openingMessage: z.string().min(2).max(2000),
  // What the requester is offering in trade (text for now; later: link to one of their listings)
  offering: z.string().min(2).max(1000),
});
export type NegotiationStartInput = z.infer<typeof NegotiationStartSchema>;

export const NegotiationMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type NegotiationMessageInput = z.infer<typeof NegotiationMessageSchema>;

// Realtime envelope sent over the Durable Object websocket.
export const NegotiationWsEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    body: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("draft_contract"),
    terms: z.string().min(10).max(8000),
    meetupLocation: z.string().max(500).optional(),
    meetupAt: z.string().datetime().optional(),
  }),
  z.object({
    type: z.literal("sign_contract"),
    contractId: z.string().uuid(),
    typedName: z.string().min(2).max(120),
  }),
  z.object({ type: z.literal("ping") }),
]);
export type NegotiationWsEvent = z.infer<typeof NegotiationWsEvent>;
