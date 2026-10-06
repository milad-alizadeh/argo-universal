# Mock Claude CLI

A stand-in `claude` that the Agent SDK drives over stream-json. Each prompt replays the next Turn of one recording.

```ts
import { writeMockClaude } from '@repo/mocks/cli/claude/write-mock-claude';

const claude = await writeMockClaude(directory, { recording: 'task-plan' });
// Stands in for an Agent crash: exits with code 1 after the Turn's first recorded frame.
const crashing = await writeMockClaude(directory, { recording: 'task-plan', exitMidTurn: true });
```

- `--version` prints the version of the recordings folder.
- Frames carry the session id from `--session-id` or `--resume`, else the recording's own.
- A control request gets the first answer the recording holds for its subtype. Without one, `initialize` gets an answer with no commands, agents or models and a subscription account, and any other request gets an error.
- A `result` frame ends a Turn. A recording without one is a single Turn.
- In a recording that was interrupted, the mock holds the rest of the Turn until an `interrupt` arrives.
- A prompt past the last recorded Turn gets an error `result`, so it never looks like a crash.

`writeClaudeTranscript` writes the transcript that a resume looks up, and returns the `CLAUDE_CONFIG_DIR` that points to it. `../index.ts` lists this mock under the adapter's id.

## Recordings

`recordings/` holds one `<claude-cli version>` folder. `<name>.jsonl` holds stdout frames, one per line. A `.json` recording carries `producer`, `version`, `recordedAt` and the frames in `payload`. The payload is a list of stdout frames, or `{input, output}` with both pipes, where `input` is what the SDK wrote to stdin.

| Recording | What it holds |
|---|---|
| `session-title` | A generated `ai-title` transcript record, then a host rename with `session_title_changed` and a `custom-title` record |
| `task-plan` | A Turn of TaskCreate and TaskUpdate calls |
| `text-stream` | Streamed text deltas |
| `lifecycle` | Hook and `command_lifecycle` frames |
| `edit-and-command` | Both pipes of a Turn with a summarised thought, Write, Read, Edit, Bash and an answer, then `get_context_usage` |
| `interrupt` | Both pipes of a Turn interrupted during a Bash call, which ends `aborted_tools` |
| `compaction` | A short Turn followed by `/compact`: compacting status, success status and compact boundary |
| `markdown-answer` | Both pipes of a Turn with no tools that streams a markdown answer: heading, inline code, link, numbered list, code block and table |

`edit-and-command` and `interrupt` were recorded from claude-cli 2.1.286 through the Agent SDK on 2026-10-05, with account, paths and process ids replaced. The first three come from old Argo (claude-cli 2.1.286). None of them has a `system/init` or `result` frame, so the mock writes its own around each Turn. The recordings that spec 0003 lists under Testing Decisions replace them.

`compaction` was captured through the Agent SDK using the installed 2.1.286 executable on 2026-10-06. A new temporary Checkout received a short shape-color note before `/compact`. The capture keeps SDK conversation and Compaction messages; catalog, account and rate-limit frames are excluded, and paths are normalized. The success status precedes the compact boundary, and both update the same Compaction started by the compacting status.

`markdown-answer` was captured from the installed 2.1.286 executable over stream-json on 2026-10-06, with partial messages, no MCP servers and project settings only. Catalog, account, `system/init` and rate-limit frames are excluded, and paths are normalized.

Feed mocks are generated from these recordings through `toAgentEvents` and the real Feed change validator. Each mock's first `user_message` comes from the recording's own prompt through the Server's `userMessageChange`. Regenerate with `pnpm --filter @repo/server exec tsx ../../tools/generate-feed-mocks.mts`, then format `packages/api/mocks/feed-recordings.json` with Biome.

## New Session mocks

`writeMockClaude(directory, { recording: 'image-prompt', availability })` accepts `available`, `not_installed` and `not_signed_in`. The absent variant removes the executable from that mock PATH directory and returns its missing path. The unsigned variant answers `initialize` with an account that has no subscription, which the adapter refuses (ADR-0004). Tests must put only the mock directory on PATH for an absent Agent.

`image-prompt` was captured from the real CLI on 2026-10-05. Its input includes the 32 × 32 red PNG in `../red-square.png`, and its output identifies the color. The temporary Checkout path and user home are replaced by `/repo` and `/user`; the account is replaced by a Claude Max account with no email or organization. It records image handling by the CLI; the Server's upload and prompt conversion remain issue #41.

`new-session.ts` takes representatives of distinct effort sets from the recorded catalog and runs the real config-option converter. Shared Storybook mocks use neutral Agent and model identities. Regenerate them from the repo root with `pnpm --filter @repo/server exec tsx ../../tools/generate-new-session-mocks.mts`.

`session-title` was captured from the installed 2.1.286 executable on 2026-10-06 in a temporary Checkout. After a short Turn, a `generate_session_title` control request with `persist: true` produced the title and saved an `ai-title` transcript record, without a title-change stream event. Resuming that Session and sending `rename_session` with `source: host` emitted `system/session_title_changed` and saved a `custom-title` record. The recording keeps the control inputs, their responses, the event and both title records; conversation and account frames are excluded. The installed SDK does not expose this title event in its `SDKMessage` types. Issue #66 owns passing titles through and reading the transcript fallback.

Regenerate the neutral Agent title mock with `pnpm --filter @repo/server exec tsx ../../tools/generate-session-title-mocks.mts`. `sessionTitleMocks` combines it with prompt, user and long-title states for both Agents.

## Answering request recordings

`permission`, `elicitation`, `plan-approved` and `plan-kept-planning` were captured from the real CLI on 2026-10-06 in temporary Checkouts. They keep both the requests and the replies that answered them. Checkout and home paths are normalized to `/repo` and `/user`; account and startup catalog traffic are excluded.

The capture uses claude-cli 2.1.286 over stream-json. `Write` asks for Permission, `AskUserQuestion` asks for a color, and `ExitPlanMode` carries the markdown proposal. Approve allows the request; Keep planning denies it with recorded feedback. The latter recording includes a revised proposal after the feedback.

`request-answer.ts` reads the real replies. The pure Agent converters map the requests and Plan rows. Shared pending and answered mocks are built through those converters and the Server's Feed validator, with a deterministic Session request id and clock. Answered states show the continuing Turn, including the Permission outcome or Plan outcome and any feedback a person typed. Server issues #57 and #58 wire these procedures to live Sessions.

Regenerate with `pnpm --filter @repo/server exec tsx ../../tools/generate-request-mocks.mts`, then format `packages/api/mocks/request-recordings.json` with Biome. Shared mocks are exported as `recordedRequestMocks` from `@repo/api/mocks` for the request cards.
