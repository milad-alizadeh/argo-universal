# Drizzle with `node:sqlite`

Research for `packages/db` and the Server worker in `docs/specs/0001-scaffold.md` sections 2, 3, 4, 5, 7 and 10, and `docs/adr/0002` and `docs/adr/0005`. Checked on 2026-10-03.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry, `drizzle-orm` | https://www.npmjs.com/package/drizzle-orm (via `npm view drizzle-orm dist-tags` and `time`) | Newest rc, dist-tags, publish dates, peer dependencies |
| S2 | npm registry, `drizzle-kit` | https://www.npmjs.com/package/drizzle-kit (via `npm view drizzle-kit dist-tags` and `time`) | Newest rc, dist-tags, publish dates |
| S3 | GitHub release `v1.0.0-rc.4` | https://github.com/drizzle-team/drizzle-orm/releases/tag/v1.0.0-rc.4 | SQLite async/sync split, `--output json`, non-interactive mode |
| S4 | GitHub releases list | https://github.com/drizzle-team/drizzle-orm/releases | rc.4 is the newest rc release |
| S5 | Drizzle docs, Node SQLite | https://orm.drizzle.team/docs/connect-node-sqlite | Install command, `drizzle(...)` forms, async and sync query API |
| S6 | Drizzle docs, Upgrade to v1 | https://orm.drizzle.team/docs/upgrade-v1 | `@rc` install, folder-per-migration, `drizzle-kit up` |
| S7 | Drizzle docs, v0 to v1 changes | https://orm.drizzle.team/docs/v0-v1-changes | Casing moved to `snakeCase.table`, validators moved into `drizzle-orm/zod` |
| S8 | Drizzle docs, `drizzle-kit generate` | https://orm.drizzle.team/docs/drizzle-kit-generate | Output folders, `--name`, `--custom`, `--config` |
| S9 | Drizzle docs, Schema declaration | https://orm.drizzle.team/docs/sql-schema-declaration | `snakeCase.table` |
| S10 | Drizzle docs, SQLite column types | https://orm.drizzle.team/docs/column-types/sqlite | `text({ mode: 'json' })`, `$type` has no runtime check, integer timestamp modes |
| S11 | Drizzle docs, Zod | https://orm.drizzle.team/docs/zod | `drizzle-orm/zod`, `createSelectSchema`, refinements |
| S12 | `drizzle-orm@1.0.0-rc.4` package source (installed) | https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-orm/src (read from `node_modules/drizzle-orm/node-sqlite/*.d.ts`, `migrator.js`, `migrator.utils.js`, `sqlite-core/*.d.ts`, `version.js`) | Exact `drizzle`, `migrate`, `primaryKey`, `index`, `snakeCase` APIs; migration reader and runner |
| S13 | `drizzle-kit@1.0.0-rc.4` package (installed) | https://www.npmjs.com/package/drizzle-kit (read `index.d.ts`, `bin.cjs`, `skills/drizzle-generate/SKILL.md`, `drizzle-kit generate --help`) | `defineConfig` type, CLI flags, ORM version check, non-TTY behaviour |
| S14 | Node.js 24 docs, SQLite | https://nodejs.org/docs/latest-v24.x/api/sqlite.html | Stability 1.2 (release candidate), no flag, `DatabaseSync` options |
| S15 | pnpm docs, Build settings | https://pnpm.io/settings/build | `allowBuilds`, `strictDepBuilds`, `ERR_PNPM_IGNORED_BUILDS` |
| S16 | Turborepo docs, Configuration reference | https://turborepo.dev/docs/reference/configuration | `interactive` needs `persistent` |
| S17 | Reference implementation (read only) | `~/Developer/argo/apps/desktop/src/database/`, `~/Developer/argo/apps/desktop/drizzle.config.ts` | How Argo opens the database, sets pragmas, migrates, and lays out schema |
| S18 | Local experiments (this research) | `/private/tmp/claude-501/drizzle-rc/` and `/private/tmp/claude-501/drizzle-ws/` (not in repo) | Ran rc.4 on Node 24.21.0 with tsx, TypeScript 7.0.2, pnpm 9.15.4 and pnpm 12.8.1 |

## Versions

Checked 2026-10-03.

| Package | Version to use | Published | Source |
|---|---|---|---|
| `drizzle-orm` | `1.0.0-rc.4` (dist-tag `rc`) | 2026-06-27 | S1, S4 |
| `drizzle-kit` | `1.0.0-rc.4` (dist-tag `rc`) | 2026-06-27 | S2, S4 |
| `zod` (peer of `drizzle-orm/zod`) | `^3.25.0 \|\| ^4.0.0` accepted | | S1 |

