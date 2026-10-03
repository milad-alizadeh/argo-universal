# Contracts derive from the database schema

The Drizzle tables in `@argo/db/schema` are the one source of truth for every shape that a table holds, including the enums its columns use. `@argo/contracts` derives those Zod schemas with `drizzle-orm/zod` and adds only the fields that the API adds, so a field is written once. This reverses the first design, where `db` imported `contracts`.

## Consequences

- `@argo/db/schema` imports only `drizzle-orm`, never `node:sqlite` or other Node APIs, because the App bundles it through `contracts`.
- `db` never imports `contracts`. The Server, which imports both, validates JSON payload columns with `contracts` schemas on write and on read.
- Shapes with no table behind them, such as the Session update payloads and `server.json`, are still written by hand in `contracts`.
