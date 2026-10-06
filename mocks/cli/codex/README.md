# Mock Codex CLI

A stand-in `codex` whose `app-server` speaks JSON-RPC over stdio. Each `turn/start` replays the next Turn of one recording.

```ts
import { writeMockCodex } from '@repo/mocks/cli/codex/write-mock-codex';

const codex = await writeMockCodex(directory, { recording: 'file-change' });
// Stands in for an Agent crash: exits with code 1 right after the Turn's `turn/started`.
const crashing = await writeMockCodex(directory, { recording: 'file-change', exitMidTurn: true });
```

- `--version` prints the version of the recordings folder.
- The mock answers `initialize`, `model/list`, `thread/start` and `turn/start`. It rejects any other method, such as `turn/interrupt`, with `-32601`.
- `thread/start` answers with the recording's thread id only.
- A `turn/completed` message ends a Turn. A `turn/start` past the last recorded Turn gets a `-32603` error.

## Recordings

`recordings/` holds one `<codex-app-server version>` folder. Each `<name>.json` carries `producer`, `version`, `recordedAt` and a `payload` of `messages`. The mock drops each message's `emittedAtMs`, which the recorder added.

| Recording | What it holds |
|---|---|
| `reply` | A Turn with one Agent message |
| `file-change` | A Turn with a file change and streamed Agent message deltas |
| `model-list` | The `model/list` answer, read when a caller asks |
| `compaction` | A short Turn followed by `thread/compact/start`, with a context Compaction start and completion |
| `markdown-answer` | A Turn with no tools that streams a markdown answer: heading, inline code, link, numbered list, code block and table |

These come from old Argo (codex-app-server 0.157.0). The recordings that spec 0003 lists under Testing Decisions join them.

`compaction` was captured from the real 0.157.0 app-server on 2026-10-06. A new temporary Checkout received a short shape-color note before `thread/compact/start`. The capture keeps Turn, item, text delta and usage notifications; account, hook and environment startup traffic are excluded, and paths are normalized. Compaction starts its own Turn and keeps one item id from start to completion.

`markdown-answer` was captured from the real 0.157.0 app-server on 2026-10-06 with the catalog default model. It keeps the Turn's notifications from `turn/started` on; hook, MCP startup, account and warning traffic are excluded, and paths are normalized.

Feed mocks are generated from these recordings through `toAgentEvents` and the real Feed change validator. Each mock's first `user_message` comes from the recording's own prompt through the Server's `userMessageChange`. Regenerate with `pnpm --filter @repo/server exec tsx ../../tools/generate-feed-mocks.mts`, then format `packages/api/mocks/feed-recordings.json` with Biome.

`edit-and-command.json` and `interrupt.json` were recorded from the real 0.157.0 app-server on 2026-10-05. The first changes `app.txt`, creates `notes.md`, prints the files and answers `done`. The second interrupts `sleep 30` after its command starts. The catalog default model was selected because the user's configured default was unavailable to the account. The app-server emitted no reasoning items in these captures, even with high effort and detailed summaries; the converter's thought tests use protocol-shaped examples at the same pure-function seam.

The temporary Checkout path is normalized to `/repo` and the user home to `/user`; capture timestamps are retained in recordings and removed for replay. The mock holds an interrupted recording at the command start until `turn/interrupt` arrives. `write-transcript.ts` gives `thread/resume` the saved identity to check and lets the composition tests cover a missing transcript.

## New Session mocks

`writeMockCodex(directory, { recording: 'image-prompt', availability })` accepts `available`, `not_installed` and `not_signed_in`. The absent variant removes the executable from that mock PATH directory and returns its missing path. The unsigned variant answers the protocol's authentication boundary with a sign-in failure. Tests must put only the mock directory on PATH for an absent Agent.

`image-prompt` was captured from the real CLI on 2026-10-05. Its input includes the 32 × 32 red PNG in `../red-square.png`, and its output identifies the color. The temporary Checkout path and user home are replaced by `/repo` and `/user`; account details and email addresses are removed. It records image handling by the CLI; the Server's upload and prompt conversion remain issue #41.

`new-session.ts` takes representatives of distinct effort sets from the recorded catalog and runs the real config-option converter. Shared Storybook mocks use neutral Agent and model identities. Regenerate them from the repo root with `pnpm --filter @repo/server exec tsx ../../tools/generate-new-session-mocks.mts`.

`command-outcomes` was captured from the real 0.157.0 app-server on 2026-10-06 in an empty temporary Checkout. It prints five lines in a successful command, then five lines in a command that intentionally exits with code 2. Turn, item, output, and usage notifications retain their receipt times; startup and account traffic are omitted, and paths are normalized to `/repo` and `/user`. These outcomes supply the command-row Storybook fixtures through the same real converter and Feed validator.
`edit-states` was captured from the real 0.157.0 app-server on 2026-10-06 in a temporary Checkout. One patch replaces 60 lines in `large.txt` and deletes the three-line `legacy.txt`. It keeps Turn and item notifications, normalizes the Checkout and user paths, and excludes startup and account traffic. These recordings supply issue #50’s large and deleted-file states.

`edit-failure` was captured from the real 0.157.0 app-server on 2026-10-06 in a temporary Checkout. It attempts one valid patch against a read-only file, records the write failure without retrying, and normalizes paths as above. It supplies the failed Edit row through the real converter and Feed validator.