- `latest` is still the 0.x line (`drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11). The 1.0 line is only on the `rc` and `beta` tags. (S1, S2)
- A dist-tag `rc5` exists, but it points to `1.0.0-rc.5-5935859`, a commit build. There is no `1.0.0-rc.5` release. Other tags (`rc4`, `ai`, `postgres`, and more) are also commit builds. (S1, S2, S4)
- **The two versions must match in practice.** `drizzle-kit` imports `drizzle-orm/version` and fails unless `compatibilityVersion` equals its `requiredApiVersion` (both are `14` in rc.4). It reports `orm_too_old`, `kit_outdated`, or `orm_missing`. (S12, S13)
- `drizzle-kit --version` prints both: `drizzle-kit: v1.0.0-rc.4`, `drizzle-orm: v1.0.0-rc.4`. (S18)

## Install command

The docs give (S5, S6):

```bash
pnpm add drizzle-orm@rc
pnpm add -D drizzle-kit@rc
```

For this repo, pin exact versions in the catalog instead of `@rc` or a caret range (see Gotchas):

```yaml
# pnpm-workspace.yaml
catalog:
  drizzle-orm: 1.0.0-rc.4
  drizzle-kit: 1.0.0-rc.4
```

```bash
pnpm --filter @repo/db add drizzle-orm@catalog:
pnpm --filter @repo/db add -D drizzle-kit@catalog:
```

`node:sqlite` is built into Node and needs no install. (S14)

## Generator command and its prompts

Drizzle has no project generator. Its official generator is `drizzle-kit generate`, which writes migrations from the schema. You write the schema and `drizzle.config.ts` by hand. (S8, S13)

```bash
# in packages/db
pnpm exec drizzle-kit generate --name init
```

- Default config path: `drizzle.config.ts` in the current folder. Override with `--config`. (S8, S13)
- Flags in rc.4: `--config`, `--dialect`, `--driver`, `--schema`, `--out`, `--name`, `--breakpoints`, `--custom` (empty migration for hand SQL), `--ignore-conflicts`, `--explain` (dry run), `--output text|json`, `--hints`, `--hints-file`. (S13)
- Without `--name`, the folder gets a random name such as `20242409125510_premium_mister_fear`. (S8)
- When the schema has not changed it prints "No schema changes, nothing to migrate" and writes nothing. (S18)
- **Prompts.** It asks only when a diff is ambiguous, for example "rename or create" when a column or table name changes. With `--output text` it prompts only if stdin is a TTY. With no TTY, or with `--output json`, it never prompts: it prints the unresolved decisions and exits with code 2. You then re-run with `--hints '<json>'`. (S3, S13, S18)
- A first migration on an empty folder has nothing to rename, so it does not prompt. (S18)

Output observed for a table with a composite primary key and two indexes (S18):

```
drizzle/
  20261003014633_init/
    migration.sql
    snapshot.json
```

```sql
CREATE TABLE `feed_row` (
	`session_id` text NOT NULL,
	...
	CONSTRAINT `feed_row_pk` PRIMARY KEY(`session_id`, `position`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_row_session_id` ON `feed_row` (`session_id`,`id`);--> statement-breakpoint
CREATE INDEX `feed_row_session_revision` ON `feed_row` (`session_id`,`revision`);
```

## Recommended configuration

### `packages/db/drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle',
})
```

- `dialect: 'sqlite'` with no `driver`. The `driver` field for SQLite only takes `d1-http`, `expo`, `durable-sqlite`, or `sqlite-cloud`; none applies to `node:sqlite`. (S13)
- `dbCredentials: { url }` is only needed for `push`, `pull`, `studio`, and similar commands that connect to a database. `generate` works without it. (S13, S18)
- `schema` takes a path, a glob, or an array of paths. Argo lists one file per table. (S13, S17)
- `out` defaults to `drizzle`. (S8)
- There is no `casing` key in the rc.4 `Config` type, and a `casing: 'snake_case'` key there is silently ignored. Casing is set on each table (below). (S7, S13, S18)

### Schema (`drizzle-orm/sqlite-core`)

```ts
import type { FeedRowPayload } from '@repo/contracts'
import { index, integer, primaryKey, snakeCase, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const feedRow = snakeCase.table(
  'feed_row',
  {
    sessionId: text().notNull(),
    position: integer().notNull(),
    id: text().notNull(),
    payload: text({ mode: 'json' }).$type<FeedRowPayload>().notNull(),
    revision: integer().notNull(),
    createdAt: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.position] }),
    uniqueIndex('feed_row_session_id').on(table.sessionId, table.id),
    index('feed_row_session_revision').on(table.sessionId, table.revision),
  ],
)
```

- The third argument returns an **array**. The object form is marked `@deprecated`. (S12)
- `primaryKey({ name?, columns: [...] })` is the current form. The spread form `primaryKey(a, b)` is `@deprecated`. The generated constraint is named `<table>_pk`. (S12, S18)
- `index(name)` and `uniqueIndex(name)` both need a name, then `.on(...columns)`. (S12)
- `snakeCase.table` (and `camelCase.table`) replaces the old global `casing` option. Keys stay camelCase in TypeScript and become snake_case in SQL. Plain `sqliteTable` keeps the key as the column name, so `sessionId` stays `sessionId` in SQL. (S7, S9, S18)
- `text({ mode: 'json' })` stores `JSON.stringify` output and parses on read. Drizzle recommends `text` JSON over `blob` JSON because SQLite JSON functions reject BLOBs. (S10, S18)
- `$type<T>()` only changes the TypeScript type. It does not check values at runtime. (S10)
- Timestamps: `integer({ mode: 'timestamp_ms' })` reads and writes `Date` and stores milliseconds; `{ mode: 'timestamp' }` stores seconds; plain `integer()` stores a number. (S10, S12, S18) Argo uses plain `integer` milliseconds with a SQL default `CAST(unixepoch('subsec') * 1000 AS INTEGER)`. (S17)
- Foreign keys: `text().references(() => session.id, { onDelete: 'cascade' })`. `node:sqlite` enables foreign key enforcement by default (`enableForeignKeyConstraints: true`). (S14, S17)

### Opening the database and migrating (Server worker)

```ts
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

