import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_ACTOR_NAME,
  ensureActorRemote,
  isPlaceholderActorName,
  useLocalActor,
} from "./lib/actor";
import {
  AuthSession,
  authEnabled,
  getExistingSession,
  persistJwt,
  startOAuthLogin,
  startOAuthLogout,
} from "./lib/auth";
import { buildIdentityHeaders } from "./lib/identity";
import {
  GroupCreateResult,
  GroupInvitePreview,
  GroupMembership,
  HealthCheck,
  Identity,
  JoinGroupResponse,
} from "./types";
import { apiPath } from "./lib/api";
import { ActorNameModal } from "./components/ActorNameModal";
import { GroupCreateModal } from "./components/GroupCreateModal";
import { InviteModal } from "./components/InviteModal";
import { SideMenu } from "./components/SideMenu";
import { IdentityCard } from "./components/IdentityCard";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MorePage } from "./pages/MorePage";
import { SupporterThanksPage } from "./pages/SupporterThanksPage";
import { DialogSandbox } from "./pages/DialogSandbox";
import { DesktopGroupsPage } from "./pages/desktop/DesktopGroupsPage";
import { DesktopGroupDetailPage } from "./pages/desktop/DesktopGroupDetailPage";
import { LayoutProvider, useLayoutMode } from "./layout/layoutMode";
import { DesktopShell } from "./layout/DesktopShell";
import { MobileShell } from "./layout/MobileShell";
import { useGroups } from "./hooks/useGroups";
import { useGroupStore } from "./state/groupStore";
import { fetchSupporterStatus } from "./services/supporterService";

