# Samolyot Finder

MVP monorepo for a conversational real estate search product focused on Samolet Group projects in Moscow and the Moscow region.

## Product idea

The interface combines:

- a Google-like search/chat input
- structured recommendation results
- project-level travel-time matching
- explainable ranking

The system recommends residential complexes first, then shows available flats inside the selected project.

## Repository layout

```text
samolyot-finder/
  apps/
    web/                  Next.js frontend
    api/                  Nest-style backend skeleton
  packages/
    shared-types/         Shared domain contracts
    scoring-core/         Deterministic ranking logic
    prompt-templates/     Prompt and response templates
  docs/
    architecture.md
    database.md
    request-flow.md
```

## MVP scope

- Search only across Samolet projects
- Geography limited to Moscow and Moscow Oblast
- Catalog currently works on the project level only
- Chat used for parsing, clarifications, and explanations
- Deterministic ranking used for filtering and recommendation
- Initial project seed is based on `Novostroy.ru` project pages for Samolet in Moscow and Moscow Oblast

## Planned stack

- `Next.js` + `TypeScript` for the web app
- `NestJS` + `TypeScript` for the API
- `PostgreSQL` for catalog data
- `Redis` for session and geo cache

## Start points

- Frontend shell: `apps/web`
- Backend API skeleton: `apps/api`
- Shared contracts: `packages/shared-types`
- Ranking logic: `packages/scoring-core`
- Architecture notes: `docs/`
- Data source notes: `docs/data-sourcing.md`
- Browser extraction notes: `docs/browser-extraction.md`

This repository is intentionally bootstrapped as a code-first skeleton so the next iteration can focus on real integrations and UI behavior.
