const localhostHosts = new Set(["localhost", "127.0.0.1"]);

function resolveContactBase(rawBase: string): string {
  const trimmed = rawBase.trim();
  if (!trimmed) return "";
  const normalized = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    const candidate = new URL(normalized, window.location.origin);
    const envHostIsLocal = localhostHosts.has(candidate.hostname);
    const windowHostIsLocal = localhostHosts.has(window.location.hostname);
    const localHostMismatch =
      envHostIsLocal &&
      windowHostIsLocal &&
      candidate.hostname !== window.location.hostname;

    if ((envHostIsLocal && !windowHostIsLocal) || localHostMismatch) {
      return "";
    }
  } catch {
    return "";
  }

  return normalized;
}

const rawContactServiceBase = (
  import.meta.env.VITE_CONTACT_SERVICE_BASE_URL ?? ""
).trim();
const contactServiceBase = resolveContactBase(rawContactServiceBase);

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
  message?: string;
  actorId?: string;
  displayName?: string;
};

type ContactPayload = {
  message: string;
  actorId?: string;
  displayName?: string;
  replyTo?: string;
};

type SupportEmailResponse = {
  email?: string;
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

export async function getSupportEmail(): Promise<string> {
  const candidates = ["/mail/contact", "/contact"];

  for (const path of candidates) {
    const response = await fetch(contactPath(path), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        continue;
      }
      throw new Error(
        `Kontakt konnte nicht geladen werden: ${response.status}`,
      );
    }

    const body = (await response.json()) as SupportEmailResponse;
    const email = (body?.email ?? "").trim();
    if (email) {
      return email;
    }

    throw new Error("Keine Kontakt-E-Mail verfügbar");
  }

  throw new Error("Kontakt-Endpunkt nicht gefunden (404)");
}
