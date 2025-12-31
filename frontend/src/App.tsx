import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  DEFAULT_ACTOR_NAME,
  isPlaceholderActorName,
  useLocalActor,
} from "./lib/actor";
import {
  getExistingSession,
  getUserDisplayName,
  persistJwt,
  supabaseEnabled,
  supabase,
} from "./lib/supabase";
import {
  GroupCreateResult,
  GroupMembership,
  HealthCheck,
  Identity,
  GroupInvitePreview,
  JoinGroupResponse,
} from "./types";
import { AuthModal } from "./components/AuthModal";
import { ActorNameModal } from "./components/ActorNameModal";
import { GroupCreateModal } from "./components/GroupCreateModal";
import { GroupsCard } from "./components/GroupsCard";
import { IdentityStrip } from "./components/IdentityStrip";
import { Topbar } from "./components/Topbar";
import { toast } from "sonner";
import { AvailabilityFlow } from "./components/AvailabilityFlow";
import { InviteModal } from "./components/InviteModal";
import {
  buttonGhost,
  buttonRow,
  cardMinimal,
  layoutGrid,
  pageShell,
} from "./ui";

function App() {
  const [actor, setActorDisplayName] = useLocalActor(DEFAULT_ACTOR_NAME);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("Wochenend-Trip");
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GroupCreateResult | null>(null);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [groupsReloadToken, setGroupsReloadToken] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(
    null
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

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
    if (isPlaceholderActorName(actor.displayName)) {
      setPendingName("");
      setNamePromptOpen(true);
    } else if (!namePromptOpen) {
      setPendingName(actor.displayName);
    }
  }, [actor.displayName, namePromptOpen]);

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
      })
      .catch(() => {
        setHealth({ status: "error", message: "Backend nicht erreichbar" });
      });
  }, []);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/invite\/([A-Za-z0-9-]+)/);
    if (match?.[1]) {
      setInviteGroupId(match[1]);
      setInviteOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!inviteGroupId) return;

    setInviteLoading(true);
    setInviteError(null);
    setAlreadyMember(false);

    fetch(`/api/groups/${inviteGroupId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Einladung ungültig oder abgelaufen");
        return res.json();
      })
      .then((data: any) => {
        setInvitePreview({
          groupId: data.groupId || data.id || inviteGroupId,
          name: data.name,
        });
      })
      .catch((err) => {
        setInviteError(
          err instanceof Error ? err.message : "Einladung ungültig"
        );
      })
      .finally(() => setInviteLoading(false));
  }, [inviteGroupId]);

  useEffect(() => {
    const fetchGroups = async () => {
      setGroupsLoading(true);
      setGroupsError(null);
      try {
        const headers: HeadersInit = {};
        if (identity.kind !== "user") {
          setGroups([]);
          setGroupsError("Bitte einloggen, um Gruppen zu sehen.");
          return;
        }

        headers.Authorization = `Bearer ${identity.accessToken}`;

        const res = await fetch(`/api/groups`, { headers });
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
  }, [identity, result, groupsReloadToken]);

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);

    if (identity.kind !== "user") {
      setError("Bitte erst einloggen, um eine Gruppe zu erstellen.");
      setAuthPanelOpen(true);
      setCreating(false);
      return;
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      headers.Authorization = `Bearer ${identity.accessToken}`;

      const payload = {
        groupName,
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

    if (identity.kind !== "user") {
      setGroupsError("Nur angemeldete Nutzer können Gruppen löschen.");
      setDeletingId(null);
      setAuthPanelOpen(true);
      return;
    }

    try {
      const headers: HeadersInit = {};
      headers.Authorization = `Bearer ${identity.accessToken}`;

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

  const handleCopyInvite = async (group: GroupMembership) => {
    const link =
      group.inviteLink || `${window.location.origin}/invite/${group.groupId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Einladungslink kopiert");
    } catch (err) {
      toast.error("Konnte Link nicht kopieren");
    }
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteGroupId(null);
    setInvitePreview(null);
    setInviteError(null);
    setAlreadyMember(false);
    window.history.replaceState({}, "", "/");
  };

  const handleAcceptInvite = async () => {
    if (!inviteGroupId) return;

    if (identity.kind !== "user") {
      setAuthPanelOpen(true);
      return;
    }

    setJoining(true);
    setInviteError(null);

    try {
      const headers: HeadersInit = {
        Authorization: `Bearer ${identity.accessToken}`,
      };
      const res = await fetch(`/api/groups/${inviteGroupId}/join`, {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        throw new Error(`Fehler: ${res.status}`);
      }

      const data = (await res.json()) as JoinGroupResponse;
      setAlreadyMember(data.alreadyMember);

      const membership: GroupMembership = {
        groupId: data.groupId,
        name: data.name,
        role: data.role,
        inviteLink: data.inviteLink,
      };

      setGroups((prev) => {
        const exists = prev.some((g) => g.groupId === membership.groupId);
        return exists
          ? prev.map((g) => (g.groupId === membership.groupId ? membership : g))
          : [...prev, membership];
      });
      setGroupsReloadToken((value) => value + 1);

      toast.success(
        data.alreadyMember ? "Du bist bereits Mitglied." : "Gruppe beigetreten."
      );
      handleCloseInvite();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Beitritt fehlgeschlagen"
      );
    } finally {
      setJoining(false);
    }
  };

  const handleMockVoice = async () => {
    try {
      const res = await fetch("/api/voice/transcribe", { method: "POST" });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      const data = await res.json();
      toast.success(
        `Mock-Transkript: ${data.audioText}. Verfügbarkeiten: ${
          data.availability
            ?.map((a: any) => `${a.start}→${a.end}`)
            .join(", ") || "–"
        }`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Mock-Transcribe fehlgeschlagen"
      );
    }
  };

  const handleEmailAuth = async (event: FormEvent) => {
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
  };

  const handleSaveActorName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setActorDisplayName(trimmed);
    setPendingName(trimmed);
    setNamePromptOpen(false);
  };

  return (
    <div className={pageShell}>
      <ActorNameModal
        open={namePromptOpen}
        value={pendingName}
        onChange={setPendingName}
        onSubmit={handleSaveActorName}
      />

      <InviteModal
        open={inviteOpen}
        loading={inviteLoading}
        invite={invitePreview}
        error={inviteError}
        joining={joining}
        alreadyMember={alreadyMember}
        requireLogin={identity.kind !== "user"}
        onJoin={handleAcceptInvite}
        onClose={handleCloseInvite}
        onLogin={() => {
          setAuthPanelOpen(true);
          setInviteError(null);
        }}
      />

      <Topbar
        title="Gemeinsam Termine finden"
        subtitle="Gruppen-Urlaubsplaner"
        health={health}
      />

      <IdentityStrip
        identity={identity}
        authLoading={authLoading}
        supabaseEnabled={supabaseEnabled}
        onLogin={() => setAuthPanelOpen(true)}
        onLogout={handleLogout}
      />

      <main className={layoutGrid}>
        <AvailabilityFlow
          groups={groups}
          groupsLoading={groupsLoading}
          groupsError={groupsError}
          identity={identity}
        />
        <GroupsCard
          groups={groups}
          groupsLoading={groupsLoading}
          groupsError={groupsError}
          deletingId={deletingId}
          onDelete={handleDeleteGroup}
          onCreateClick={() => setCreateOpen(true)}
          onCopyInvite={handleCopyInvite}
        />
        <div className={`${cardMinimal} mt-4`}>
          <div className={buttonRow}>
            <button
              type="button"
              className={buttonGhost}
              onClick={handleMockVoice}
            >
              Sprach-Mock testen
            </button>
          </div>
        </div>
      </main>

      <GroupCreateModal
        open={createOpen}
        groupName={groupName}
        creating={creating}
        error={error}
        result={result}
        onGroupNameChange={setGroupName}
        onSubmit={handleCreateGroup}
        onClose={() => {
          setCreateOpen(false);
          setResult(null);
          setError(null);
        }}
      />

      <AuthModal
        open={authPanelOpen && identity.kind === "actor"}
        supabaseEnabled={supabaseEnabled}
        authMode={authMode}
        email={email}
        password={password}
        authLoading={authLoading}
        authError={authError}
        authNotice={authNotice}
        onSubmit={handleEmailAuth}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSwitchMode={(mode) => {
          setAuthMode(mode);
          setAuthError(null);
          setAuthNotice(null);
        }}
        onClose={() => setAuthPanelOpen(false)}
      />
    </div>
  );
}

export default App;
