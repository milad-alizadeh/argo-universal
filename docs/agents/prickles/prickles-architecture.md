# Prickles canon · Architecture pillar · v2.0

The 11 Architecture tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles A1: Screaming Architecture

The top-level folder structure is the architecture diagram. Read your `ls` aloud: it should name what the system does, not which framework it runs on.

Top-level folders name domains (orders, billing, identity, scheduling), not framework artefacts (controllers, models, views, services). Framework files live one level down, inside the domain folder they serve.

Cross-domain imports are linted, not encouraged. Two domains share a contract by going through a published interface, never by reaching into each other's internals.

Refuse to add a folder that names a framework concept at the top level. If you would add `controllers/` or `models/`, name the domain instead and put those files inside it.

## Prickles A2: Three-Tier Hoisting

Default to local. A new helper lives next to the consumer until a second consumer earns the move.

On the third repeat, hoist. To `lib/generic/` if the file would compile after `npm publish` with no edits. To `lib/product/` if it still names a Tenet, a Pillar, or any other word from the product's ubiquitous language.

Imports flow upward only. A module may import from `product/` and `generic/`; `product/` may import from `generic/`; `generic/` imports neither. Reverse the direction and the build fails.

If the abstraction's shape is unclear after two uses, leave it duplicated for one more iteration. Premature hoisting costs more than the duplication it would eliminate.

## Prickles A3: Stable Dependencies Principle

Volatile depends on stable, never the reverse. Read every import edge as an arrow. Arrows must point from less-stable code toward more-stable code.

Stability is countable: I = Ce / (Ca + Ce). High-I files are leaves (depend on lots, depended on by few). Low-I files are roots. Imports must point from high-I toward low-I.

Pair SDP with the Stable Abstractions Principle (SAP): the most-stable packages must also be the most abstract. Otherwise the stable parts of the system become the rigid parts.

Refuse to grow a stable file with an import on a volatile one. If you would, invert the dependency through an interface or move the volatile thing into a less-stable tier.

## Prickles A4: Common Closure Principle

Code that changes for the same reason belongs in the same component. Code that changes for different reasons belongs in different components. Group by axis of change.

A component should have one reason to change. When a single component starts appearing in PRs for two unrelated requirements, split it.

CCP is the SRP for components. Don't group by category (controllers, services, models). Group by what changes together (orders, billing, identity).

Wait for the third change-together signal before forcing the group. The wrong package boundary is more expensive than the duplication it would have eliminated.

## Prickles A5: Thin Handlers

Every system has a boundary: HTTP, queue, CLI, websocket, Server Action. The handler at that boundary parses input, dispatches one call, returns a response. Nothing else.

Business rules, branching, persistence, side-effects belong one ring inward, in functions that don't import the framework. The handler imports the function. The function does not import the handler.

When the transport changes (HTTP becomes a job, REST becomes RPC), the domain function does not move. Only the handler does.

Refuse to add an `if` in a handler that decides anything beyond input shape. If you would, push the decision into the function the handler calls.

## Prickles A6: Bounded Contexts

Each context gets one model and one folder. Each bounded context is a top-level folder. Cross-context imports are linted, not encouraged.

No shared types across contexts. Each context owns its own `User`, `Order`, `Customer`: the same word may mean different things in different folders and that's the design.

Cross-context use goes through one named Anti-Corruption Layer per pair of contexts. Translation lives in the ACL adapter. Nowhere else does the translation.

Refuse to reach across a context boundary directly. If you would, write the ACL or move the type into the calling context's vocabulary.

## Prickles A7: Coupling First

Pick the architecture with the weaker coupling. Layers, patterns, frameworks are all proxies. The metric is coupling.

Read every diff through Page-Jones's connascence ladder. Static is safer than dynamic, name is safer than type, type is safer than meaning. Position is the smell that wants to become a parameter object.

Apply the rule of locality literally. The same coupling that is fine inside one file is a disaster across module boundaries. Across services it is a distributed monolith.

Refuse to merge a refactor that climbs the ladder upward (toward dynamic, away from static) without an explicit reason that the work cannot be done another way.

## Prickles A8: Push to the Source of Truth

Push the work toward the source of truth. The component that owns the data runs the logic. Every other layer is a transport.

On the web: Server Components by default. `'use client'` is the explicit opt-in. Validation, authorisation and rendering live next to the database.

On native: bundle the UI in the binary, fetch only data. Server-Driven UI is a deliberate opt-in with documented downsides. The default is the inverse of the web default.

Opt outward (toward the client, the edge, the consumer) only when latency, privacy, or autonomy demand it. The exceptions are finite and named.

## Prickles A9: Liskov Substitution Principle

A subtype must work wherever its supertype is promised. No surprise throws. No weakened guarantees.

Three reads on every override. Preconditions: the subtype accepts at least every input the parent accepts. Postconditions: the subtype guarantees at least every output the parent guarantees. Invariants: the subtype keeps the parent's promised states honest.

Read every `extends` and `implements` in the diff with the substitution question. If you cannot replace the parent with the child at every call site without breaking the caller, the inheritance is wrong.

Refuse to merge a subtype that throws what the parent didn't, or that returns the parent's promised type as optional, or that mutates state the parent declared invariant. The compiler may accept it. The contract does not.

## Prickles A10: Interface Segregation Principle

Build interfaces around clients, not implementations. No caller depends on operations it never uses.

When two consumers of one interface have disjoint method needs, split the interface into two role-specific interfaces. Several narrow types beat one wide role.

In structural-typing languages, prefer per-callsite narrowing (`Pick<User, 'id' | 'name'>` over `User`) when the function only reads the smaller shape.

Bounce a parameter type wider than the function reads. Bounce a base class with methods only some subclasses honour. Bounce a God-interface that two consumers reach into for opposite reasons.

## Prickles A11: Dependency Inversion Principle

Depend on abstractions. High-level policy doesn't depend on volatile detail. Both hinge on a stable abstraction.

Concrete adapters sit at the edges. The domain at the centre talks only to interfaces. The integrations live where they belong: at the boundary.

Apply the rule where volatility lives. Invert the database, the email provider and the third-party API client. Leave stable utilities, time and console output alone unless tests need a fake.

Refuse a constructor that takes a concrete service when a contract would do. Refuse a `new SmtpClient()` in domain code. Refuse an import that points inward.
