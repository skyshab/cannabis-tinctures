# Cannabis Tinctures

A local-first web app for planning, costing, saving, and revising cannabis tincture recipes.

The app is designed around small-batch tincture planning, especially 30ml bottles with 1ml doses. It tracks ingredient products, compound profiles, recipe targets, calculated ingredient amounts, carrier oil fill, and per-bottle/per-dose costs.

## What It Does

- Manage ingredient products with costs, purchase amounts, units, potency profiles, and notes.
- Model ingredients that contribute multiple compounds, such as full-spectrum distillate or RSO.
- Create and save tincture recipes with editable bottle size, dose size, target compounds, ingredients, and notes.
- Calculate per-bottle active targets, compound contributions, remaining deficits, overages, carrier oil volume, and recipe costs.
- Store local data in SQLite through a small Fastify backend.

## Tech Stack

- React + TypeScript + Vite client
- Fastify + SQLite backend
- Shared TypeScript package for domain types and calculations
- npm workspaces
- Node 22 LTS

## Repository Layout

```text
client/   React/Vite UI
server/   Fastify API, SQLite repository, migrations
shared/   Shared types and calculation logic
docs/     Project decisions and implementation notes
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development app:

```bash
npm run dev
```

The dev command starts the shared package watcher, backend, and Vite client together. The backend defaults to port `3000`; the client runs on the Vite dev port shown in the terminal.

Build everything:

```bash
npm run build
```

Start the built backend:

```bash
npm start
```

When `client/dist` exists, the Fastify server serves the built React app from the backend.

## Useful Scripts

```bash
npm run dev        # run shared, server, and client in development mode
npm run build      # build shared, client, and server
npm run start      # start the built server
npm run test       # run shared calculation tests
npm run typecheck  # typecheck all workspaces
```

## Local Data

SQLite data is stored locally and ignored by Git:

```text
data/*.sqlite
data/*.sqlite-*
```

Migrations live in `server/migrations/` and seed the initial schema, ingredient data, recipe data, recipe categories, and app branding.

## Scope Notes

This project is for personal recipe planning and recordkeeping. It does not provide medical advice, treatment recommendations, legal advice, or dosage guidance.

For more context, see:

- `docs/v1-decisions.md`
- `hemp_project_README.md`
- `blend_recipes.md`
- `ingredient_details.md`
