# Data Sourcing

## Current state

The intended primary source is `samolet.ru`, because it is the official product catalog and contains:

- project names
- locations
- construction status
- completion / settlement dates

## Current blocker

From the current execution environment, the site is protected by `Qrator`.

Observed behavior:

- `curl` returns a Qrator challenge page
- Playwright headless receives `HTTP 403`
- direct sitemap fetches do not expose a usable project list

This means fully automated ingestion from this environment is currently blocked by anti-bot protection, not by repository code.

## What is already prepared

- `playwright` is installed in the repo
- `scripts/samolet/check-access.mjs` verifies whether a given page is accessible

Example:

```bash
node scripts/samolet/check-access.mjs https://samolet.ru/novostroyki/sputnik/
```

## Recommended next paths

### Path 1: Interactive browser-assisted capture

Use a real browser session on the user's machine, then export or save the project pages / JSON responses.

Best when:

- the site is accessible in the user's normal browser
- anti-bot blocks automation but not a human session

### Path 2: Manual seed from official pages

Create a curated JSON seed with:

- project name
- slug / URL
- city / district
- lat / lng
- construction status
- completion date

This seed can then power the catalog until a stable automated source is found.

### Path 3: Alternative official / quasi-official sources

If `samolet.ru` remains blocked, use alternative structured sources for:

- project registry
- project status
- completion dates

Then keep `samolet.ru` URLs only as canonical project links.

## Current implementation

The repository currently uses a curated seed from `Novostroy.ru` for Samolet projects in Moscow and Moscow Oblast:

- seed file: `data/seeds/projects.moscow-mo.json`
- repository loader: `apps/api/src/modules/projects/projects.repository.ts`

This is a temporary but working source for MVP development until an official automated feed is available.

## Engineering implication

The repository should treat catalog ingestion as a separate pipeline from search and ranking.

That allows the product to move forward even if the official site requires a semi-manual import step.
