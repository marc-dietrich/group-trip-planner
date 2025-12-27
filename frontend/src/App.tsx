import { useEffect, useState } from "react";
import { useLocalActor } from "./lib/actor";
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

function App() {
  const [actor, setDisplayName] = useLocalActor("Traveler");
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
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const res = await fetch(
          `/api/groups?actorId=${encodeURIComponent(actor.actorId)}`
        );
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
  }, [actor.actorId, result]);

  const handleActorNameChange = (name: string) => {
    setDisplayName(name);
  };

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          actorId: actor.actorId,
          displayName: actor.displayName,
        }),
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
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
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
              <p className="eyebrow">Dein lokaler Actor</p>
              <h2>{actor.displayName}</h2>
            </div>
            <span className="badge">Local only</span>
          </div>

          <div className="stack">
            <label className="field">
              <span>Display Name</span>
              <input
                value={actor.displayName}
                onChange={(e) => handleActorNameChange(e.target.value)}
                placeholder="z. B. Alex"
              />
            </label>

            <div className="muted">Actor ID (persisted in localStorage)</div>
            <code className="mono">{actor.actorId}</code>
          </div>
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
