# Codex adapter: vendor calls

Research for [issue #18](https://github.com/milad-alizadeh/argo-universal/issues/18), 2026-10-04. This is the call inventory for `connect`, `vendorStream`, cancellation and stopping in [spec 0002 §7](../specs/0002-machines.md#7-agent-machines), as amended by [spec 0003](../specs/0003-sessions-and-feed.md). It covers research only; no adapter or recording was copied.

## Evidence and version

Every `C-*` citation below names **Codex app-server 0.157.0**, upstream release commit `00c972ed5d6ff6499317fd41b7f23605b8e6850d`. The annotated tag `rust-v0.157.0` points to that commit. Every `O-*` citation names **old Argo commit `a51a0e01ecaa78fe5f1e8c584acd867613116bb9`**, whose protocol recordings include app-server 0.157.0. Links are immutable. The checked version applies to each fact attached to that citation, including negative findings. [0.157.0 release tag][C-release], [old Argo recordings][O-recordings].

The installed binary reported `codex-cli 0.157.0`. Its exports were generated without starting a Session or inference:

```sh
codex app-server generate-ts --out /tmp/argo-codex-0157-ts --experimental
codex app-server generate-json-schema --out /tmp/argo-codex-0157-json --experimental
```

All **881 TypeScript exports and 440 JSON schema exports** matched, byte for byte, the decompressed experimental export bundle at the pinned release commit. The release's ordinary `schema/json` and `schema/typescript` trees contain stable views, which omit some experimental fields; the generated experimental bundle and Rust declarations govern those fields. Local comparison, 2026-10-04, against [0.157.0 precomputed experimental exports][C-exports].

| Generated file | SHA-256, installed 0.157.0 experimental export |
|---|---|
| `JSONRPCMessage.json` | `6da4cc373a7ccd01f5608ad4496eeb4d44b6a9b0d3158e85ed66b59f3c0b5114` |
| `v2/ThreadStartParams.json` | `80a40a7fac15b4bf70efb7f893fb353acc0a0d30c68f54aee4f01923deca85de` |
| `v2/TurnStartParams.json` | `07771223642e1b61bd9aac0069fc0f98143a1c047724ca02c7ceb13653442738` |
| `v2/ThreadBackgroundTerminalsTerminateParams.json` | `4af4973b4e965228e7c6ffdff341c22c227c26bc48d4b44a8696993869b64103` |

The current [official app-server documentation](https://learn.chatgpt.com/docs/app-server), reached through `developers.openai.com/codex/app-server`, was used for orientation. It is mutable and does not prove a 0.157.0 behavior. Behavioral claims below follow pinned source and schema instead.

One **local runtime smoke check**, on macOS with installed 0.157.0 and an isolated temporary `CODEX_HOME`, exercised newline framing, `initialize`, `initialized`, and stdin EOF. It received an initialize response reporting 0.157.0 and exited with status 0 within five seconds after EOF. It used no account, real history or inference. All Turn, permission, image, Plan, title, Subagent, Goal and Shell behavior below is **source/schema checked**, not a newly recorded live model run. Existing old Argo recordings remain separate evidence. [0.157.0 transport][C-stdio], [old recordings][O-recordings].

## 1. Process, framing and handshake

**0.157.0:** run `codex app-server --listen stdio://` for the process owned by the adapter. Stdin is read one line at a time and outgoing JSON gets a trailing newline. This is JSON-RPC-shaped traffic, without the `jsonrpc: "2.0"` member; the source explicitly says it neither sends nor expects that member. Requests carry string or integer `id`, `method`, optional `params`; notifications have no id; responses are `{id,result}` or `{id,error:{code,message,data?}}`. Parse stdout as protocol and stderr separately. [RPC envelopes][C-rpc], [stdio transport][C-stdio].

**0.157.0:** initialize first with truthful `clientInfo:{name,title,version}` and capabilities, wait for its response, then send `initialized`. Other methods before initialization fail with “Not initialized”. `capabilities.experimentalApi:true` opts into experimental methods and fields; `requestAttestation` is a distinct opt-in. Shell controls and collaboration-mode discovery require the experimental opt-in in this version. [Initialization capabilities][C-init], [dispatch guard][C-dispatch], [method inventory][C-methods], [collaboration discovery][C-mode-list].

Example checked handshake (the smoke check omitted `requestAttestation`; an adapter can send false explicitly):

```json
{"id":1,"method":"initialize","params":{"clientInfo":{"name":"argo_research","title":"Argo research","version":"0"},"capabilities":{"experimentalApi":true}}}
{"method":"initialized"}
```

**Argo implication:** keep pending client RPC responses by RPC id and pending server requests by server RPC id plus their Session/Turn/item association. A Tool call id is not an RPC id. Validate envelopes and method payloads with Zod; report and count unrecognised shapes as AGENTS.md/ADR 0012 require. The app-server sends command approval, file approval, user-input and MCP Elicitation requests in the opposite direction; answer with `{id:<original>,result:<typed response>}`. [0.157.0 server request union][C-requests], [RPC envelopes][C-rpc], [pending callback ownership][C-pending].

## 2. Starting, resuming and prompting

| Call, checked 0.157.0 | Parameters/result relevant to Argo | Source |
|---|---|---|
| `thread/start` | `cwd`, `model`, `modelProvider`, `approvalPolicy`, `sandbox` or named `permissions`, `config`; response includes `thread.id` and effective settings. `ephemeral` selects persistence. | [start declarations][C-start] |
| `thread/resume` | Prefer `{threadId}` for the id already stored by Argo; supports model, cwd, approval/sandbox/config overrides. `history` and nonempty `path` are unstable alternatives with different precedence. | [resume declarations][C-resume] |
| `thread/read` | `{threadId,includeTurns?}` reads stored history. For paginated history, full hydration is deprecated; use metadata plus `thread/turns/list` and `thread/items/list`. | [read declaration][C-read], [generated export][C-exports] |
| `turn/start` | `{threadId,input:[...],model?,effort?,approvalPolicy?,sandboxPolicy?,collaborationMode?}`; response has the vendor Turn id. Later notifications finish it. | [Turn request][C-turn] |

**0.157.0:** `thread/resume` does not itself submit a prompt. It can rejoin a thread already loaded in this app-server; an optional nonempty path then acts as a consistency check. Argo uses only its recorded id and owns its process; it does not discover external Sessions with `thread/list`. The distinction is required by ADR 0014. [Resume contract][C-resume], [ADR 0014](../adr/0014-argo-runs-only-its-own-sessions.md).

**0.157.0 text/image payloads:** plain text is `{type:"text",text,text_elements:[]}`. An image is `{type:"image",url}` or `{type:"image",fileId}`; a local image is `{type:"localImage",path}`. Images optionally select detail. URL/reference input and local-path input are different wire variants. Argo's uploaded image can become a Server-local path; the adapter must not pass a phone-local path to the Server process. The model catalog reports `inputModalities`, so model support belongs in the config option data. [UserInput variants][C-input], [model catalog][C-model].

**Argo implication:** map Argo Turn ids to returned vendor ids and also accept `turn/started` before any request response that supplies the id. `turn/start` may steer an already active Turn; spec 0003 forbids queued prompts in this milestone, so the Session must enforce its own idle-only prompting rule. Do not infer one completed Turn from the successful `turn/start` response. [0.157.0 Turn request][C-turn], [Turn statuses][C-status].

## 3. Streaming and interrupting

**0.157.0:** `turn/started`, `item/started`, `item/completed`, and `turn/completed` carry thread/Turn/item identity. Text streams through `item/agentMessage/delta`; reasoning uses `item/reasoning/summaryPartAdded`, `summaryTextDelta` and `textDelta`. Finished Thread items contain their complete text, command fields, edits, MCP calls, plans and Compaction. Reconcile the finished item with streamed state rather than appending its text twice. These are inputs to the adapter's pure `toAgentEvents`, not ACP wire messages. [Notification methods][C-deltas], [Thread items][C-items], [ADR 0006](../adr/0006-session-updates-use-acp-names.md).

**0.157.0:** interrupt with `turn/interrupt {threadId,turnId}`. Its acknowledgment is not a completed Turn. Remain in the adapter's Turn state until `turn/completed`; vendor statuses are `completed`, `interrupted`, `failed`, `inProgress`. The final Turn includes a nullable error and nullable timing fields. Argo maps completed to `end_turn`, interrupted to `cancelled`, failed to `error`; preserve error detail. Other glossary stop reasons are not equivalent to these vendor status values and need evidence before mapping. [Interrupt parameters][C-interrupt], [status enum][C-status], [generated Turn contract][C-exports].

**Argo implication:** no `user_message` for an automatic continuation or the synthetic “Implement the plan.” input used below. Only human-typed prompts or feedback become a `user_message`; Subagent parent input becomes `session_message`. A vendor user-side item alone cannot prove a human typed it. [ADR 0012](../adr/0012-only-human-typed-text-is-a-user-message.md), [spec 0003](../specs/0003-sessions-and-feed.md#session-machine-changes).

## 4. Permission requests and denial feedback

| Server request, checked 0.157.0 | Reply for milestone 1 | Source |
|---|---|---|
| `item/commandExecution/requestApproval` | `{decision:"accept"}` for `allow_once`; `{decision:"decline"}` for `reject_once`. `cancel` is a separate abort decision. | [approval declarations][C-approval], [reply handling][C-denial] |
| `item/fileChange/requestApproval` | Same accept/decline mapping; it is not a command approval payload. | [approval declarations][C-approval], [reply handling][C-denial] |
| `item/permissions/requestApproval` | Typed `permissions` grant and `scope`, not `{decision}`. Argo needs a specific translation for empty denied grants and the requested granted permissions. | [server request union][C-requests], [experimental generated export][C-exports] |

**0.157.0:** command approvals can also offer session grants and policy amendments; file approvals can grant for the Session. These choices are outside spec 0003's two-option UI. Preserve the request's command, cwd, reason, approval id and permission details for presentation/correlation without adding “Allow for this Session”. [Approval declarations][C-approval], [spec 0003 Session procedures](../specs/0003-sessions-and-feed.md#session-procedures).

**0.157.0 gap:** command/file approval responses contain a decision only. They have **no message/reason field for user denial feedback**. The app-server maps `decline` to the fixed denial “rejected by user”; arbitrary extra reply JSON is not delivered as feedback. The permissions response likewise supplies grants/scope rather than free text. Spec 0003 requires `message` to reach the Agent when rejecting, so future implementation must ask the owner how to bridge this gap. A separate `turn/steer` or later prompt would be a separate action with ordering and Turn semantics to decide; it must not be silently treated as part of the denial. [0.157.0 response types and decision mapping][C-approval], [fixed denial handling][C-denial], [generated permissions reply][C-exports].

**0.157.0:** pending server requests have callback entries and resolve when their replies arrive, their owning thread/connection is torn down, or a Turn transition cancels them; the approval handlers await the callback without a 24-hour UI timer. `serverRequest/resolved` tells clients that a request was resolved elsewhere or is no longer pending. Argo owns “first answer wins” across Apps and keeps no approval deadline. This does not promise infinite process lifetime. [Pending callbacks][C-pending], [reply handling][C-denial], [resolved notification][C-deltas].

## 5. Elicitations

**0.157.0 tool Elicitation:** `item/tool/requestUserInput` carries `{threadId,turnId,itemId,questions,isBlocking,autoResolutionMs}`. Each question has id, header, question, optional choices and freeform-related flags. Reply is `{answers:{<questionId>:{answers:[<text>,...]}}}`; there is no ACP action field in this wire response. A declined/cancelled Argo action requires deliberate mapping (empty answers versus Turn cancellation), which should be recorded. `autoResolutionMs` is deprecated; use `isBlocking`. [Request shape][C-questions], [answer shape][C-answers], [handler reply handling][C-question-reply].

**0.157.0:** the core request-user-input tool is root-only. Its Plan-mode requests block; default-mode requests have `isBlocking:false` and no automatic resolution milliseconds in the handler. Its available modes are feature/config driven. Argo must not advertise an unsupported tool Elicitation capability by assuming the old launcher flag is still the whole contract, or turn a nonblocking question into a running approval without an owner decision. [Core tool behavior][C-question-handler], [old launcher][O-launch].

**0.157.0 MCP Elicitation:** `mcpServer/elicitation/request` is a different server request. It carries thread id, nullable correlated Turn id, server name, and mode-specific data. Modes include typed `form`, `url`, and opt-in OpenAI extension forms; reply is `{action:"accept"|"decline"|"cancel",content:<JSON|null>,_meta:<JSON|null>}`. URL flow completion is separate from displaying its URL. Treat unknown/unsupported extensions as unsupported data; do not impersonate Codex Desktop to obtain device-verification capability. Argo's `answerElicitation` must select the correct wire response family. [MCP Elicitation declarations, checked 0.157.0][C-elicitation], [generated experimental bundle][C-exports].

## 6. Plan mode and collaboration modes

**0.157.0:** collaboration modes are `plan` and `default`; the experimental `collaborationMode/list` returns presets. Send `turn/start.collaborationMode:{mode,settings:{model,reasoning_effort,developer_instructions}}`. This setting takes precedence over standalone model/effort/instruction fields. `developer_instructions:null` selects the mode's built-in instructions. “Plan” in Argo's Mode picker maps here, independently of sandbox/approval selection. `multiAgentMode` is deprecated and ignored in this release; it is not the collaboration-mode picker. [Preset definitions][C-modes], [discovery method][C-mode-list], [Turn precedence][C-turn], [experimental ModeKind/Settings exports][C-exports].

**0.157.0:** a proposed written plan is a `ThreadItem` of type `plan`, streamed by experimental `item/plan/delta`; its completed `text` is authoritative and may differ from concatenated deltas. The live checklist is separate: `turn/plan/updated` carries explanation and steps. Map those to Argo's distinct Plan proposal and Plan concepts. [Plan item][C-plan], [Plan delta][C-plan-delta], [notification methods][C-deltas].

**0.157.0:** there is no app-server `approvePlan` request in the method inventory. The TUI waits for the Plan-mode Turn to end with a plan item, then shows its own implementation popup. Its “Yes” submits the text “Implement the plan.” with Default collaboration mode. Staying in Plan mode leaves the mode intact. Argo's Approve/Keep planning card is similarly an adapter-owned workflow: Approve starts a Default Turn, Keep planning starts a Plan Turn with the person's feedback, as spec 0003 says. [TUI popup timing][C-plan-popup], [TUI approval action][C-plan-approve], [method inventory][C-methods], [spec 0003](../specs/0003-sessions-and-feed.md#session-machine-changes).

## 7. Config options, availability and usage

**0.157.0:** use `model/list` and its pagination for available model ids, `supportedReasoningEfforts`, `defaultReasoningEffort`, `inputModalities`, hidden/default flags and service tiers. Do not hard-code today's model names or effort combinations. `config/read {cwd?,includeLayers}` reports effective config; `configRequirements/read` reports managed restrictions. Global config writes are a different persistent operation from a Session picker. [Catalog][C-model], [config reads][C-config], [generated experimental config contract][C-exports].

**0.157.0:** approval policy supports `untrusted`, `on-request`, granular settings and `never`; legacy `on-failure` is not in this release's generated policy union. Sandbox modes are `read-only`, `workspace-write`, `danger-full-access`; named permission profiles cannot be combined with `sandbox`/`sandboxPolicy`. These dimensions do not map one-to-one to collaboration modes. Argo must define offered mode combinations in the adapter and mark dangerous ones according to spec 0003. [Policy union][C-policy], [sandbox union][C-sandbox], [start contract][C-start], [Turn contract][C-turn].

**0.157.0:** Session-wide changes can be passed on the next `turn/start`; experimental `thread/settings/update` also updates subsequent-Turn settings. Experimental `turn/settings/update` instead mutates one running Turn, so it conflicts with Argo's deliberate held-until-next-Turn semantics and must not be used for ordinary picker changes. Holding changes is Argo behavior, not a limitation of this app-server. [Thread settings][C-settings], [running-Turn settings][C-status], [next-Turn overrides][C-turn], [spec 0003 config rules](../specs/0003-sessions-and-feed.md#agent-catalog).

**0.157.0 availability:** `account/read` returns `account`, `requiresOpenaiAuth`, and workspace routing. Account may be null, an API-key account, ChatGPT, or another provider. ADR 0004 requires ChatGPT subscription authentication; detecting a binary alone or accepting any nonnull account does not establish that. Old Argo removed `OPENAI_API_KEY` and `CODEX_API_KEY` from the spawned environment; that is a reuse candidate, not proof that all inherited config selects ChatGPT. [Account response][C-account], [generated Account union][C-exports], [old launch][O-launch], [ADR 0004](../adr/0004-agents-run-on-subscriptions.md).

**0.157.0 usage:** `thread/tokenUsage/updated` carries `{threadId,turnId,tokenUsage:{total,last,modelContextWindow}}`. Each breakdown contains total/input/cached-input/cache-write-input/output/reasoning-output tokens. `modelContextWindow` may be null. `last` is the latest model response; `total` accumulates these responses, **not a ready-made per-Turn total**. A Turn with multiple model calls therefore cannot use its final `last` as its cost. [Usage types][C-usage], [accumulation implementation][C-usage-semantics].

**Argo implication:** use latest response/context information for the context ring and show unavailable capacity when context-window size is null. For per-Turn usage, retain a cumulative baseline and attribute differences while guarding resume/replay duplication; verify Compaction and resumed baselines in recordings. Keep parent and Subagent totals separate, because spec 0003 says they overlap. These are mapping rules to validate, not a newly measured exact usage algorithm. [0.157.0 usage semantics][C-usage-semantics], [spec 0003 shapes](../specs/0003-sessions-and-feed.md#subagent-and-shell-shapes).

## 8. Title generation and rename

**0.157.0:** app-server offers `thread/name/set {threadId,name}` and `thread/name/updated {threadId,threadName}`. The handler normalizes the name, rejects an empty name, persists metadata, then emits the notification. This is a supported rename call; no direct SQLite write or rollout mutation is needed. The call inventory has no dedicated title-generation RPC. [Rename handler][C-name], [method inventory][C-methods].

**0.157.0 TUI implementation:** title generation runs in a separate ephemeral thread with structured output. It chooses `gpt-5.6-luna` with Low effort only when the OpenAI provider, ChatGPT account and catalog permit it; otherwise it uses the current model. Its schema accepts one `title` string, at most 36 characters, and rejects additional fields. The title instructions and input have a bounded prompt. The helper disables tools/MCP servers/Goals. It preserves and verifies a selected custom permission profile; otherwise it selects and verifies read-only permissions. Argo's title helper must remain isolated and cannot assume this recipe always selects a read-only sandbox. [Model choice and helper][C-title], [schema and bounded prompt][C-title-schema], [isolated request helper][C-title-isolation].

**0.157.0 timing difference:** the TUI triggers generation from a completed user-message item while the thread has no name; it does **not** wait for the first Turn to complete. Spec 0003 deliberately schedules Argo's title generation after its first Turn, so use that timing unless the owner changes the spec. The first prompt line stays an Argo placeholder; persisting it as the vendor name before auto-generation would interfere with “no name yet” heuristics. User rename must cancel/suppress pending auto-title results and win both locally and in vendor metadata. [TUI trigger][C-title-trigger], [TUI cancellation][C-title], [spec 0003 titles](../specs/0003-sessions-and-feed.md#session-machine-changes).

## 9. Subagents and Agent-started Turns

**0.157.0:** `collabAgentToolCall` identifies the tool call, sender thread, receiver thread ids, prompt, requested model/effort and agent states. Tools include spawn, sendInput, resume, wait, close and newer collaboration actions. `subAgentActivity` names its agent thread/path. Thread metadata includes `parentThreadId`, `agentNickname`, `agentRole`, model, effort, source and `canAcceptDirectInput`. Use explicit identity to relate a child to its parent, not an arbitrary unknown thread id. [Collaboration items][C-items], [Thread metadata][C-thread], [experimental tool enum][C-exports].

**0.157.0:** app-server listens for newly created internal threads and attaches initialized connections to them best-effort. Thus a parent connection can receive child notifications; the source also has a lagged-creation path which logs and skips resync. Traffic can need buffering before Argo has processed the spawn item. Do not claim that every child has a `thread/started` announcement or that the spawn item is always observed first: the exact stream order needs a recording. [Automatic listener attachment][C-auto-subscribe], [listener helper][C-listener].

**Argo implication:** route known child `turn/started`, items, usage and completion into the child's read-only Feed, buffering unassociated traffic until parent identity is proved. Rebuild owned child history through `thread/read` or pagination after restart. A child can receive more work and have multiple Turns; model belongs on each Argo Turn, while absent nickname/role remains absent. Direct App prompting of a child stays disallowed by spec 0003 even when the vendor exposes capability flags. [0.157.0 collaboration contract][C-items], [history contract][C-read], [vendor input restrictions][C-child-input], [spec 0003 routing](../specs/0003-sessions-and-feed.md#session-registry-and-feed-routing).

**0.157.0 Goals:** `thread/goal/set`, `get`, `clear`, `thread/goal/updated` and `cleared` exist. Goal state includes objective, status, optional token budget, usage and timestamps. An active Goal can call `start_turn_if_idle` itself with `turn_trigger:"goal"`; no client `turn/start` precedes that continuation. In Argo `ready.idle`, a known owned parent `turn/started` must therefore create/map a Turn without a human prompt. Goal UI and initiation are outside this milestone; recording an Agent-started Turn is required by spec 0003. [Goal contract][C-goal], [continuation source][C-goal-continuation], [spec 0003](../specs/0003-sessions-and-feed.md#session-machine-changes).

## 10. Command output, Shells and stopping

**0.157.0 command item:** `commandExecution` has command, cwd, nullable process id, source, status, parsed `commandActions`, aggregated stdout/stderr, nullable exit code and duration. Unified exec sources distinguish startup and interaction. `item/commandExecution/outputDelta` supplies `{threadId,turnId,itemId,delta}`; terminal-interaction notifications describe the Agent's writes. A process id is not an OS pid or Turn id. [Command item fields][C-items], [output methods][C-deltas].

**0.157.0 background lifetime:** unified-exec watchers retain the originating Turn context while reading output and waiting for process exit, then send final execution events. Output and item completion can arrive after the foreground Turn has ended; route them by the known item/process association rather than requiring `active.turnId` to match. Turn interruption is not the Shell-stop API. [Watcher lifecycle][C-watcher], [Shell control implementation][C-shell-ops].

**0.157.0 limits:** unified-exec deltas are capped at 8,192 bytes per event and 10,000 deltas per call. The watcher can also skip chunks when its receiver lags. Argo may persist every delta it receives, but that is not proof of a complete unlimited command log. Keep final aggregated output as reconciliation evidence and record this gap for long-lived Shells; no full-output retrieval RPC was identified in the background-terminal call family. [Delta size][C-watcher], [event quota][C-output-count], [quota enforcement][C-output-cap], [background API][C-shells].

| Call, checked 0.157.0; experimental opt-in required | Result/meaning | Source |
|---|---|---|
| `thread/backgroundTerminals/list {threadId,cursor?,limit?}` | Paginated `data` of `{itemId,processId,command,cwd,osPid,cpuPercent,rssKb}`, plus `nextCursor`. OS pid/CPU/RSS are currently null. | [types][C-shells], [handler][C-shell-ops], [method gating][C-methods] |
| `thread/backgroundTerminals/terminate {threadId,processId}` | `{terminated}` for one process. Confirm list/output/item completion as needed; false is not a successful kill. | [types][C-shells], [handler][C-shell-ops] |
| `thread/backgroundTerminals/clean {threadId}` | Stops all background terminals in that loaded thread. It is not Argo's per-Shell Stop action. | [handler][C-shell-ops], [types][C-shells] |

**Argo implication:** store Shell identity/output independently of the active Turn, append streamed bytes to the Server-owned output file, reconcile the live list after connection/restart, and mark previously running Shells `lost` when the Agent process fails. Do not label a crashed process as a successful Shell exit or a known user Stop. These lifecycle rules come from spec 0003, not a promise that background terminals can survive Agent death. [spec 0003 Shell lifecycle](../specs/0003-sessions-and-feed.md#session-machine-changes), [0.157.0 watcher][C-watcher].

**0.157.0 process stop:** stdin EOF closes the stdio connection; on Unix SIGTERM also initiates teardown. A source watchdog bounds teardown at 45 seconds, including blocked I/O/runtime cleanup. The isolated smoke check observed graceful EOF exit 0 in under five seconds, not a guarantee for running work. `thread/unsubscribe {threadId}` concerns a thread listener/lifetime and is a different operation from shutting down the owned process. In spec 0002's `agent.stop`, close the owned stdio process and settle pending operations; unexpected exit is `failed`, not a successful `turn/completed`. [Stdio EOF/SIGTERM implementation][C-stdio], [unsubscribe contract][C-unsubscribe], [spec 0002 §7](../specs/0002-machines.md#7-agent-machines).

## 11. Old Argo: candidates and changes before reuse

Old Argo was inspected at `a51a0e01ecaa78fe5f1e8c584acd867613116bb9`. Its source is prior art, not the specification for this adapter. No code or recording has been copied.

| Old behavior, with pinned source | Change required by spec 0003 / checked 0.157.0 |
|---|---|
| Protocol client documents a 0.147.0 baseline with some 0.157.0 resume additions; narrow request definitions. [old client][O-client] | Pin the full supported 0.157.0 contract, including collaboration, rename, Shell calls and server request families. Validate boundary data; avoid carrying casts as runtime validation. |
| Starts stdio app-server, strips API-key environment variables and handshakes with `experimentalApi:false`; enables an old default-mode user-input feature flag. [old launch][O-launch] | Framing/input/environment isolation are candidates to retain after review; opt into the experimental calls actually required and check current Elicitation configuration. |
| Maps text/local-image input; puts non-image attachment paths into text. [old input][O-input] | Retain only the text/image mapping required by this milestone and Server-local blob paths; no accidental attachment expansion. |
| Uses a 24-hour approval timeout and standing approvals keyed by similarity. [old input][O-input], [permission channel][O-permission] | No deadline and exactly `allow_once`/`reject_once`. Keep vendor RPC id distinct from the public pending request. |
| Drops `turn/started` when no client command is active; reports both failed/interrupted as stopped; starts the next queued Turn on completion. [old Turn handling][O-turn] | Accept owned Agent-started Turns; distinguish `error`/`cancelled`; no message queue in this milestone. |
| Clears command-output and delegation state on Turn completion; rejects output whose Turn is not active and items whose thread differs. [old Turn handling][O-turn], [old output routing][O-output] | Keep Shell buffers/identity past Turn end; route/buffer owned child traffic; retain Subagent history across multiple Turns. |
| Uses vendor protocols as authority under old ADR 0047; its 0.157.0 recordings are available. [old ADR][O-adr], [recordings][O-recordings] | Inspect and validate each proposed recording before porting it into `mocks/cli/codex/`; extend missing cases, rather than treating hand-written fixtures as recorded vendor behavior. |

The current ADRs remain binding: subscription login (0004), ACP Session-update names with an Argo adapter (0006), only human text as `user_message` (0012), and only Argo-owned Sessions (0014). This note changes none of them. [ADR 0004](../adr/0004-agents-run-on-subscriptions.md), [ADR 0006](../adr/0006-session-updates-use-acp-names.md), [ADR 0012](../adr/0012-only-human-typed-text-is-a-user-message.md), [ADR 0014](../adr/0014-argo-runs-only-its-own-sessions.md).

## 12. Owner decisions before copying or implementation

1. **Reuse:** may the next adapter issue reuse the reviewed old stdio framing, input mapping and API-key environment filtering, and selected 0.157.0 recordings? Lifecycle/approval/child/Shell routing needs the changes above; approve individual candidates before any copy. This research issue copied none.
2. **Denial feedback:** how should typed rejection feedback reach Codex, given that its approval reply cannot carry it? Decide a separate input operation and its ordering, or change the spec; do not invent a `message` reply member.
3. **Titles:** keep spec 0003's after-first-Turn timing and use the CLI's catalog-dependent small-model/fallback recipe? The helper must remain isolated, and a user rename must win over late generation.
4. **Elicitations and output:** decide the Argo action mapping for tool Elicitations/nonblocking default-mode questions and the treatment of unsupported MCP extensions. A long-lived Shell can exceed vendor delta quotas; an unlimited full-output promise needs a separate investigation or a documented product limit.

These are decisions for later implementation, not reasons to leave the research note unfinished. If implementation or a recording campaign is added to #18, split it into separate issues before beginning: the adapter lifecycle/mapping work, real protocol recording collection, and denial-feedback/full-output investigation have different acceptance checks. No new issue was created here.

## 13. Recording work still required

Spec 0003 requires recordings before adapter implementation. This note proves call shapes/source behavior at 0.157.0, not model execution. The next issue should capture/validate: text plus image; command/edit streaming and Compaction; both permission kinds and rejection; tool and MCP Elicitations; Plan accepted/kept with feedback; title generation/rename race; child spawn, more input and notification order; a Shell outliving its Turn, output and terminate; an Agent-started Goal continuation; terminal continuation and crash/restart. Old recordings can supply a subset only after inspection and owner approval. [spec 0003 recording requirements](../specs/0003-sessions-and-feed.md#testing-decisions), [old 0.157.0 recordings][O-recordings].

[C-release]: https://api.github.com/repos/openai/codex/git/tags/ac21625ddf7f9dd5f34b2802212cf20295fdff95 "Codex app-server 0.157.0"
[C-exports]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/precomputed/app-server-exports-experimental.json.zst "Codex app-server 0.157.0"
[C-rpc]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/rpc.rs#L1-L87 "Codex app-server 0.157.0"
[C-stdio]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-transport/src/transport/stdio.rs#L28-L191 "Codex app-server 0.157.0"
[C-init]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v1.rs#L27-L99 "Codex app-server 0.157.0"
[C-dispatch]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/message_processor.rs#L930-L990 "Codex app-server 0.157.0"
[C-methods]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/common.rs#L558-L820 "Codex app-server 0.157.0"
[C-start]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L62-L228 "Codex app-server 0.157.0"
[C-resume]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L338-L477 "Codex app-server 0.157.0"
[C-settings]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L229-L320 "Codex app-server 0.157.0"
[C-turn]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L142-L287 "Codex app-server 0.157.0"
[C-input]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L420-L487 "Codex app-server 0.157.0"
[C-interrupt]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L323-L335 "Codex app-server 0.157.0"
[C-requests]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/common.rs#L1761-L1805 "Codex app-server 0.157.0"
[C-items]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L236-L407 "Codex app-server 0.157.0"
[C-deltas]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/common.rs#L1940-L2000 "Codex app-server 0.157.0"
[C-approval]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/item.rs "Codex app-server 0.157.0"
[C-denial]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/bespoke_event_handling.rs#L1905-L2035 "Codex app-server 0.157.0"
[C-pending]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/outgoing_message.rs#L330-L446 "Codex app-server 0.157.0"
[C-questions]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/ToolRequestUserInputParams.ts "Codex app-server 0.157.0"
[C-answers]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/ToolRequestUserInputResponse.ts "Codex app-server 0.157.0"
[C-question-handler]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/core/src/tools/handlers/request_user_input.rs#L72-L108 "Codex app-server 0.157.0"
[C-question-reply]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/bespoke_event_handling.rs#L1627-L1699 "Codex app-server 0.157.0"
[C-elicitation]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs "Codex app-server 0.157.0"
[C-modes]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/models-manager/src/collaboration_mode_presets.rs "Codex app-server 0.157.0"
[C-mode-list]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/common.rs#L1182-L1194 "Codex app-server 0.157.0"
[C-plan]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L268-L282 "Codex app-server 0.157.0"
[C-plan-delta]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1436-L1450 "Codex app-server 0.157.0"
[C-plan-popup]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/chatwidget/turn_runtime.rs#L160-L270 "Codex app-server 0.157.0"
[C-plan-approve]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/chatwidget/plan_implementation.rs#L9-L110 "Codex app-server 0.157.0"
[C-model]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/model.rs#L55-L183 "Codex app-server 0.157.0"
[C-config]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/config.rs#L389-L430 "Codex app-server 0.157.0"
[C-policy]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/AskForApproval.ts "Codex app-server 0.157.0"
[C-sandbox]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/SandboxMode.ts "Codex app-server 0.157.0"
[C-account]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/GetAccountResponse.ts "Codex app-server 0.157.0"
[C-usage]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1850-L1907 "Codex app-server 0.157.0"
[C-usage-semantics]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/protocol/src/protocol.rs#L2269-L2331 "Codex app-server 0.157.0"
[C-title]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/app/thread_title.rs#L29-L199 "Codex app-server 0.157.0"
[C-title-trigger]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/app/thread_routing.rs#L2144-L2179 "Codex app-server 0.157.0"
[C-title-schema]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/app/thread_title.rs#L264-L309 "Codex app-server 0.157.0"
[C-title-isolation]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/tui/src/temporary_structured_request.rs#L35-L187 "Codex app-server 0.157.0"
[C-name]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1822-L1857 "Codex app-server 0.157.0"
[C-thread]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/schema/typescript/v2/Thread.ts "Codex app-server 0.157.0"
[C-auto-subscribe]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/lib.rs#L1268-L1293 "Codex app-server 0.157.0"
[C-listener]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/request_processors/thread_processor.rs#L3562-L3595 "Codex app-server 0.157.0"
[C-child-input]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/request_processors/thread_input.rs#L1-L37 "Codex app-server 0.157.0"
[C-read]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1670-L1688 "Codex app-server 0.157.0"
[C-goal]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L801-L902 "Codex app-server 0.157.0"
[C-goal-continuation]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/ext/goal/src/runtime.rs#L424-L504 "Codex app-server 0.157.0"
[C-shells]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1193-L1256 "Codex app-server 0.157.0"
[C-shell-ops]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2355-L2418 "Codex app-server 0.157.0"
[C-watcher]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/core/src/unified_exec/async_watcher.rs#L36-L242 "Codex app-server 0.157.0"
[C-output-cap]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/core/src/unified_exec/async_watcher.rs#L311-L339 "Codex app-server 0.157.0"
[C-output-count]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/core/src/exec.rs#L78-L88 "Codex app-server 0.157.0"
[C-status]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L28-L82 "Codex app-server 0.157.0"
[C-unsubscribe]: https://github.com/openai/codex/blob/00c972ed5d6ff6499317fd41b7f23605b8e6850d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L715-L731 "Codex app-server 0.157.0"
[O-client]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/app-server/codex-app-server-client.ts#L1-L89 "Old Argo a51a0e01"
[O-launch]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/app-server/codex-app-server-client.ts#L383-L484 "Old Argo a51a0e01"
[O-input]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/session/codex-session-protocol.ts#L1-L24 "Old Argo a51a0e01"
[O-permission]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/session/codex-session-channel.ts#L285-L324 "Old Argo a51a0e01"
[O-turn]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/session/codex-session-channel.ts#L384-L430 "Old Argo a51a0e01"
[O-output]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/src/harnesses/codex/session/codex-session-channel.ts#L452-L490 "Old Argo a51a0e01"
[O-adr]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/docs/adr/0047-vendor-protocols-drive-sessions-and-owned-workflows-use-xstate.md "Old Argo a51a0e01"
[O-recordings]: https://github.com/milad-alizadeh/argo/blob/a51a0e01ecaa78fe5f1e8c584acd867613116bb9/apps/desktop/mocks/recordings/codex-app-server/0.157.0 "Old Argo a51a0e01"
