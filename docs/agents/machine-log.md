# Read machine events in development

For reconnect timing, Server startup, or Engine restart bugs, enable the machine event log before starting the processes:

```sh
ARGO_MACHINE_LOG=1 EXPO_PUBLIC_ARGO_MACHINE_LOG=1 pnpm dev
```

Both switches are off by default, including in `pnpm dev`. Only the value `1` enables them. `ARGO_MACHINE_LOG` controls Node processes; `EXPO_PUBLIC_ARGO_MACHINE_LOG` controls the App on web, iOS, Android, and in the Electron renderer. Restart the processes after changing a switch and reload the App. The Expo switch must be a direct `process.env.EXPO_PUBLIC_ARGO_MACHINE_LOG` access so Metro can inline it.

Node logging is disabled with `NODE_ENV=production`, and the packaged desktop app disables it regardless of the switch. The App requires `__DEV__`, so production exports never log machine events. The Supervisor passes its environment to the Engine, and Electron passes its environment to a Supervisor it starts. A Supervisor already running keeps its original environment; restart it to change its switch.

## Where to look

Node processes append JSON lines to these files under `ARGO_HOME` (default `~/.argo`):

| Process | File |
| --- | --- |
| Electron main | `logs/desktop.machines.jsonl` |
| Supervisor | `logs/supervisor.machines.jsonl` |
| Engine | `logs/engine.machines.jsonl` |

```sh
tail -f "${ARGO_HOME:-$HOME/.argo}"/logs/*.machines.jsonl
```

Read the App's JSON strings through browser console tools on web or in the Electron renderer, and through Metro's console on a phone. App records stay in the console; they are not forwarded to the Server. Existing `supervisor.log` and `engine.log` operational messages continue independently of this switch.

## Line format

Each record has `timestamp` (UTC ISO time), `processName`, `actorId`, `actorSessionId`, `rootId`, `type`, `eventType`, `sourceActorId`, `sourceActorSessionId`, `value`, `status`, and `context`. Node records also have `processId`. Use the process identity and `rootId` to group an actor system; actor ids alone can repeat across systems and process restarts.

The observer keeps `@xstate.actor`, `@xstate.event`, and `@xstate.snapshot`, including events from invoked and spawned actors. It drops microsteps and actions. Only snapshot records carry `value`, `status`, and `context`; those fields are `null` on creation and event records. `eventType` is `null` for actor creation. Event records name the recipient in `actorId`, and the sender in `sourceActorId` when XState supplies it. Event payloads are not logged.

```json
{"timestamp":"2026-10-03T12:00:00.000Z","processName":"app","actorId":"x:0","actorSessionId":"x:0","rootId":"x:0","type":"@xstate.snapshot","eventType":"connection.opened","sourceActorId":null,"sourceActorSessionId":null,"value":{"link":"open","attempt":"idle"},"status":"active","context":{"attempts":0}}
```

Context cleaning keeps finite numbers, strings, booleans, null, arrays, and plain objects recursively. It omits class instances (including QueryClient and the WebSocket client), actor refs, functions, undefined values, bigints, symbols, nonfinite numbers, accessors, and circular references. Omitted array entries become `null`, preserving their positions. Shared plain objects can appear more than once. Getters and custom serializers are never called. Plain context strings remain visible, so use the log as local development output.

File writes are synchronous to preserve the last records when a process exits. If serialization or a log write fails, that observer reports one error and disables itself; the machine keeps running. Files append across restarts and are not rotated automatically.

## Adding machines

Attach the observer in the root `createActor` options before starting the actor. Children of an observed root are covered automatically. A new independent root needs its own observer. `@repo/machine-log` is portable and accepts a line writer; `@repo/machine-log/node` provides Node files and inspection. `@repo/machine-log/browser` combines App console logging with browser inspection and selects a console-only implementation on native platforms. Keep Node imports out of the App bundle.

## Live diagrams

Start the App, Server, Electron shell, and official Stately inspector together:

```sh
pnpm dev:inspect
```

This Turbo command enables both logging switches and both inspector switches, then runs the persistent `dev` and `inspect` tasks without caching. Plain `pnpm dev` leaves inspection off. For the inspector relay alone, run `pnpm inspect`.

The relay opens `http://localhost:8080`, embedding the official Stately UI. It receives machine definitions, events, and snapshots from Electron main, the Supervisor, and the Engine. Process names and ids qualify actor identities so separate processes and restarts stay distinct. The App on web and in the Electron renderer opens a separate official browser inspector; allow its popup if the browser blocks it. Native Apps keep their console logs because the browser inspector requires a window.

`ARGO_MACHINE_INSPECT=1` enables Node inspection; `EXPO_PUBLIC_ARGO_MACHINE_INSPECT=1` enables the App's browser inspector. Both are independent of JSONL logging and disabled in production. Node processes wait briefly for the relay at startup; if it is unavailable, they report once and continue. Restart the processes after starting a late relay. Inspection sockets close when Node processes stop. Context cleaning and event type filtering also apply to visual inspection.

Port 8080 must be free. The relay opens a browser automatically except when `CI` is set. The Stately UI requires internet access. Keep its window open from startup; the official relay retains only 200 recent events, so reopening it later may require restarting the processes to recover their definitions.
