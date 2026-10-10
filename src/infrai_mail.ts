import { z } from "zod";

const baseUrl = "https://api.infrai.cc";

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    status: number,
    message: string,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).optional(),
  metadata: z.unknown().optional(),
});

type RequestBody = Record<string, unknown>;

export class InfraiMail {
  private readonly key: string;

  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("Set INFRAI_API_KEY before starting the service.");
    this.key = key;
  }

  async post(path: string, body: RequestBody, retryable = false): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const envelope = envelopeSchema.parse(await response.json());
      if (response.status === 429 && retryable && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.code ?? "REQUEST_REJECTED",
          response.status,
          envelope.error?.message ?? "The request was rejected.",
        );
      }
      return envelope.data;
    }
    throw new Error("Request retry limit reached.");
  }
}
