# App E2E uses shared Argo fixtures at the Agent adapter port

App E2E injects the existing mock Agent adapter with one set of owned Argo product-state fixtures, preserving the real App, tRPC, Engine, Session, Feed and SQLite (owner, 2026-10-08). This supersedes ADR-0011’s CLI-only E2E boundary: maintaining another provider protocol implementation in each mock CLI made fast provider updates expensive. The one shared Agent machine and adapter methods in ADR-0015 stay unchanged.

Provider contract tests remain separate: representative provider-owned responses pass through the real adapter and are compared with independent expected Argo events. Updating SDK or generated protocol types alone does not prove translation semantics. App fixtures describe observable product behavior; they need no provider recording refresh. Existing CLI helpers remain only where provider contract tests or asset generators still consume them, until those consumers migrate in a separate change.

The E2E Engine bootstrap lives outside production source and supplies fixture adapters from the registered Agent identities and metadata. Both App targets use isolated real storage and shared fixtures, with zero retries; they invoke no provider CLI or SDK query. The desktop App connects to that Engine rather than exercising the production Supervisor startup path, which retains its own composition tests.
