# Contracts derive from the database schema

The Drizzle tables in `@repo/db/schema` are the one source of truth for every shape a table holds, including its column enums. `@repo/contracts` derives those Zod schemas with `drizzle-orm/zod` and adds only the API's own fields, so a field is written once. This reverses the first design, where `db` imported `contracts`.

## Consequences

- `@repo/db/schema` imports only `drizzle-orm`, never `node:sqlite` or other Node APIs, because the App bundles it through `contracts`.
- `db` never imports `contracts`. The Server, which imports both, validates JSON payload columns with `contracts` schemas on write and on read.
- Shapes with no table, such as the Session update payloads and `server.json`, stay hand-written in `contracts`.
- Every field that mirrors a column, in any schema, takes it from `src/columns.ts`, one `createSelectSchema` per table.
- Schemas check types and shapes, not ranges or lengths: the Server wrote the values, and a bad id fails its lookup. A check stays only for a rule nothing else enforces, such as the `feed.page` limit and a non-empty prompt.