export function openDatabase(filePath: string) {
  const client = new DatabaseSync(filePath, { timeout: 5000 })
  client.exec('PRAGMA journal_mode = WAL')
  const database = drizzle({ client })
  migrate(database, { migrationsFolder })
  return database
}
```

- `drizzle()` accepts `()` (in-memory), `(path)`, `(path, config)`, `({ connection: path | { path, ...DatabaseSyncOptions }, ...config })`, or `({ client: DatabaseSync, ...config })`. The return value has `$client`. (S5, S12)
- Config options are `logger`, `relations`, `jit`, `cache`. There is no `schema` or `casing` option. (S7, S12)
- Pass your own `DatabaseSync` (the `client` form) so you can set pragmas before the first query. (S5, S17)
- `migrate(db, { migrationsFolder, migrationsTable? })` from `drizzle-orm/node-sqlite/migrator` is **synchronous**. It returns `void`. (S12)
- Queries work both ways: `await db.select().from(t)` or sync `db.select().from(t).all()` / `.get()` / `.run()` / `.values()`. Transactions on this driver are sync, and an async callback is a type error. (S5, S12)
- `PRAGMA journal_mode = WAL` through `exec` works; `client.prepare('PRAGMA journal_mode = WAL').get()` returns `{ journal_mode: 'wal' }`. (S14, S18)
- Busy timeout: the `DatabaseSync` option `timeout` (default `0`) sets it. Argo uses `PRAGMA busy_timeout = 5000` instead. (S14, S17)
- Argo resolves the folder from `process.cwd()`. Using `import.meta.url` makes it independent of the folder the Server starts in. (S17)

### Zod (`drizzle-orm/zod`)

```ts
import { createSelectSchema } from 'drizzle-orm/zod'
import { feedRowPayloadSchema } from '@repo/contracts'

