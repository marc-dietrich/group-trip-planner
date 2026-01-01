import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { GroupDetailPage } from "./GroupDetailPage";

const summaryResponse = [
  { from: "2025-07-01", to: "2025-07-03", availableCount: 3, totalMembers: 5 },
  { from: "2025-07-05", to: "2025-07-06", availableCount: 2, totalMembers: 5 },
];

const memberAvailabilityResponse = [
  {
    memberId: "m1",
    userId: "u1",
    displayName: "You",
    role: "owner",
    availabilities: [
      { id: "a1", groupId: "123", startDate: "2025-07-01", endDate: "2025-07-03" },
    ],
  },
  {
    memberId: "m2",
    userId: "u2",
    displayName: "Alex",
    role: "member",
    availabilities: [],
  },
];

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("GroupDetailPage availability summary", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("availability-summary")) return mockResponse(summaryResponse);
        if (url.includes("member-availabilities")) return mockResponse(memberAvailabilityResponse);
        if (url.endsWith("/availabilities")) return mockResponse([]);
        if (/\/api\/groups\/.+/.test(url)) return mockResponse({ name: "Sommertrip" });
        return mockResponse({}, 404);
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders summary rows with counts", async () => {
    render(
      <MemoryRouter initialEntries={["/groups/123"]}>
        <Routes>
          <Route
            path="/groups/:groupId"
            element={
              <GroupDetailPage
                identity={{ kind: "user", userId: "u1", displayName: "You", accessToken: "token" }}
                groups={[{ groupId: "123", name: "Sommertrip", role: "owner", inviteLink: "" }]}
                groupsLoading={false}
                groupsError={null}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/3 von 5 Mitgliedern verfügbar/)).toBeInTheDocument();
      expect(screen.getByText(/2 von 5 Mitgliedern verfügbar/)).toBeInTheDocument();
    });
  });
});
