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

Attach the observer in the root `createActor` options before starting the actor. Children of an observed root are covered automatically. A new independent root needs its own observer. `@repo/machine-log` is portable and accepts a line writer; `@repo/machine-log/node` provides the gated Node file writer. The App bundle must import only the portable entry point.

The optional live diagram from issue #8 is deferred. This implementation has no inspector service or third-party transport.
