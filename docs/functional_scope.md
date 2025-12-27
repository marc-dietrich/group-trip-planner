# Group Vacation Planner – Functional Scope (v0.1)

## 1. Purpose & Vision

The application enables small groups of people to collaboratively find a suitable vacation period.

Key principles:

- Low friction to get started
- No mandatory account creation in early phases
- Shareable, link-based collaboration
- Clear separation between "Group management" and "Vacation planning"

---

## 2. User & Access Model

### 2.1 Access Philosophy

The app should support **multiple levels of identity**, not all requiring full authentication.

Planned access types:

1. **Anonymous / Link-based access (Phase 1)**

   - Users access groups via invite links
   - User identity is stored locally (e.g. browser storage)
   - No passwords, no email required
   - Identity is scoped to the group

2. **Authenticated users (later phase)**
   - Optional login (email / OAuth)
   - Ability to claim previously created anonymous groups
   - Persistent identity across devices

> Phase 1 focuses on minimizing friction and avoiding forced login.

---

### 2.2 Local User Identity (Phase 1)

- On first interaction, the frontend creates a local user identity:
  - `displayName`
  - `localUserId` (UUID)
- Stored in:
  - `localStorage` or `indexedDB`
- Used to:
  - Identify the user within groups
  - Associate availability inputs

---

## 3. Core Domain Concepts

### 3.1 Group

A **Group** represents a set of people planning a vacation together.

**Responsibilities:**

- Holds members
- Acts as the container for vacation planning sessions

**Core properties:**

- `id`
- `name`
- `createdAt`
- `createdBy`

**Group membership:**

- A group has multiple members
- A member has:
  - `displayName`
  - `role` (e.g. creator, member)

---

### 3.2 Group Creation Flow

Expected flow:

1. User opens the app
2. User creates a new group
3. Group creator receives:
   - A shareable invite link
4. Other users can join the group via the link

---

### 3.3 Invites & Joining

- Invite links:
  - Contain a group identifier
  - May optionally expire (later)
- When joining:
  - User chooses a display name
  - User becomes a group member
  - Identity is stored locally

---

## 4. Vacation Planning

### 4.1 Planning Session

A **Vacation Planning Session** is started within a group.

**Responsibilities:**

- Define a potential date range
- Collect availability from participants
- Compute best matching time windows

**Core properties:**

- `id`
- `groupId`
- `dateRangeStart`
- `dateRangeEnd`
- `createdAt`
- `status` (open / closed)

---

### 4.2 Availability Input

Each group member can:

- Mark availability within the defined range
- Submit:
  - Available dates
  - Optionally unavailable dates

Rules:

- Each member can only submit once per planning session
- Edits are allowed while the session is open

---

### 4.3 Result Calculation

The system computes:

- Time windows with maximum overlap
- Optional ranking:
  - All available
  - Most available
  - Partial availability

No decision enforcement — the app only **supports decision-making**, it does not decide.

---

## 5. Frontend Expectations

### 5.1 Main Views

Planned views:

- Landing / Entry
- Group creation
- Group overview
- Planning session creation
- Availability input
- Results overview

---

### 5.2 Frontend Responsibilities

- Manage local user identity
- Store temporary state
- Handle invite links
- Display group and planning data
- Gracefully handle missing login

---

## 6. Backend Responsibilities

- Persist groups, members, planning sessions
- Validate access via group membership
- Provide computation logic for results
- Stay stateless regarding frontend identity storage

---

## 7. Out of Scope (for now)

- Payments
- Budget management
- Destinations & activities
- Chat / messaging
- Notifications
- User profiles beyond display name

---

## 8. Open Decisions / Future Phases

- Transition from anonymous to authenticated users
- Ownership transfer when logging in
- Group privacy controls
- Multi-planning sessions per group
- Mobile-first optimizations

---

## 9. Non-Goals

- Enforcing final decisions
- Replacing messaging apps
- Heavy social features
