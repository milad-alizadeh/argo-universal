# Conversation rename map

Scratch file for renaming "Voice call" to **Conversation** (owner, 2026-11-20). Not to be committed. Phase 2 follows the approved version.

Terms: a **Conversation** is a live spoken exchange with one Session. A **Voice** is one voice you pick (Cove, Sol, a custom voice). A **Conversation provider** runs a Conversation (GPT-Live today).

Rule: if a thing is about the live exchange, it becomes Conversation. If it is about one voice (picking, previewing, custom voices, the voice's own words), it stays "voice".

Plugin contract (ADR-0034): the contract is `pluginWireVersion` (now 9) and `minimumPluginWireVersion`, and it covers Plugin trees and kit components only. Nothing under `packages/contracts/src/plugins/` or `packages/plugin-kit` mentions the Conversation, a voice Operation or the `voice` sender (the only "voice" hits are `voiceOver` accessibility notes). So no entry below touches the wire version. Operation ids differ: a Plugin, Agent or the CLI can call any non-App-only Operation by id, so an id rename breaks such a caller. None ships (Argo has not shipped), and the only Agent-facing id in stored text is `voice.hangUp`, in the instruction every Agent gets in a Conversation's first Prompt (`engine/src/feed/voice-markers.ts`).

## 1. User-facing copy

| Today | New | Stored? | Proposal |
|---|---|---|---|
| Settings list row "Voice" (`settings-list-server-rows.ts`) | "Conversation" | no | Rename label. Route: section 4. |
| Settings page title "Voice" (`voice-detail-view.tsx`) | "Conversation" | no | Rename. |
| Toggle "Voice calls" | "Conversations" | no | Rename. |
| Row "Voice provider" | "Conversation provider" | no | Rename. |
| Section "Call" (`voice-call-section.tsx`) | "Conversation" | no | Rename. The other two agents are rewriting this page, so strings may have moved by Phase 2. |
| "End a silent call after" | "End a silent Conversation after" | no | Rename. |
| "Say a short line when handing work over" | same | no | Keep. |
| Opening note placeholder "What the voice knows when the call starts" | "...when the Conversation starts" | no | Rename. |
| "Instructions for every call" | "Instructions for every Conversation" | no | Rename. |
| Devices footer "A running Voice call switches at once." and "...appear after the first Voice call." | "Conversation" | no | Rename. |
| Composer start button "Start voice call" | "Start Conversation" | no | Rename. |
| Composer end button "End"; mute buttons "Mute/Unmute microphone/speaker"; labels "Listening / Talking / Thinking / Connecting… / Reconnecting… / Microphone blocked" | same | no | Keep. |
| "Visualiser" Orb or Band | same | no | Keep (Orb is going away in the band work). |
| Voice picker, "Speaks with", "How it speaks", "Play X", "Edit X", Name/Preview/Save/Delete | same | no | Keep: one Voice. |
| Feed Notices "Voice call ended", "Voice call failed" (`engine/src/voice/call-endings.ts`) | "Conversation ended", "Conversation failed" | text lives in existing Notice rows | Rename for new rows; old rows keep old text, no migration (history). |
| Agent-visible text: Prompt prefix "Voice call request:" (`briefing.ts`), the mark instruction, refusals ("Voice calls are off", "A Voice call is already running", "No Voice call is running", "The Session has no Voice call", "The Voice call ended: ...") | "Conversation" | prefix sits in old stored Prompts | Rename; briefing code accepts both prefixes for one release. |
| Operation labels and descriptions ("Start Voice call", "End Voice call", "Hang up Voice call", "Read Voice call status", "Set Voice call instructions", "Change Voice call options") | "Conversation" | no | Rename. |
| macOS microphone prompt (`apps/desktop/forge.config.mts`) "while you talk in a Voice call" | "...in a Conversation" | OS caches consent, not the string | Rename. |
| Storybook titles (`Screens/Settings/Voice`, `Voice/VoiceStageView`, Composer voice stories) | `Screens/Settings/Conversation`, `Conversation/...` | no | Rename with files; story ids change. |

## 2. Code identifiers

| Today | New | Proposal |
|---|---|---|
| `VoiceCall`, `VoiceCallEnd`, `VoiceCallOptions`, `VoiceCalls` class, `VoiceCallsPort`, `no-voice-calls.ts`, `voice-call-*.ts` | `Conversation`, `ConversationEnd`, `ConversationOptions`, `Conversations`, `ConversationsPort`, `no-conversations.ts`, `conversation-*.ts` | Rename. |
| `VoiceCallStatus` (connecting/connected) and `VoiceStatus` (what the App draws) | `ConversationPhase` and `ConversationStatus` | Rename; the phase takes a new name so the two do not collide. |
| `VoiceStartInput/Output`, `VoiceAvailability`, `VoiceLimit`, `VoiceTrouble`, `VoiceOrbState`, `VoicePartial` | `Conversation*` prefix | Rename. |
| `VoiceSpeaker` (`person` / `voice`) | keep | Keep: names who speaks, and one is the voice. |
| `VoiceOption`, `CustomVoice`, `voices.ts`, `voice-choices`, `voice-picker*`, `use-voice-preview`, `voice-previewer`, preview-clip code | unchanged | Keep: one Voice. |
| `voiceCall` XState machine (`call.machine.ts`, `voiceCallSystemId = 'voice'`, actor id `'voice'` in `engine/machine.ts`) | `conversation` machine, id `'conversation'` | Rename. Actor id is in memory only. |
| `call-*.ts` in `engine/src/voice` (`call-start`, `call-endings`, `call-types`, `call-watchers`...) | `conversation-*` | Rename with the folder. |
| Engine folder `packages/engine/src/voice/` | `packages/engine/src/conversation/`, with `gpt-live/` inside. Files about one voice (`voice-choices.ts`, `voice-choice-rules.ts`, `custom-voices.ts`, `voice-previews.ts`, `voice-preview-clips.ts`, `voice-clip-desk.ts`, `gpt-live-voices.ts`) keep their names. | Rename folder. |
| Contracts folder `packages/contracts/src/voice/` | `conversation/` for `index.ts`, `call-options.ts`, `devices.ts`; `voice/` keeps `voices.ts` and `preview.ts`. | Rename and split. |
| Contracts `operations/voice.ts`, `voice-settings.ts`, `voice-devices.ts` | `conversation.ts`, `conversation-settings.ts`, `conversation-devices.ts`; voice-only Operations move to a smaller `voice.ts`. | Rename and split. |
| Client `features/voice/` | `features/conversation/`, with the voice-named preview files keeping their names | Rename folder (decision D3). |
| Client `screens/settings/voice/` | `screens/settings/conversation/`. `voice-picker*`, `voice-choices`, `voice-choice-section`, `custom-voice-*` keep `voice-`. `voice-detail-*` becomes `conversation-detail-*`; `voice-call-section` becomes `conversation-section`; `voice-call-options` becomes `conversation-options`. | Rename. |
| Composer `composer-voice*`, `composer-call-*` (`composer-call-glyph-motion`, `composer-call-pointer`), props like `onStartCall` | `composer-conversation*`, `onStartConversation`. `composer-mute-buttons` keeps its name. | Rename. |
| Session screen `session-voice-stage.tsx`, `session-detail-view-voice*`, `use-session-voice`, `session-voice.ts`, `new-session-voice` | `session-conversation-*`, `use-session-conversation`. The stage goes away with the Orb in the other agent's change, so rebase first. | Rename. |
| Feed `voice-transcript.tsx`, `with-partial-transcripts` | keep | Keep: the voice's own words. |
| Engine `voice-markers.ts`, `voice-input.ts`, `engine-input.ts`, `session-link.ts` | `conversation-markers.ts`, `conversation-input.ts` | Rename. |
| Mocks `packages/client/mocks/voice/*`, `packages/engine/mocks/voice-*` | `mocks/conversation/*`, `conversation-*`; `synthetic-voice-audio.ts` keeps its name | Rename. |
| Kit icons `voice`, `voice-off`, `voice-bars` | keep | Keep: drawings, not the feature. |
| `e2e/steps/conversation-requests.ts` | check it is not about the spoken feature | Check in Phase 2. |
| Comments and test names that say "call" for the Conversation | "Conversation" | Rename. Leave "provider call", "Tool call", "Call origin". |

## 3. Operation ids, tRPC routes, contracts

| Today | New | Stored? / Wire | Proposal |
|---|---|---|---|
| `voice.status`, `voice.start`, `voice.end` | `conversation.status`, `.start`, `.end` | no / none | Rename. |
| `voice.hangUp` | `conversation.hangUp` | named in old stored Prompts / none | Rename. It only works on a running Conversation, so a stale id does no harm. |
| `voice.getSettings`, `voice.setSettings` (on/off, provider; get also lists voices and instructions) | `conversation.getSettings`, `.setSettings` | no / none | Rename. |
| `voice.setInstructions` | `conversation.setInstructions` | no / none | Rename. |
| `voice.setCallOptions` | `conversation.setOptions` | no / none | Rename. |
| `voice.listDevices`, `voice.chooseDevices` | `conversation.listDevices`, `.chooseDevices` | no / none | Rename. |
| `voice.listVoices`, `voice.setVoice`, `voice.saveCustomVoice`, `voice.deleteCustomVoice` | unchanged | no | Keep: one Voice. |
| `voice.preview`, `voice.getPreviewClip`, `voice.storePreviewClip` | unchanged | no | Keep: one Voice. |
| tRPC router `voice` (`watch`, `devices` streams in `engine/src/voice/router.ts`; key `voice` in `router-deps.ts`) | `conversation` | App and Server ship together / none | Rename. |
| Contract fields `callId`, `ended.callId`, `callOptions` | `conversationId`, `options` | no / none | Rename. |
| `PromptSender` variant `{ type: 'voice' }` (`contracts/feed/prompt-sender.ts`) | `{ type: 'conversation' }` | Yes: inside stored JSON (Feed rows and queued Prompts); old rows would fail the strict schema / none | Decision D1. |
| Feed row kind `voice_transcript` (`contracts/feed/messages.ts`, DB enum in `feed.ts`) | keep | yes (stored rows) | Keep: it is what the voice said; a rename needs a table rewrite for no gain. |

## 4. Persisted data and routes

| Today | New | Stored? | Proposal |
|---|---|---|---|
| `server_settings.voice_calls` | `conversations` | yes | Decision D2: migrate with Drizzle `RENAME COLUMN` (lossless). |
| `server_settings.voice_provider` | `conversation_provider` | yes | Migrate (same migration). |
| `server_settings.voice_call_options` (JSON) | `conversation_options` | yes | Migrate. JSON keys inside to be checked in Phase 2 for "call" words. |
| `server_settings.voice_instructions` | `conversation_instructions` | yes | Migrate. |
| `server_settings.voice_name`, `voice_custom_voices` | keep | yes | Keep: one Voice. |
| Drizzle property names (`voiceCalls`, ...) | follow the columns | no | Rename with the migration. Existing `..._voice_*` migration folders are history, never edited. |
| Server home `voice-previews/` (one file per clip) | keep | yes | Keep: a clip is one Voice's greeting; no migration. |
| Client storage keys `voice-devices` (microphone, speaker) and `voice-visualiser` (Orb or Band); query keys of the same names | `conversation-devices`, `conversation-visualiser` | yes (per Device; a rename resets to System default) | Decision D4: keep. |
| `voice-mute-store` (in memory) | `conversation-mute-store` | no | Rename. |
| Route `/settings/voice` (`apps/universal-app/src/app/(frame)/settings/voice/index.tsx`, `settings-list-server-rows.ts`) | `/settings/conversation` | URLs only | Decision D5: rename, no redirect (Argo has not shipped). |
| Engine log label `'voice'` (`lifecycle-inputs.ts`) | `'conversation'` | old log files stay | Rename. |
| `docs/research/voice-mode.md` | untouched | n/a | Leave: a dated investigation record that says "Voice call" throughout. |

## Decisions needed

- **D1** Prompt sender `{type:'voice'}`: rename to `'conversation'` with a data migration of the stored JSON, or keep. Recommend rename, since the glossary now names the sender a Conversation; keeping is cheaper and invisible.
- **D2** `server_settings` columns: rename four with a Drizzle `RENAME COLUMN` migration (recommended), or keep column names and rename only the TypeScript properties.
- **D3** Client folder: one `features/conversation/` with voice-named preview files (recommended), or split a small `features/voice/` for picker and preview.
- **D4** Client storage keys: keep (recommended; invisible, and a rename needs a read-old shim), or rename.
- **D5** Settings route `/settings/voice` becomes `/settings/conversation`, no redirect (recommended).
- **D6** Operation ids: split, `conversation.*` for the exchange and `voice.*` for picking and previewing (recommended), or move all to `conversation.*`.

## Approved (owner, 2026-11-20)

D1 to D6 all approved as recommended. Accept both "Voice call request:" and the new prefix for one release. UI copy capitalises "Conversation". Phase 2 starts only after the Settings and band branches merge into voice/follow-up.
