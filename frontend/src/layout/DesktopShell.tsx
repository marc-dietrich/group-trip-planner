import { Link, NavLink } from "react-router-dom";
import { Identity } from "../types";
import { GroupMembership } from "../types";
import { GroupsFetchStatus } from "../hooks/useGroups";
import { buttonGhostTiny } from "../ui";

const navItems = [
  { to: "/groups", label: "Gruppen", icon: "groups" },
  { to: "/profile", label: "Profil", icon: "person" },
  { to: "/more", label: "Mehr", icon: "widgets" },
];

type DesktopShellProps = {
  identity: Identity;
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsStatus: GroupsFetchStatus;
  groupsError: string | null;
  deletingId: string | null;
  onCopyInvite: (group: GroupMembership) => void;
  onDeleteGroup: (groupId: string) => void;
  onLogout: () => void;
  onCreateGroup: () => void;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
};

export function DesktopShell({
  identity,
  groups,
  groupsLoading,
  groupsStatus,
  groupsError,
  deletingId,
  onCopyInvite,
  onDeleteGroup,
  onLogout,
  onCreateGroup,
  rightRail,
  children,
}: DesktopShellProps) {
  const isInitialLoading = groupsStatus === "loading";
  const isErrorState = groupsStatus === "error";
  const initials = (identity.displayName || "?").slice(0, 2).toUpperCase();
  const identityHint =
    identity.kind === "user" ? "Eingeloggt" : "Gastmodus (ohne Anmeldung)";

  return (
    <div className="grid min-h-screen grid-cols-[260px,1fr,340px] bg-gradient-to-b from-clay via-cream to-sage-50 text-sage-900">
      <aside className="flex min-h-screen flex-col border-r border-sage-100 bg-cream/95 px-4 py-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between px-1">
          <Link to="/groups" className="text-lg font-bold tracking-tight">
            Trip Planner
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-sage-200 bg-white text-sage-800 shadow-sm transition hover:border-brand-primary/60 hover:text-brand-primary"
            aria-label="Neue Gruppe"
            onClick={onCreateGroup}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2 font-semibold transition hover:bg-sage-50 ${
                  isActive
                    ? "bg-sage-100 text-sage-900"
                    : "text-sage-600 hover:text-sage-900"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sage-500">
              Gruppen
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-brand-primary hover:text-sage-800"
              onClick={onCreateGroup}
            >
              Neu
            </button>
          </div>
          <div className="overflow-y-auto pr-1">
            {isInitialLoading ? (
              <div className="space-y-2" aria-busy="true" aria-live="polite">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-12 rounded-2xl bg-sage-100 animate-pulse"
                  />
                ))}
              </div>
            ) : groups.length > 0 ? (
              <ul className="space-y-2">
                {groups.map((group) => (
                  <li
                    key={group.groupId}
                    className="flex items-center justify-between rounded-2xl border border-sage-100 bg-sage-50 px-3 py-2"
                  >
                    <Link
                      to={`/groups/${group.groupId}`}
                      className="flex-1 truncate font-semibold text-sage-900 transition hover:text-brand-primary"
                    >
                      {group.name}
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={buttonGhostTiny}
                        onClick={() => onCopyInvite(group)}
                        title="Einladung kopieren"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          link
                        </span>
                      </button>
                      <button
                        type="button"
                        className={buttonGhostTiny}
                        onClick={() => onDeleteGroup(group.groupId)}
                        disabled={deletingId === group.groupId}
                        title="Gruppe löschen"
                      >
                        <span className="material-symbols-outlined text-[16px] text-rose-500">
                          delete
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : isErrorState ? (
              <p className="mt-2 px-1 text-sm font-semibold text-rose-600">
                {groupsError}
              </p>
            ) : (
              <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50 px-3 py-3 text-sm text-sage-600">
                Noch keine Gruppen angelegt.
              </div>
            )}
            {groupsLoading && !isInitialLoading && (
              <p className="mt-2 px-1 text-sm text-sage-500">
                Gruppen werden geladen…
              </p>
            )}
            {groupsError && !isErrorState && (
              <p className="mt-2 px-1 text-sm font-semibold text-rose-600">
                {groupsError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-sage-100 bg-sage-50 px-3 py-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-100 text-base font-semibold text-sage-800">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-sage-900">
              {identity.displayName}
            </p>
            <p className="text-xs text-sage-500">{identityHint}</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-sage-200 bg-white text-sage-700 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
            onClick={onLogout}
            title="Abmelden"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
          </button>
        </div>
      </aside>

      <main className="border-r border-sage-100 bg-cream/90">
        <div className="mx-auto max-w-5xl px-10 py-10">{children}</div>
      </main>

      <aside className="hidden border-l border-sage-100 bg-gradient-to-b from-clay via-cream to-sage-50 px-6 py-8 lg:block">
        <div className="sticky top-8 space-y-4">{rightRail}</div>
      </aside>
    </div>
  );
}
