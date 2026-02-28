import "@testing-library/jest-dom/vitest";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { GroupDetailPage } from "./GroupDetailPage";

const summaryResponse = [
  { from: "2025-07-01", to: "2025-07-03", availableCount: 3, totalMembers: 5 },
  { from: "2025-07-05", to: "2025-07-06", availableCount: 2, totalMembers: 5 },
];

const memberAvailabilityResponse = [
  {
    memberId: "m1",
    actorId: "actor-1",
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
    actorId: "actor-2",
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
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalError = console.error;

  const renderPage = async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={["/groups/123"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/groups/:groupId"
              element={
                <GroupDetailPage
                  identity={{
                    kind: "user",
                    actorId: "actor-1",
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
        </MemoryRouter>,
      );
    });

    // Ensure async effects settle to avoid act warnings
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  };

  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args) => {
        const [first] = args;
        if (typeof first === "string" && first.includes("not wrapped in act")) {
          return;
        }
        return originalError(...args);
      });

    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE" && url.includes("/api/availabilities/")) {
        return mockResponse({}, 204);
      }

      if (url.includes("availability-summary"))
        return mockResponse(summaryResponse);
      if (url.includes("member-availabilities"))
        return mockResponse(memberAvailabilityResponse);
      if (url.includes("availability-stats"))
        return mockResponse({
          totalUsers: 5,
          usersWithAvailability: 1,
          progress: 0.2,
        });
      if (url.endsWith("/availabilities")) return mockResponse([]);
      if (/\/api\/groups\/.+/.test(url))
        return mockResponse({ name: "Sommertrip" });
      return mockResponse({}, 404);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("shows best interval and other intervals", async () => {
    await renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/3 von 5 Personen verfügbar/i),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Bester Zeitraum/i).length).toBeGreaterThan(0);

    const expandButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(expandButton);

    expect(screen.getByText(/2\/5 verfügbar/i)).toBeInTheDocument();
  });

  it("renders member list and new availability action", async () => {
    await renderPage();

    expect(await screen.findByText(/You/)).toBeInTheDocument();
    expect(screen.getByText(/Alex/)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /Neue Verfügbarkeit/i }),
    ).toBeInTheDocument();
  });
});
