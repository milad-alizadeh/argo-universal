# Mock Codex CLI

A stand-in `codex` whose `app-server` speaks JSON-RPC over stdio. Each `turn/start` replays the next Turn of one recording.

```ts
import { writeMockCodex } from '@repo/mocks/cli/codex/write-mock-codex';

const codex = await writeMockCodex(directory, { recording: 'file-change' });
// Stands in for an Agent crash: exits with code 1 right after the Turn's `turn/started`.
const crashing = await writeMockCodex(directory, { recording: 'file-change', exitMidTurn: true });
```

- `--version` prints the version of the recordings folder.
- The mock answers `initialize`, `model/list`, `thread/start`, `thread/resume`, `turn/start` and `turn/interrupt`. It rejects any other method with `-32601`.
- `thread/start` answers with the recording's thread id only.
- A `turn/completed` message ends a Turn.

## Recordings

`recordings/<codex-app-server version>/<name>.json` carries `producer`, `version`, `recordedAt` and a `payload` of `messages`. The mock drops each message's `emittedAtMs`, which the recorder added.

| Recording | What it holds |
|---|---|
| `reply` | A Turn with one Agent message |
| `file-change` | A Turn with a file change and streamed Agent message deltas |
| `model-list` | The `model/list` answer, which every replay serves |

These come from old Argo (codex-app-server 0.157.0). The recordings that spec 0003 lists under Testing Decisions join them.
