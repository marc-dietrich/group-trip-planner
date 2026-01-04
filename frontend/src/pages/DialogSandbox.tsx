import { useEffect } from "react";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import type { GroupMembership, Identity } from "../types";

const groups: GroupMembership[] = [
  {
    groupId: "sandbox-group",
    name: "Sandbox Gruppe",
    role: "owner",
    inviteLink: "#",
  },
];

const identity: Identity = {
  kind: "user",
  userId: "sandbox-user",
  displayName: "Sandbox",
  accessToken: "sandbox-token",
};

export function DialogSandbox() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100vh";
    body.style.height = "100vh";
    html.scrollTop = 0;
    body.scrollTop = 0;

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/groups/sandbox-group/availabilities")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/api/availabilities/")) {
        return new Response(null, { status: 204 });
      }

      if (url.includes("/api/groups/") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "mock",
            startDate: "2024-01-01",
            endDate: "2024-01-02",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);

  return (
    <div className="min-h-screen w-screen overflow-hidden bg-slate-50 flex items-center justify-center p-3">
      <AvailabilityFlow
        groups={groups}
        groupsLoading={false}
        groupsError={null}
        identity={identity}
        fixedGroupId="sandbox-group"
        hideSavedList
      />
    </div>
  );
}
