import type { FormEvent } from "react";
import { GroupCreateResult } from "../types";
import {
  buttonPrimary,
  card,
  cardHeader,
  field,
  input,
  metaRow,
  mono,
  muted,
  pillDanger,
  pillSuccess,
  resultBox,
  stackSm,
} from "../ui";

type GroupCreateCardProps = {
  groupName: string;
  creating: boolean;
  error: string | null;
  result: GroupCreateResult | null;
  onGroupNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function GroupCreateCard({
  groupName,
  creating,
  error,
  result,
  onGroupNameChange,
  onSubmit,
}: GroupCreateCardProps) {
  return (
    <section className={card}>
      <div className={cardHeader}>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
            Neue Gruppe
          </p>
          <h3 className="text-lg font-semibold text-slate-900">POST /groups</h3>
        </div>
      </div>

      <form className={stackSm} onSubmit={onSubmit}>
        <label className={field}>
          <span className="text-sm text-slate-700">Gruppenname</span>
          <input
            className={input}
            value={groupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
            required
            placeholder="Team Wochenende"
          />
        </label>

        <button type="submit" className={buttonPrimary} disabled={creating}>
          {creating ? "Wird erstellt..." : "Gruppe anlegen"}
        </button>

        {error && <div className={pillDanger}>{error}</div>}
        {result && (
          <div className={resultBox}>
            <div className={pillSuccess}>Gruppe erstellt</div>
            <div className={metaRow}>
              <span className={muted}>Group ID</span>
              <code className={mono}>{result.groupId}</code>
            </div>
            <div className={metaRow}>
              <span className={muted}>Invite Link</span>
              <a
                className="text-blue-600 underline"
                href={result.inviteLink}
                target="_blank"
                rel="noreferrer"
              >
                {result.inviteLink}
              </a>
            </div>
            <div className={metaRow}>
              <span className={muted}>Rolle</span>
              <span>{result.role}</span>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
