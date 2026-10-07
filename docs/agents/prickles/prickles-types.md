# Prickles canon · Types & Schema pillar · v2.0

The 4 Types & Schema tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles T1: Domain-Driven Types

Brand the primitives. A user ID is not a string. An email is not a string. A UUID is not a string. Wrap each domain primitive in a typed brand the compiler enforces, so passing a BookingId where a UserId is expected fails at compile time.

If two values of the same primitive type can never be assigned to each other in the domain, give them different types. Internal IDs and external Stripe IDs are not interchangeable. Cents and pounds are not the same number; ISO-8601 strings and unix timestamps are not the same date.

Model invalid states out of existence. Prefer a discriminated union with one tag per legal state to a flag-soup of optional booleans. If a hedgehog can be both isHibernating: true and isFeeding: true, the type is wrong.

Validators sit at boundaries, not throughout the codebase. Parse once at the edge (JSON.parse, route input, external API response) then trust the type for the rest of the call. Parse, do not validate.

When a function takes more than two parameters of the same primitive type, introduce domain types or a parameter object. transfer(from: string, to: string, amount: number) is a bug waiting to happen. transfer(from: AccountId, to: AccountId, amount: Money) removes the entire class.

## Prickles T2: No Escape Hatches

Forbid the four escape hatches by default: `any`, `unknown` without narrowing, `as` casts on anything other than `as const`, and `@ts-ignore` / `@ts-expect-error`.

Narrow exceptions, written down in the commit message, not in a code comment: test setups that mock framework internals or system boundaries. Legacy third-party shapes that genuinely cannot be modelled. Mocked edges where the test is the contract.

Where `unknown` enters the system from outside the type graph (JSON parsing, `localStorage`, `postMessage`, route input, error catch), narrow with a guard before the value flows further.

Prefer `@ts-expect-error` over `@ts-ignore`. The former errors when the bug is fixed. The latter rots silently.

Refuse to satisfy a type checker by silencing it. If the linter trips, fix the type, write the guard, or model the boundary.

## Prickles T3: Type Guards

Where data crosses a runtime boundary (`JSON.parse`, `localStorage`, `postMessage`, route input, error catch, library boundary), validate the shape with a guard before the value flows further.

Prefer user-defined type predicates (`x is Foo`), discriminated-union narrowing, and schema-driven guards (Zod, Valibot, io-ts) over `as` casts.

Use `switch` on a discriminator with an exhaustive `default: assertNever(x)` so the compiler enforces full case coverage.

If you must write `as`, prefer rewriting the surrounding code so the compiler can prove the type itself. TypeScript 4.4 control-flow analysis and 5.5 inferred predicates eliminate most legacy uses.

The guard is the runtime contract. The compile-time type lives or dies by what the guard accepts.

## Prickles T4: Schema Sovereignty

Each schema has exactly one owning application. That application is the only writer. Everyone else reads through a defined contract.

Schema changes go out as migrations from the owning application's repository. No DBA-side ALTER, no shared-schema convenience.

External tools (analytics, replication, BI) read from their own tables, materialised views, or replicas: never the canonical write tables.

The directory layout mirrors the schema. `db/<context>/` ↔ `<context>` schema. The same vocabulary runs from the table to the type to the function name.

Cross-context reads go through an Anti-Corruption Layer. Cross-context writes are forbidden. The boundary is a published contract, not a JOIN.
