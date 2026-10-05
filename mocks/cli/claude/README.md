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
- A control request gets the first answer the recording holds for its subtype. Without one, `initialize` gets an answer with no commands, agents or models, and any other request gets an error.
- A `result` frame ends a Turn. A recording without one is a single Turn.
- In a recording that was interrupted, the mock holds the rest of the Turn until an `interrupt` arrives.
- A prompt past the last recorded Turn gets an error `result`, so it never looks like a crash.

`writeClaudeTranscript` writes the transcript that a resume looks up, and returns the `CLAUDE_CONFIG_DIR` that points to it. `../index.ts` lists this mock under the adapter's id.

## Recordings

`recordings/` holds one `<claude-cli version>` folder. `<name>.jsonl` holds stdout frames, one per line. A `.json` recording carries `producer`, `version`, `recordedAt` and the frames in `payload`. The payload is a list of stdout frames, or `{input, output}` with both pipes, where `input` is what the SDK wrote to stdin.

| Recording | What it holds |
|---|---|
| `task-plan` | A Turn of TaskCreate and TaskUpdate calls |
| `text-stream` | Streamed text deltas |
| `lifecycle` | Hook and `command_lifecycle` frames |
| `edit-and-command` | Both pipes of a Turn with a summarised thought, Write, Read, Edit, Bash and an answer, then `get_context_usage` |
| `interrupt` | Both pipes of a Turn interrupted during a Bash call, which ends `aborted_tools` |

`edit-and-command` and `interrupt` were recorded from claude-cli 2.1.286 through the Agent SDK on 2026-10-05, with account, paths and process ids replaced. The first three come from old Argo (claude-cli 2.1.286). None of them has a `system/init` or `result` frame, so the mock writes its own around each Turn. The recordings that spec 0003 lists under Testing Decisions replace them.
