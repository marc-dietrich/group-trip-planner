import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocalActor } from "./lib/actor";
import {
  getExistingSession,
  getUserDisplayName,
  persistJwt,
  supabaseEnabled,
  supabase,
} from "./lib/supabase";
import "./App.css";

type HealthCheck = {
  status: string;
  message: string;
};

type GroupCreateResult = {
  groupId: string;
  name: string;
  inviteLink: string;
  role: string;
  actorId: string;
  displayName: string;
};

type GroupMembership = {
  groupId: string;
  name: string;
  role: string;
  inviteLink: string;
};

type ClaimResponse = {
  actorId: string;
  userId: string;
  claimedAt: string;
  updatedMemberships: number;
};

type Identity =
  | { kind: "actor"; actorId: string; displayName: string }
  | { kind: "user"; userId: string; displayName: string; accessToken: string };

function App() {
  const [actor, setDisplayName] = useLocalActor("Traveler");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null);
  const [groupName, setGroupName] = useState("Wochenend-Trip");
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupCreateResult | null>(null);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const identity = useMemo<Identity>(() => {
    if (session?.user) {
      return {
        kind: "user",
        userId: session.user.id,
        displayName: getUserDisplayName(session.user) || actor.displayName,
        accessToken: session.access_token,
      };
    }

    return {
      kind: "actor",
      actorId: actor.actorId,
      displayName: actor.displayName,
    };
  }, [actor.actorId, actor.displayName, session]);

  useEffect(() => {
    let isActive = true;

    getExistingSession()
      .then((existing) => {
        if (!isActive) return;
        setSession(existing);
        setAuthLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setAuthLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isActive) return;
      setSession(newSession);
      persistJwt(newSession);
    });

    return () => {
      isActive = false;
      data?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheck) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setHealth({ status: "error", message: "Backend nicht erreichbar" });
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!session || !actor.actorId) return;
    const alreadyClaimed =
      claimResult &&
      claimResult.actorId === actor.actorId &&
      claimResult.userId === session.user.id;
    if (alreadyClaimed) return;

    const controller = new AbortController();
    const claim = async () => {
      setClaiming(true);
      setClaimError(null);
      try {
        const res = await fetch("/api/auth/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ actorId: actor.actorId }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Claim fehlgeschlagen: ${res.status}`);
        const data = (await res.json()) as ClaimResponse;
        setClaimResult(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setClaimError(
          err instanceof Error ? err.message : "Claim fehlgeschlagen"
        );
      } finally {
        if (controller.signal.aborted) return;
        setClaiming(false);
      }
    };

    claim();
    return () => controller.abort();
  }, [actor.actorId, claimResult, session]);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const headers: HeadersInit = {};
        let query = "";

        if (identity.kind === "actor") {
          query = `?actorId=${encodeURIComponent(identity.actorId)}`;
        } else {
          headers.Authorization = `Bearer ${identity.accessToken}`;
        }

        const res = await fetch(`/api/groups${query}`, { headers });
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = (await res.json()) as GroupMembership[];
        setGroups(data);
      } catch (err) {
        setGroupsError(
          err instanceof Error ? err.message : "Unbekannter Fehler"
        );
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchGroups();
  }, [identity, result, claimResult]);

  const handleActorNameChange = (name: string) => {
    setDisplayName(name);
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (identity.kind === "user") {
        headers.Authorization = `Bearer ${identity.accessToken}`;
      }

      const payload = {
        groupName,
        actorId: identity.kind === "actor" ? identity.actorId : null,
        displayName: identity.displayName,
      };

      const response = await fetch("/api/groups", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Fehler: ${response.status}`);
      }

      const data = (await response.json()) as GroupCreateResult;
      setResult(data);
      setGroupName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setGroupsError(null);
    setDeletingId(groupId);
    try {
      const headers: HeadersInit = {};
      if (identity.kind === "user") {
        headers.Authorization = `Bearer ${identity.accessToken}`;
      }

      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        throw new Error(`Fehler: ${res.status}`);
      }
      setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    } catch (err) {
      setGroupsError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);

    try {
      if (!supabaseEnabled) {
        throw new Error("Supabase nicht konfiguriert");
      }

      if (!email || !password) {
        throw new Error("E-Mail und Passwort angeben");
      }

      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          // If email confirmations are disabled in Supabase, a session will be returned.
          // Fallback: try immediate password sign-in to avoid waiting for email confirmation.
          const { error: signinError } = await supabase.auth.signInWithPassword(
            { email, password }
          );
          if (signinError) {
            throw new Error(
              "Login nach Registrierung fehlgeschlagen. Prüfe, ob E-Mail-Bestätigung deaktiviert ist."
            );
          }
          setAuthNotice(null);
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    persistJwt(null);
    setSession(null);
    setClaimResult(null);
  };

  return (
    <div className="page">
      <header className="hero">
        <div className="eyebrow">Phase 1 · Gruppen erstellen</div>
        <h1>Gruppen-Urlaubsplaner</h1>
        <p>
          Erzeuge einen lokalen Actor, erstelle eine Gruppe und teile den
          Invite-Link.
        </p>
      </header>

      <main className="grid">
        <section className="card wide">
          <div className="card-header">
            <div>
              <p className="eyebrow">Identität & Login</p>
              <h2>{identity.displayName}</h2>
            </div>
            <span
              className={identity.kind === "user" ? "badge success" : "badge"}
            >
              {identity.kind === "user" ? "Supabase" : "Local only"}
            </span>
          </div>

          <div className="stack">
            <label className="field">
              <span>Lokaler Display Name</span>
              <input
                value={actor.displayName}
                onChange={(e) => handleActorNameChange(e.target.value)}
                placeholder="z. B. Alex"
              />
            </label>

            <div className="muted">Actor ID (persisted in localStorage)</div>
            <code className="mono">{actor.actorId}</code>
          </div>

          {identity.kind === "user" ? (
            <div className="stack">
              <div className="pill success">Angemeldet mit Supabase</div>
              <div className="result-row">
                <span>Supabase User</span>
                <code className="mono">{identity.userId}</code>
              </div>
              <div className="result-row">
                <span>JWT (gekürzt)</span>
                <code className="mono">
                  {identity.accessToken.slice(0, 18)}...
                </code>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={handleLogout}
                disabled={authLoading}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="stack">
              <p className="muted">
                Mit E-Mail/Passwort anmelden oder registrieren.
              </p>
              <form className="stack" onSubmit={handleEmailAuth}>
                <label className="field">
                  <span>E-Mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="du@example.com"
                  />
                </label>
                <label className="field">
                  <span>Passwort</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </label>

                <div className="result-row">
                  <button
                    type="submit"
                    disabled={authLoading || !supabaseEnabled}
                  >
                    {authMode === "signin" ? "Login" : "Registrieren"}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setAuthMode(authMode === "signin" ? "signup" : "signin");
                      setAuthError(null);
                      setAuthNotice(null);
                    }}
                  >
                    {authMode === "signin"
                      ? "Neu? Registrieren"
                      : "Schon Account? Login"}
                  </button>
                </div>
              </form>
              {!supabaseEnabled && (
                <div className="pill">Supabase nicht konfiguriert</div>
              )}
              {authError && <div className="pill danger">{authError}</div>}
              {authNotice && <div className="pill success">{authNotice}</div>}
            </div>
          )}

          {session && (
            <div className="stack">
              <p className="muted">
                Wir verknüpfen deinen lokalen Actor mit deinem Supabase-Konto.
              </p>
              {claiming ? (
                <div className="pill">Claim läuft...</div>
              ) : claimError ? (
                <div className="pill danger">{claimError}</div>
              ) : claimResult ? (
                <div className="pill success">Actor verknüpft</div>
              ) : null}
            </div>
          )}
        </section>

        <section className="card wide">
          <p className="eyebrow">Deine Gruppen</p>
          <h3>Mitgliedschaften</h3>
          {groupsLoading ? (
            <p>Gruppen werden geladen...</p>
          ) : groupsError ? (
            <div className="pill danger">{groupsError}</div>
          ) : groups.length === 0 ? (
            <p className="muted">
              Du bist noch in keiner Gruppe. Erstelle die erste oben.
            </p>
          ) : (
            <div className="stack">
              {groups.map((g) => (
                <div key={g.groupId} className="result">
                  <div className="result-row">
                    <span>{g.name}</span>
                    <span className="pill success">{g.role}</span>
                  </div>
                  <div className="result-row">
                    <span>Invite</span>
                    <a href={g.inviteLink} target="_blank" rel="noreferrer">
                      {g.inviteLink}
                    </a>
                  </div>
                  <div className="result-row">
                    <span className="muted">Aktionen</span>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={() => handleDeleteGroup(g.groupId)}
                      disabled={deletingId === g.groupId}
                    >
                      {deletingId === g.groupId
                        ? "Lösche..."
                        : "Gruppe löschen"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Backend Status</p>
          <h3>API Health</h3>
          {loading ? (
            <p>Verbinde mit Backend...</p>
          ) : (
            <div
              className={
                health?.status === "ok" ? "pill success" : "pill danger"
              }
            >
              {health?.status}: {health?.message}
            </div>
          )}
        </section>

        <section className="card">
          <p className="eyebrow">Nächster Schritt</p>
          <h3>Verfügbarkeit sammeln</h3>
          <div className="stack">
            <div className="pill">Coming soon</div>
            <p className="muted">
              Placeholder für das Einsammeln von Zeitfenstern pro Teilnehmer.
              Hier landen später Kalender-Inputs und Uploads.
            </p>
          </div>
        </section>

        <section className="card">
          <p className="eyebrow">Nächster Schritt</p>
          <h3>Beste Zeiten finden</h3>
          <div className="stack">
            <div className="pill">Coming soon</div>
            <p className="muted">
              Placeholder für den Algorithmus, der optimale Zeiträume aus den
              Verfügbarkeiten errechnet und ranked.
            </p>
          </div>
        </section>

        <section className="card wide">
          <p className="eyebrow">Gruppe erstellen</p>
          <h3>POST /groups</h3>
          <form className="stack" onSubmit={handleCreateGroup}>
            <label className="field">
              <span>Gruppenname</span>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                placeholder="Team Wochenende"
              />
            </label>

            <button type="submit" disabled={creating}>
              {creating ? "Wird erstellt..." : "Gruppe anlegen"}
            </button>

            {error && <div className="pill danger">{error}</div>}
            {result && (
              <div className="result">
                <div className="pill success">Gruppe erstellt</div>
                <div className="result-row">
                  <span>Group ID</span>
                  <code className="mono">{result.groupId}</code>
                </div>
                <div className="result-row">
                  <span>Invite Link</span>
                  <a href={result.inviteLink} target="_blank" rel="noreferrer">
                    {result.inviteLink}
                  </a>
                </div>
                <div className="result-row">
                  <span>Rolle</span>
                  <span>{result.role}</span>
                </div>
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
