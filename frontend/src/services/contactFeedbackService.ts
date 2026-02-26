const rawContactServiceBase = (
  import.meta.env.VITE_CONTACT_SERVICE_BASE_URL ?? ""
).trim();
const contactServiceBase = rawContactServiceBase.endsWith("/")
  ? rawContactServiceBase.slice(0, -1)
  : rawContactServiceBase;

const supportEmail =
  (import.meta.env.VITE_CONTACT_SUPPORT_EMAIL ?? "").trim() ||
  "kontakt@group-trip-planner.local";

function contactPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${contactServiceBase}${normalized}`;
}

type ApiResponse = {
  ok?: boolean;
  error?: string;
};

type FeedbackPayload = {
  rating: number;
  actorId?: string;
  displayName?: string;
};

type ContactPayload = {
  message: string;
  actorId?: string;
  displayName?: string;
  replyTo?: string;
};

async function postJson(path: string, payload: object): Promise<void> {
  const response = await fetch(contactPath(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let details = `Anfrage fehlgeschlagen: ${response.status}`;
    try {
      const body = (await response.json()) as ApiResponse;
      if (body?.error) {
        details = body.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(details);
  }
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  await postJson("/mail/feedback", payload);
}

export async function sendContactMessage(
  payload: ContactPayload,
): Promise<void> {
  await postJson("/mail/contact", payload);
}

export function getSupportEmail(): string {
  return supportEmail;
}
