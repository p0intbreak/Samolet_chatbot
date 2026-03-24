# Architecture

## Goal

Build a conversational real estate recommendation product for Samolet Group projects in Moscow and Moscow Oblast.

## Core principles

- Search operates on the project level first, not on the flat level
- Chat is an orchestration layer, not the source of truth
- Geo is a supporting fact provider, not the ranking engine
- Ranking remains deterministic and explainable

## High-level modules

### Web app

- Google-like query input
- Conversation pane
- Recommendation cards
- Filters and preference chips
- Map and travel-time context

### API

- `chat`: parse user text into structured preferences
- `search`: coordinate the recommendation flow
- `projects`: provide residential complex data
- `geo`: geocoding, route lookup, and cache
- `ranking`: deterministic scoring
- `leads`: booking and contact submission
- `analytics`: query and conversion tracking

### Data layer

- PostgreSQL for projects, flats, and lead data
- Redis for session state and route cache

## Bounded context split

### Chat

Responsible for:

- query understanding
- missing-data clarifications
- human-readable explanations

Not responsible for:

- filtering projects
- computing travel times
- deciding ranking scores

### Geo

Responsible for:

- address normalization
- geocoding
- project-level travel time lookup
- route cache

### Ranking

Responsible for:

- hard filters
- weighted scoring
- sort order
- explainability metadata

## MVP deployment shape

- `apps/web`: Next.js frontend
- `apps/api`: API service
- PostgreSQL
- Redis

This is enough for the first working version. Service extraction can happen later if traffic or organizational needs require it.