export const feedRowSelectSchema = createSelectSchema(feedRow, { payload: feedRowPayloadSchema })
```

- In 1.0 the validators live in `drizzle-orm/zod` (also `/valibot`, `/typebox`, `/arktype`). `drizzle-zod` still works but gets no new updates. (S7, S11)
- Functions: `createSelectSchema`, `createInsertSchema`, `createUpdateSchema`, `createSchemaFactory`. The second argument refines or replaces a field. (S11)
- A JSON column without a refinement accepts any JSON value (it accepted `42`). Pass the `contracts` schema as shown so the spec's "validate on write and on read" holds. (S18)
- `zod` is an optional peer dependency of `drizzle-orm`. (S1)

### Runtime: `node:sqlite` on Node 24 under tsx

- Node 24 docs mark `node:sqlite` as Stability 1.2, release candidate, since v24.15.0. It needs no flag since v22.13.0 / v23.4.0. (S14)
- On Node 24.21.0, `require('node:sqlite')` and a full tsx run (open, WAL, migrate, insert, select) printed no `ExperimentalWarning`. (S18)
- `drizzle-orm/node-sqlite` imports `node:sqlite` at module load, so importing it on a Node without `node:sqlite` fails at import time. (S12)
- tsx runs the ESM TypeScript directly; the test code also type-checked with TypeScript 7.0.2 and `moduleResolution: NodeNext`. (S18)

## pnpm + Turborepo monorepo specifics

- Put `drizzle-orm` in `dependencies` and `drizzle-kit` in `devDependencies` of `@repo/db`, both from the catalog. (S5, S17)
- `drizzle-kit` loads `drizzle.config.ts` and the schema through `jiti`, not tsx. A schema that imports a type from a workspace package (`import type { Payload } from '@repo/contracts'`, exported as `./src/index.ts`) generated fine under pnpm. (S13, S18)
- `drizzle-kit` resolves `drizzle-orm/version` from its own location. pnpm's default hidden hoisting (`node_modules/.pnpm/node_modules`) made this work in a workspace test with pnpm 9.15.4 and 12.8.1. (S13, S18)
- **esbuild build script.** `drizzle-kit` depends on `esbuild`, which has a `postinstall` script. With pnpm 10.3 or newer, `strictDepBuilds` is `true` by default, and `pnpm install` failed with `ERR_PNPM_IGNORED_BUILDS` (exit 1) on pnpm 12.8.1. Record a decision in `pnpm-workspace.yaml`. `drizzle-kit generate` worked with the script not run, so `false` is enough: (S15, S18)

  ```yaml
  allowBuilds:
    esbuild: false
  ```

- pnpm resolved the optional `zod` peer of `drizzle-orm` from the workspace (`drizzle-orm@1.0.0-rc.4_zod@4.6.5`) even though `@repo/db` did not list `zod`. (S18)
- **Run `db:generate` outside Turborepo**, or keep in mind it cannot prompt there. A Turborepo task accepts stdin only when `interactive: true`, which must be used with `persistent`. Without a TTY, `drizzle-kit generate` exits 2 on any rename question. A root script `pnpm --filter @repo/db db:generate` keeps the TTY. (S13, S16, S18)
- `generate` is not a cacheable build step: it writes new files from the schema. Do not add it to a cached Turborepo pipeline. (S8, S16)

## Gotchas

- **Caret ranges pull commit builds.** `^1.0.0-rc.4` matches `1.0.0-rc.5-5935859` and other commit builds, because they sort higher than `rc.4`. Argo's `apps/desktop` has `^1.0.0-rc.4` and actually installed `drizzle-orm@1.0.0-rc.5-ab785fc` next to `drizzle-kit@1.0.0-rc.4`. Pin exact versions. (S1, S17, S18)
- **Old migration folders are rejected.** If `<out>/meta/_journal.json` exists, the migrator throws and tells you to run `drizzle-kit up`. 1.0 uses one folder per migration, `<14-digit timestamp>_<name>/migration.sql` plus `snapshot.json`. (S6, S7, S12) The `drizzle-migrations` skill shipped inside `drizzle-kit` rc.4 still mentions `meta/<n>_snapshot.json`, which does not match what rc.4 writes. (S13, S18)
- **Migrations are tracked by folder name.** The migrator records each folder name in `__drizzle_migrations` and runs only folders whose name is not there. Editing an applied `migration.sql` does nothing on databases that already ran it. All pending migrations run inside one `BEGIN` / `COMMIT`. (S12)
- **Statements split on `--> statement-breakpoint`.** Hand-written SQL in a `--custom` migration must keep that marker between statements. (S12, S18)
- **`casing` moved.** `drizzle({ casing })` and a config `casing` key are gone; use `snakeCase.table`. (S7, S13, S18)
- **Relational queries v1 is removed for SQLite.** Use `defineRelations()` and pass `relations` to `drizzle()`. (S3, S7, S12)
- **SQLite alters rebuild tables.** Most column changes generate a copy-swap-drop of the table, and adding a `NOT NULL` column can ask to delete rows with nulls. Read each generated SQL file. (S13)
- **`$type` and JSON are unchecked.** Validate JSON columns with the `contracts` schema on write and read, as the spec requires. (S10, S18)
- **Set WAL before migrating.** Run the pragma on the raw `DatabaseSync` before `drizzle()` and `migrate()`, as Argo does, so every open, including a fresh test file under `ARGO_HOME`, gets it. (S17, S18)