const basename = import.meta.env.BASE_URL || "/";

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
      <LayoutProvider>
        <AppErrorBoundary>
          <AppShell />
        </AppErrorBoundary>
      </LayoutProvider>
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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupsActionError, setGroupsActionError] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<GroupInvitePreview | null>(
    null,
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasSupporterCrown, setHasSupporterCrown] = useState(false);
  const oauthReady = authEnabled;

  const identity = useMemo<Identity>(() => {
    if (session?.userId) {
      return {
        kind: "user",
        actorId: actor.actorId,
        userId: session.userId,
        displayName: session.displayName || actor.displayName,
        accessToken: session.accessToken,
      };
    }

    return {
      kind: "actor",
      actorId: actor.actorId,
      displayName: actor.displayName,
    };
  }, [actor.actorId, actor.displayName, session]);

  const {
    groups,
    groupsLoading,
    groupsError,
    groupsStatus,
    refetch: refetchGroups,
  } = useGroups(identity);
  const upsertGroup = useGroupStore((state) => state.upsertGroup);
  const removeGroup = useGroupStore((state) => state.removeGroup);

  useEffect(() => {
    if (isPlaceholderActorName(actor.displayName)) {
      setPendingName("");
      setNamePromptOpen(true);
    } else if (!namePromptOpen) {
      setPendingName(actor.displayName);
    }
  }, [actor.displayName, namePromptOpen]);

  useEffect(() => {
    if (identity.kind !== "user") return;
    const controller = new AbortController();

    const headers = buildIdentityHeaders(identity, {
      "Content-Type": "application/json",
    });
    fetch(apiPath("/api/auth/claim"), {
      method: "POST",
      headers,
      body: JSON.stringify({ actorId: identity.actorId }),
      signal: controller.signal,
    }).catch((err) => console.warn("Actor claim failed", err));

    return () => controller.abort();
  }, [identity]);

  useEffect(() => {
    let cancelled = false;

    fetchSupporterStatus(identity)
      .then((result) => {
        if (cancelled) return;
        setHasSupporterCrown(Boolean(result?.hasCrown));
      })
      .catch(() => {
        if (cancelled) return;
        setHasSupporterCrown(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    identity.actorId,
    identity.kind,
    identity.kind === "user" ? identity.accessToken : undefined,
  ]);

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

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    fetch(apiPath("/api/health"))
      .then((res) => res.json())
      .then((data: HealthCheck) => setHealth(data))
      .catch(() =>
        setHealth({ status: "error", message: "Backend nicht erreichbar" }),
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
          err instanceof Error ? err.message : "Einladung ungültig",
        );
      })
      .finally(() => setInviteLoading(false));
  }, [inviteGroupId]);

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setGroupsActionError(null);

    try {
      if (identity.kind === "actor") {
        await ensureActorRemote(identity);
      }

      const headers: HeadersInit = buildIdentityHeaders(identity, {
        "Content-Type": "application/json",
      });

      const payload = { groupName, displayName: identity.displayName };
      const response = await fetch(apiPath("/api/groups"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Fehler: ${response.status}`);

      const data = (await response.json()) as GroupCreateResult;
      setGroupName("");
      setCreateOpen(false);
      toast.success(`"${data.name}" erstellt`);
      const membership: GroupMembership = {
        groupId: data.groupId,
        name: data.name,
        role: data.role,
        inviteLink: data.inviteLink,
      };
      upsertGroup(membership);
      void refetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setGroupsActionError(null);
    setDeletingId(groupId);

    try {
      const headers: HeadersInit = buildIdentityHeaders(identity);
      const res = await fetch(apiPath(`/api/groups/${groupId}`), {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      removeGroup(groupId);
      void refetchGroups();
    } catch (err) {
      setGroupsActionError(
        err instanceof Error ? err.message : "Unbekannter Fehler",
      );
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

    setJoining(true);
    setInviteError(null);

    try {
      const headers: HeadersInit = buildIdentityHeaders(identity);
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

      upsertGroup(membership);
      void refetchGroups();
      toast.success(
        data.alreadyMember
          ? "Du bist bereits Mitglied."
          : "Gruppe beigetreten.",
      );
      handleCloseInvite();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Beitritt fehlgeschlagen",
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
        }`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Mock-Transkript fehlgeschlagen",
      );
    }
  };

  const handleStartOAuthLogin = () => {
    if (!authEnabled) {
      toast.error("OAuth-Login ist nicht konfiguriert.");
      return;
    }
    startOAuthLogin();
  };

  const handleLogout = async () => {
    startOAuthLogout();
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

  const layoutMode = useLayoutMode();
  // Temporarily force mobile UI everywhere while desktop is disabled
  const isDesktop = false && layoutMode === "desktop";

  useEffect(() => {
    if (isDesktop && menuOpen) {
      setMenuOpen(false);
    }
  }, [isDesktop, menuOpen]);

  const combinedGroupsError = groupsError || groupsActionError;

  const rightRail = isDesktop ? (
    <IdentityCard
      identity={identity}
      localDisplayName={pendingName || actor.displayName}
      onDisplayNameChange={(value) => {
        setPendingName(value);
        setActorDisplayName(value);
      }}
      onLogout={handleLogout}
      onAuthClick={handleStartOAuthLogin}
      authLoading={authLoading}
      authEnabled={oauthReady}
    />
  ) : null;

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to="/groups" replace />} />
      <Route
        path="/groups"
        element={
          isDesktop ? (
            <DesktopGroupsPage
              groups={groups}
              groupsStatus={groupsStatus}
              groupsError={combinedGroupsError}
              identity={identity}
              health={health}
              onCreate={() => setCreateOpen(true)}
            />
          ) : (
            <GroupsPage
              groups={groups}
              groupsStatus={groupsStatus}
              groupsError={combinedGroupsError}
              deletingId={deletingId}
              identity={identity}
              onCreate={() => setCreateOpen(true)}
              onDelete={handleDeleteGroup}
              onCopyInvite={handleCopyInvite}
              onOpenMenu={() => setMenuOpen(true)}
            />
          )
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          isDesktop ? (
            <DesktopGroupDetailPage
              identity={identity}
              groups={groups}
              health={health}
            />
          ) : (
            <GroupDetailPage identity={identity} groups={groups} />
          )
        }
      />
      <Route
        path="/profile"
        element={
          <ProfilePage
            identity={identity}
            authLoading={authLoading}
            authEnabled={oauthReady}
            health={health}
            onLogin={handleStartOAuthLogin}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/more"
        element={<MorePage onTestVoice={handleMockVoice} />}
      />
      <Route path="/supporter/thanks" element={<SupporterThanksPage />} />
      <Route
        path="/success"
        element={<Navigate to="/supporter/thanks" replace />}
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
  );

  return (
    <>
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
        requireLogin={false}
        onJoin={handleAcceptInvite}
        onClose={handleCloseInvite}
        onLogin={() => {
          handleStartOAuthLogin();
          setInviteError(null);
        }}
      />

      {!isDesktop && (
        <SideMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          identity={identity}
          hasSupporterCrown={hasSupporterCrown}
          onLogout={handleLogout}
          onLogin={handleStartOAuthLogin}
          authEnabled={oauthReady}
        />
      )}

      {isDesktop ? (
        <DesktopShell
          identity={identity}
          groups={groups}
          groupsLoading={groupsLoading}
          groupsStatus={groupsStatus}
          groupsError={combinedGroupsError}
          deletingId={deletingId}
          onCopyInvite={handleCopyInvite}
          onDeleteGroup={handleDeleteGroup}
          onLogout={handleLogout}
          onCreateGroup={() => setCreateOpen(true)}
          rightRail={rightRail}
        >
          {routes}
        </DesktopShell>
      ) : (
        <MobileShell>{routes}</MobileShell>
      )}

      <GroupCreateModal
        open={createOpen}
        groupName={groupName}
        creating={creating}
        error={error}
        onGroupNameChange={setGroupName}
        onSubmit={handleCreateGroup}
        onClose={() => {
          setCreateOpen(false);
          setError(null);
        }}
      />

    </>
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
