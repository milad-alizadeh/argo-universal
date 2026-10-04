# Mock Claude CLI

A stand-in `claude` that the Agent SDK drives over stream-json. Each prompt replays the next Turn of one recording.

```ts
import { writeMockClaude } from '@repo/mocks/cli/claude/write-mock-claude';

const claude = await writeMockClaude(directory, { recording: 'task-plan' });
// Stands in for an Agent crash: exits with code 1 after the Turn's first recorded frame.
const crashing = await writeMockClaude(directory, { recording: 'task-plan', exitMidTurn: true });
```

- `--version` prints the version of the recordings folder.
- The mock answers `initialize` with no commands, agents or models. It acknowledges every other control request.
- A `result` frame ends a Turn. A recording without one is a single Turn.

## Recordings

`recordings/<claude-cli version>/<name>.jsonl` holds stdout frames, one per line. A `.json` recording carries `producer`, `version`, `recordedAt` and the frames in `payload`.

| Recording | What it holds |
|---|---|
| `task-plan` | A Turn of TaskCreate and TaskUpdate calls |
| `text-stream` | Streamed text deltas |
| `lifecycle` | Hook and `command_lifecycle` frames |

These come from old Argo (claude-cli 2.1.286). None of them has a `system/init` or `result` frame, so the mock writes its own around each Turn. The recordings that spec 0003 lists under Testing Decisions replace them.
