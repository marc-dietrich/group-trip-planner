import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  DEFAULT_ACTOR_NAME,
  isPlaceholderActorName,
  useLocalActor,
} from "./lib/actor";
import {
  getExistingSession,
  getUserDisplayName,
  persistJwt,
  supabase,
  supabaseEnabled,
} from "./lib/supabase";
import {
  GroupCreateResult,
  GroupInvitePreview,
  GroupMembership,
  HealthCheck,
  Identity,
  JoinGroupResponse,
} from "./types";
import { apiPath } from "./lib/api";
import { AuthModal } from "./components/AuthModal";
import { ActorNameModal } from "./components/ActorNameModal";
import { GroupCreateModal } from "./components/GroupCreateModal";
import { InviteModal } from "./components/InviteModal";
import { Topbar } from "./components/Topbar";
import { BottomNav } from "./components/BottomNav";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MorePage } from "./pages/MorePage";
import { DialogSandbox } from "./pages/DialogSandbox";
import { pageShell } from "./ui";

const basename = import.meta.env.BASE_URL || "/";
const buildCommit =
  (import.meta.env.VITE_BUILD_COMMIT as string | undefined) || "";
const rawBuildLabel =
  (import.meta.env.VITE_BUILD_LABEL as string | undefined) ||
  (import.meta.env.VITE_COMMIT as string | undefined) ||
  buildCommit ||
  "";
const buildLabel = rawBuildLabel ? rawBuildLabel.slice(0, 7) : "dev";

const stripBasename = (path: string) => {
  if (!basename || basename === "/") return path;
  const normalizedBase = basename.endsWith("/")
    ? basename.slice(0, -1)
    : basename;
  return path.startsWith(normalizedBase)
    ? path.slice(normalizedBase.length) || "/"
    : path;
};

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("App rendering error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-10 text-center">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">
              Es ist ein Fehler aufgetreten
            </p>
            <p className="mt-2 text-base text-slate-800">
              {this.state.message}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Bitte Seite neu laden oder erneut versuchen.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => window.location.reload()}
              >
                Neu laden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

function AppShell() {
  const isDialogSandbox =
    typeof window !== "undefined" &&
    window.location.pathname.includes("__dialog-sandbox");

  if (isDialogSandbox) {
    return <DialogSandbox />;
  }

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
    fetch(apiPath("/api/health"))
      .then((res) => res.json())
      .then((data: HealthCheck) => setHealth(data))
      .catch(() =>
        setHealth({ status: "error", message: "Backend nicht erreichbar" })
      );
  }, []);

  useEffect(() => {
    const relativePath = stripBasename(window.location.pathname);
    const match = relativePath.match(/^\/?invite\/([A-Za-z0-9-]+)/);
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

    fetch(apiPath(`/api/groups/${inviteGroupId}`))
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
        const res = await fetch(apiPath(`/api/groups`), { headers });
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

      const payload = { groupName, displayName: identity.displayName };
      const response = await fetch(apiPath("/api/groups"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Fehler: ${response.status}`);

      const data = (await response.json()) as GroupCreateResult;
      setResult(data);
      setGroupName("");
      setGroupsReloadToken((v) => v + 1);
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
      const headers: HeadersInit = {
        Authorization: `Bearer ${identity.accessToken}`,
      };
      const res = await fetch(apiPath(`/api/groups/${groupId}`), {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
    } catch (err) {
      setGroupsError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyInvite = async (group: GroupMembership) => {
    const prefix = basename.endsWith("/") ? basename : `${basename}/`;
    const fallback = `${window.location.origin}${
      prefix.startsWith("/") ? prefix : `/${prefix}`
    }invite/${group.groupId}`;
    const link = group.inviteLink || fallback;
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
    window.history.replaceState({}, "", basename);
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
      const res = await fetch(apiPath(`/api/groups/${inviteGroupId}/join`), {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
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
      const res = await fetch(apiPath("/api/voice/transcribe"), {
        method: "POST",
      });
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
      if (!supabaseEnabled) throw new Error("Supabase nicht konfiguriert");
      if (!email || !password) throw new Error("E-Mail und Passwort angeben");

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
          const { error: signinError } = await supabase.auth.signInWithPassword(
            { email, password }
          );
          if (signinError)
            throw new Error("Login nach Registrierung fehlgeschlagen");
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
        buildLabel={buildLabel}
        buildTitle={buildCommit || undefined}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route
          path="/groups"
          element={
            <GroupsPage
              groups={groups}
              groupsLoading={groupsLoading}
              groupsError={groupsError}
              deletingId={deletingId}
              identity={identity}
              onCreate={() => setCreateOpen(true)}
              onDelete={handleDeleteGroup}
              onCopyInvite={handleCopyInvite}
              onRequireLogin={() => setAuthPanelOpen(true)}
            />
          }
        />
        <Route
          path="/groups/:groupId"
          element={<GroupDetailPage identity={identity} groups={groups} />}
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              identity={identity}
              authLoading={authLoading}
              supabaseEnabled={supabaseEnabled}
              health={health}
              onLogin={() => setAuthPanelOpen(true)}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/more"
          element={<MorePage onTestVoice={handleMockVoice} />}
        />
        <Route
          path="/invite/:inviteId"
          element={
            <InviteRoute
              onInvite={(id) => setInviteGroupId(id)}
              onShow={() => setInviteOpen(true)}
            />
          }
        />
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>

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

      <BottomNav />
    </div>
  );
}

function InviteRoute({
  onInvite,
  onShow,
}: {
  onInvite: (id: string) => void;
  onShow: () => void;
}) {
  const { inviteId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (inviteId) {
      onInvite(inviteId);
      onShow();
      navigate("/groups", { replace: true });
    }
  }, [inviteId, navigate, onInvite, onShow]);

  return null;
}

export default App;
