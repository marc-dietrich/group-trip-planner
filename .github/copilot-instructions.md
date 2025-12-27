# Group Trip Planner - Copilot Instructions

## Project Overview

This is a monorepo for a German group trip planning application. The goal is to help friend groups find optimal travel dates by collecting availability inputs and calculating the best time windows.

## Architecture & Structure

- **Monorepo Structure**: `/apps/` for applications, `/packages/` for shared libraries
- **Backend**: Python + FastAPI with REST API (microservice-ready architecture)
- **Frontend**: React + Vite + TypeScript with shadcn UI components
- **Database**: PostgreSQL with SQLModel ORM
- **State Management**: Zustand for frontend state

## Key Project Constraints

- **Phase 1 Scope**: Focus ONLY on group creation, date range definition, availability input, and optimal timeframe calculation
- **Explicitly Out of Scope**: Authentication, payments, activity planning, chat features

## Development Patterns

### Frontend Patterns

- TypeScript strict mode enabled
- shadcn UI for consistent component library
- Zustand stores for state management (avoid prop drilling)
- Vite for fast development and builds

### Backend Patterns

- SQLModel for database models (Pydantic + SQLAlchemy)
- FastAPI dependency injection for services
- Async/await patterns for database operations
- PostgreSQL as primary database

## Critical Development Workflows

### Code Organization

- Business logic in FastAPI service layers
- Database models using SQLModel
- Frontend state in Zustand stores

## Domain-Specific Considerations

### Date/Time Handling

- Complex timezone and date range calculations
- Availability overlap algorithms (Python datetime/pandas useful)

### Core Data Models

- **Group**: Collection of participants and date preferences
- **Availability**: Individual participant date ranges
- **Optimal Periods**: System-calculated best time windows

## Integration Points

- No external auth providers in Phase 1
- No payment processing integrations
- Focus on core scheduling algorithm accuracy
- REST API design should be microservice-ready

When implementing features, prioritize the core scheduling functionality and avoid feature creep beyond Phase 1 scope.
