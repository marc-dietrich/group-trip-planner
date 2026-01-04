import "@testing-library/jest-dom/vitest";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      {
        id: "a1",
        groupId: "123",
        startDate: "2025-07-01",
        endDate: "2025-07-03",
      },
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
  let fetchMock: Mock<[string, RequestInit?], Promise<Response>>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE" && url.includes("/api/availabilities/")) {
        return mockResponse({}, 204);
      }

      if (url.includes("availability-summary"))
        return mockResponse(summaryResponse);
      if (url.includes("member-availabilities"))
        return mockResponse(memberAvailabilityResponse);
      if (url.endsWith("/availabilities")) return mockResponse([]);
      if (/\/api\/groups\/.+/.test(url))
        return mockResponse({ name: "Sommertrip" });
      return mockResponse({}, 404);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders summary rows with counts", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/groups/123"]}>
        <Routes>
          <Route
            path="/groups/:groupId"
            element={
              <GroupDetailPage
                identity={{
                  kind: "user",
                  userId: "u1",
                  displayName: "You",
                  accessToken: "token",
                }}
                groups={[
                  {
                    groupId: "123",
                    name: "Sommertrip",
                    role: "owner",
                    inviteLink: "",
                  },
                ]}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/3 von 5 Mitgliedern verfügbar/)
      ).toBeInTheDocument();
    });

    // Expand the collapsed list to reveal additional intervals
    const expandButton = screen.getByRole("button", {
      name: /Weitere Zeiträume/i,
    });
    await user.click(expandButton);

    expect(
      screen.getByText(/2 von 5 Mitgliedern verfügbar/)
    ).toBeInTheDocument();
  });

  it("allows deleting own availability from detail modal", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/groups/123"]}>
        <Routes>
          <Route
            path="/groups/:groupId"
            element={
              <GroupDetailPage
                identity={{
                  kind: "user",
                  userId: "u1",
                  displayName: "You",
                  accessToken: "token",
                }}
                groups={[
                  {
                    groupId: "123",
                    name: "Sommertrip",
                    role: "owner",
                    inviteLink: "",
                  },
                ]}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Expand member card
    const memberButton = await screen.findByRole("button", { name: /You/i });
    await user.click(memberButton);

    // Open availability detail modal
    const availabilityButton = await screen.findByRole("button", {
      name: /01\. Juli 2025/i,
    });
    await user.click(availabilityButton);

    expect(
      screen.getByRole("dialog", { name: /Verfügbarkeit/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Löschen/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Löschen/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Verfügbarkeit/i })
      ).not.toBeInTheDocument();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/api/availabilities/a1") &&
          init?.method === "DELETE"
      )
    ).toBe(true);
  });
});
