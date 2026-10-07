# Prickles canon · AI Collaboration pillar · v2.0

The 6 AI Collaboration tenets of the Prickles canon. Apply them whenever you write or review code in this repository. Each tenet's full entry, with its evidence, is on https://prickles.org.

## Prickles AI1: The Intern Pattern

Treat the agent as an over-eager intern. Run the loop in four moves: plan, approve, execute, review. Skip a move and you produce plausible wrongness at machine speed.

Plan before you type. Use Plan Mode (Claude Code), spec-first prompts (Cursor), or a written outline checked into the PR description. The plan names files, decisions and the verification step.

Approve in writing. The plan is a contract. Approval is the gate. No edits until a human (or the orchestrator agent) signs off.

Execute in small, reviewable units. The agent runs the plan. The next gate is the review pass.

Review every change. The agent grades its own work first (see AI6 Self-Review Pass). Humans grade the result. Both gates close before merge.

## Prickles AI2: Persistent Brief

The agent's brief lives in the repo rather than in the prompt. Anything you would say twice belongs in a file the model loads on every session.

AGENTS.md is the cross-tool standard (Linux Foundation, 60k+ projects). CLAUDE.md, `.cursor/rules/`, `.clinerules`, `.github/copilot-instructions.md`, and `CONVENTIONS.md` are the surface-specific equivalents: pick the right file for your tool.

The brief contains pointers, not snippets. Anthropic's own guidance: target under 200 lines, prefer references to copies, anything that drifts is debt.

Treat the brief as code. Version it, lint it, review it on PRs that touch it. The brief is the contract between humans and agents. If it is wrong on main, every session is wrong.

## Prickles AI3: Working Context

Treat the agent's context window as a precious, finite resource: Anthropic's own phrase. Context is not free. Tokens that crowd the model degrade its work.

Compact, clear, or fork when the context starts working against you. Long sessions accumulate poisoning, distraction, confusion, and clash (Breunig's four failure modes). The fix is to manage the surface, not to power through.

Bring tools to the agent (MCP-first). Don't context-switch the agent out of its surface. If it can't see the result, it can't reason about it.

Subagents are the modern session boundary. Long-running, large-output, parallel work belongs in a subagent with its own isolated context: only the relevant summary returns to the orchestrator.

## Prickles AI4: Verifiable Specs

Spec-Driven Development is the lineage. Karpathy's Software 2.0 / 3.0 idea and GitHub's spec-kit converge on one rule: specifications turn from passive documentation into executable contracts that constrain what AI agents generate.

If the agent cannot grade itself against the spec, the spec is vapour. Acceptance criteria the AI can run beat acceptance criteria the AI can interpret.

Pick a machine-readable encoding: Gherkin, contract tests, type signatures, schema validators, executable checklists. Aspirational prose loses to ambiguity at machine speed.

P2 says read the spec; AI4 says write it in a form the agent can grade. The two together make the spec executable, not aspirational.

## Prickles AI5: Verify the API

Knowledge cutoff is structural, not incidental. The model's mental model of every framework, library, and SDK is bounded by its training date.

Don't trust the training. Look up the docs, grep the source, query the MCP, then write the call. Grounding wins over recall on every API older than the cutoff.

Hallucinated APIs are the canonical AI failure mode in code. The fix is documented, well-named (Documentation Augmented Generation), and works.

Treat the agent's first plausible API call as a draft. Verify against current source before letting it go out. The most likely token reflects the training and the training is stale.

## Prickles AI6: Self-Review Pass

Draft first, then critique what you drafted, then fix it. The model can draft. The model also has to grade what it drafted before handing back. Reflexion + Self-Refine + CRITIC + Anthropic's evaluator-optimizer.

Pure introspection isn't enough: Huang et al. 2024. Ground the self-review in tests, docs, types and the persistent brief. Introspection without external grounding can decrease accuracy.

Every change opens its own self-PR. The agent reviews against the brief, the verifiable spec and the test runner before declaring done. The human reviews after.

The author edits last. AI prose, AI plans, AI schemas: all drafts. The final edit is human. The brand voice and the editorial responsibility do not delegate.
