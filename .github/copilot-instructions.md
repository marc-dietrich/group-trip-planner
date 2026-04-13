# Group Trip Planner - AI Instructions

## 1. Project Stack & Architecture

- **Structure**: Monorepo (`/apps/` for applications, `/packages/` for shared libraries).
- **Backend**: Python + FastAPI + SQLModel (Pydantic + SQLAlchemy) + PostgreSQL.
- **Frontend**: React + Vite + TypeScript + shadcn UI + Zustand.
- **Patterns**: Business logic in service layers, async/await for DB, and Zustand for state (no prop-drilling).

## 2. Core Behavioral Directives

- **Think Before Coding**: Explicitly state assumptions. If a task is ambiguous or has multiple interpretations, ask for clarification before writing code.
- **Simplicity First**: Write the minimum code required to solve the specific problem. No speculative abstractions, "future-proofing," or unrequested configurability.
- **Surgical Changes**: Touch only what is necessary. Match existing code style, formatting, and naming conventions exactly.
- **Clean as You Go**: Remove imports, variables, or functions that YOUR changes made unused. Do not touch pre-existing dead code.
- **Plan Verification**: For complex tasks, state a brief $[Step] \rightarrow [Verify]$ plan before implementation.

## 3. Domain-Specific Logic

- **Scheduling Algorithm**: Prioritize accuracy in date/time overlap calculations. Use timezone-aware `datetime` objects.
- **Data Models**:
  - **Group**: Core collection of participants/preferences.
  - **Availability**: Individual date ranges provided by users.
  - **Optimal Periods**: System-calculated best windows.
- **Scope Control**: Focus strictly on scheduling and group coordination. Do not suggest or implement Authentication, Payments, or Chat features.

## 4. Technical Guardrails

- **Frontend**: Maintain TypeScript strict mode. Use shadcn UI components for all interface elements.
- **Backend**: Use FastAPI dependency injection for services. Ensure all API endpoints are RESTful and microservice-ready.
- **Performance**: For overlap algorithms, consider time complexity. If a calculation is $O(n^2)$ or worse, flag it for optimization.

## 5. Definition of Done

1. The code solves the user's specific request and nothing else.
2. Every changed line traces directly to the prompt.
3. The implementation is verified to work within the existing monorepo structure.
4. No unnecessary abstractions or Phase 2 features were introduced.

## Behavioral Guidelines (Caution Over Speed)

- **Think Before Coding**: Don't assume. Surface tradeoffs. State assumptions explicitly. If uncertain or if multiple interpretations exist, ask before implementing. If a simpler approach exists, push back and suggest it.
- **Simplicity First**: Minimum code to solve the problem. No speculative features, unrequested abstractions, or "flexibility" that wasn't asked for. If 200 lines can be 50, rewrite it. No error handling for impossible scenarios.
- **Surgical Changes**: Touch only what you must. Match existing style/formatting exactly. Do not refactor adjacent code that isn't broken. If you notice unrelated dead code, mention it—don't delete it.
- **Clean Your Own Mess**: Remove imports, variables, or functions that YOUR changes made unused. Do not remove pre-existing dead code unless asked. Every changed line must trace directly to the request.
- **Goal-Driven Execution**: Transform tasks into verifiable goals. For multi-step tasks, state a brief plan:
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
