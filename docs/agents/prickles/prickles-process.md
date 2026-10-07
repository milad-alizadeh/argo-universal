# Prickles canon · Process pillar · v2.0

The 7 Process tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles P1: Test-First Development

Write the failing test before the implementation. Watch it fail for the reason you predicted. Then write the smallest code that makes it green.

In typed languages, the type is the first test. Define the signature, leave the body as a hole, let the compiler reject the inconsistencies the unit test would have caught, then write the test for the residue.

Test the public contract rather than the internals. The unit's contract is the test's contract. Mock cascades through private collaborators are the smell, not the rule.

Beck's exceptions still apply: spikes, throwaway demos, declarative config, and generated code are tested via the surrounding code, not as units in their own right.

## Prickles P2: Spec-First Execution

Read the brief twice. Write the AC as bullets a reviewer can verify as met or unmet, not “works correctly” but “rejects an empty cart with 400 and the message cart cannot be empty”.

Walk the AC past the product owner and the QA in a five-minute Three Amigos. Capture what survives the conversation. Discard what doesn't.

Refuse to start coding until the AC is written. Refuse to merge until the AC is verified.

Pair Spec-First with AI4 Verifiable Specs: write the AC in a form a machine can grade, Gherkin, type, contract, schema. Aspirational prose loses to the agent at machine speed.

## Prickles P3: Definition of Done

Done means the checklist passed. Coverage, lint, type-check, format, dup-check, AC verification, accessibility: every row machine-checked, every row signed off.

The list is the gate and never a guideline. The moment a row is treated as advisory, the row is dead.

Revisit the list every quarter. Remove rows that haven't caught anything. Add rows that catch failures the team is paying for.

The AC at the end is the AC at the start (P2 Spec-First). Without P2's AC, the DoD has nothing to verify against.

## Prickles P4: Continuous Quality Feedback

Lint while you write. Type-check on save. Run the test against the file you just edited. Pre-push gates close the loop.

Every check that catches an error in PR review should run in the editor or pre-push first. The cost of catching it later is exponential.

Tune the latency, don't fragment attention: lint server runs on save, not on every keystroke. The test runner watches the file you saved, not the whole suite.

For agents: configure the eslint MCP, the type-check MCP and the test runner so the agent grounds every change in tool feedback before declaring it done.

## Prickles P5: Shift-Left Quality

Move every check earlier in the SDLC. From QA into PR. From PR into CI. From CI into the editor.

Accessibility, security, performance, observability: all in the gate, all run while the change is fresh.

Shift-left without team capability is blame transfer. Pair the move with training, tooling and an actionable signal the engineer can fix in the editor.

For agents: configure the a11y MCP, the security MCP and the perf-budget script so the model grounds every change in the same shift-left signals the human gets.

## Prickles P6: Leave it Better Than You Found it

Tidy the line you touched. The unit is small: rename one variable, split one function, delete one dead import. The trigger is incidental: tidy only the file you opened to change.

Tidy in a separate commit. Beck's Tidy First rule: structural change and behaviour change belong in different commits, possibly different PRs.

Don't refactor what you can't test. A green suite is a refactoring licence. Without one, the cleanup is walking a tightrope without a net.

Don't let the cleanup grow into a yak shave. Fowler's “opportunistic refactoring” warning: every cleanup reveals another. Use good judgment on when to stop.

## Prickles P7: Short-Lived Branches with AI+Human Review

Trunk is `main`, and `main` is always shippable. Cut a branch for a single piece of work, keep it under a day where you can.

Open a PR. Request the AI review first. Address what it flags. Ask a human reviewer for the second pass.

Human reviewers verify two things the AI can't: the architecture the AI couldn't see, and whether AI4 Verifiable Specs was satisfied, the AC was machine-checkable, the test verified it, the code passed both.

Use feature flags or branch-by-abstraction whenever the work is bigger than a branch can carry. Never use a branch as a substitute for releasing.
