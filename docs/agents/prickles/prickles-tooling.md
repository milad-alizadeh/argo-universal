# Prickles canon · Tooling pillar · v2.0

The 2 Tooling tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles TA1: Linter as Law

Every quality gate is an error, never a warning. A warning gets ignored within a sprint. An error stops the build.

Encode the limit before the violation. Line count, complexity, parameter count, file size, equality, return annotations, type-file naming, barrel files, import direction: all in `eslint.config.mjs` or its language equivalent.

When the linter trips, fix the code. Never disable the rule inline. The disable comment is the bug. The rule is doing its job.

Where the linter cannot reach (pattern misuse, naming taste, decomposition judgement) culture, agent rules, code review, and test shapes take the load. Name that boundary so nobody pretends the gate is the ceiling.

## Prickles TA2: Duplication Detection

Run jscpd in CI for every commit. Threshold zero on greenfield code. Directory-scoped overrides for legacy zones with a paydown plan.

Run a structural pass with Semgrep or ast-grep on a weekly schedule. The AST tools reach Type-2 reliably and meaningful Type-3.

Run an LLM duplication-review pass on the change set during AI review. The model catches Type-4 (semantically equivalent, syntactically different) clones that no deterministic tool can.

Detection is not extraction. The tool flags the duplicate. The engineer extracts on the second occurrence (F3 DRY). Don't wait for three.
