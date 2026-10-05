# Voice mode: where a hands-free voice UI lives, and what Argo should copy from Codex

Researched 2026-10-05. The owner wants a fully hands-free voice assistant that drives Argo and that any Session can switch into. This note covers the UX/UI, not the audio pipeline.

## Sources

- **Codex App**: the webview bundle of the Codex IDE extension 26.908.40401 (`~/.cursor/extensions/openai.chatgpt-26.908.40401-darwin-arm64/webview/assets/`), which the ChatGPT desktop app shares. Citations name the file and the string id or symbol.
- **Desktop shell**: `/Applications/ChatGPT.app` 26.928.31416, whose `package.json` names it `openai-codex-electron`. I extracted `app.asar`. Main process: `.vite/build/main-BbeJ4AAR.js`.
- **Codex CLI and core**: openai/codex `39e013c` (2026-10-05). Paths are under `codex-rs/`.
- **Codex docs**: [ChatGPT Voice](https://learn.chatgpt.com/codex/features/voice.md), [Pets](https://learn.chatgpt.com/docs/pets.md), [Remote](https://learn.chatgpt.com/docs/remote.md).
- **Other products and platforms**: vendor help centres, developer docs, and component source, linked inline. "(secondary)" marks a claim that only press coverage supports. help.openai.com and the Perplexity help centre returned 403 to fetches, so claims from them rest on search snippets of the official pages.
- **Argo**: GLOSSARY.md, ADRs 0001–0015, and the layout agreed on 2026-10-03.

## 1. Codex voice: what it is

- **Product name.** It is called "ChatGPT Voice", powered by GPT-Live. It is in the ChatGPT desktop app on macOS and Windows, and in Remote on iOS once a desktop host is paired ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)).
- **One at a time.** "Only one voice chat can be active across the ChatGPT desktop app at a time" (same doc). Starting a second one fails with "Voice chat is already active or starting in another window" (`avatarOverlay.realtime.sessionAlreadyStarting`).
- **Two layers.**
  - A realtime speech model is the "conversational surface". A normal Codex thread is the "backend" that does the work.
  - The realtime prompt says to treat the two as "one unified assistant" and to "Delegate all user requests to the backend" (`prompts/templates/realtime/backend_prompt.md`).
  - The backend is told that "Any response you produce will be consumed by the intermediary and may be summarized", and that routed user text "may be unpunctuated or contain recognition errors" (`prompts/templates/realtime/realtime_start.md`).
  - When voice ends, the thread gets "Realtime conversation ended… Resume normal chat behavior" (`realtime_end.md`).
- **Transport.** It runs inside the Codex core, not the UI.
  - App-server methods are experimental: `thread/realtime/start`, `appendAudio`, `appendText`, `appendSpeech`, `stop` and `listVoices`.
  - Notifications are `thread/realtime/started`, `itemAdded`, `transcript/delta`, `transcript/done`, `outputAudio/delta`, `sdp`, `error` and `closed` (`app-server-protocol/src/protocol/common.rs:1066-1103, 2028-2045`).
  - Transport is WebRTC by default, or WebSocket (`config/src/config_toml.rs` `RealtimeTransport`).
  - It accepts ChatGPT login as well as an API key (`core/src/realtime_conversation.rs:1329`).
- **Feature flags.** `realtime_conversation` and `in_app_voice` are feature flags in `core/config.schema.json`. Prompts and tool switches come from Statsig: `transfer_voice_call_enabled`, `end_realtime_voice_call_enabled`, `navigate_to_codex_page_enabled`, `existing_thread_voice_enabled` (app-initial-a190b16fc630 `RT`).

## 2. Codex voice: entry points

- **Desktop App.**
  - The composer has "Start voice chat" in an existing task and "Start new voice chat" in a new one. "Stop voice chat" ends it ([voice doc](https://learn.chatgpt.com/codex/features/voice.md); `composer.realtime.start`, `composer.realtime.startNewVoiceChat`).
  - The code has four start sources: `composer_button_new_thread`, `composer_button_existing_thread`, `avatar_overlay_button_new_thread` and `global_hotkey_new_thread` (app-initial-a190b16fc630 `tyn`).
- **Global hotkey.** "Start a Voice Chat from anywhere on desktop", set in Settings > Voice > Voice chat hotkey. Commands also exist for "End Voice Chat", "Toggle Voice Chat microphone" and "Toggle Voice Chat audio" (`codex.commandDescription.realtimeVoice*`).
- **Pet overlay.** The floating pet or "Mini" controls have a voice icon. A chat started there is "outside a project" ([Pets](https://learn.chatgpt.com/docs/pets.md); `avatarOverlay.quickChatBar.startVoice`).
- **First run.** An intro screen reads "Meet ChatGPT Voice", with three cards: "Explore, plan, and learn", "Work across projects" ("Start new tasks, coordinate work in progress… without micromanaging"), and "Work across your desktop" (`realtimeVoice.nux.*`). The user then grants the mic, picks a voice and reviews screen context ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)).
- **TUI.** `/voice` is described as "start or stop voice; use /voice settings to choose a voice" (`tui/src/slash_command.rs:138`). Without a thread it refuses with "No active thread is available." (snapshot `realtime_start__rejected_voice_start_no_active_thread`).
- **Hardware.** A "Codex Micro" settings page maps a mic key to "Push to talk" ("Hold to dictate or double-tap to keep recording") or "Voice Chat" ("Tap to start a Voice Chat or toggle your microphone, then hold to end") (`settings.codexMicro.microphoneKey.*`). I could not confirm what product that is.

## 3. Codex voice: the live surface

There are two surfaces. The code calls them `main-thread` and `global-overlay` (`preferredPresentationSurface`, app-initial-a190b16fc630 `Tpn`; avatar-overlay-native-page).

**In the thread (`main-thread`)**

- **Start.** A launch layer covers the thread and shows a pulsing dot. It morphs into an orb 112 px across, centred at the bottom of the thread above the composer.
  - The layout is `absolute inset-x-0 bottom-0 … max-w-[900px]`.
  - A screen-reader status announces "Starting voice chat" (realtime-voice-launch-surface `Ee`, `de`).
- **Failure.** A full-pane card offers "Try again", "Send feedback" and "Back". A denied mic gets "Open system settings" (`realtimeVoice.launch.*`).
- **Composer controls.** "End" (or "Cancel" while connecting, "Ending…" while closing), "Mute microphone" / "Unmute microphone", and "Mute speakers" / "Mute voice chat" (`composer.realtime.*`). Mic mute and output mute are separate.
- **Orb state.**
  - The orb takes `phase` (`inactive`, `starting`, `active`, …) and `voiceActivity` (`idle`, `listening`, `thinking`, `speaking`) (app-initial-a190b16fc630 `l0e`, `Vhn`).
  - Two sounds mark the edges of the call: `realtime-start` and `realtime-end`.
  - Mute and unmute have their own sounds (`realtime-voice-mute.wav`, `realtime-voice-unmute.wav` in assets).
- **Sidebar.** The task row reads "Voice chat active" (`sidebarTaskRow.realtimeStatus`). A voice-born task is labelled "Voice chat" (`codex.localTaskRow.voiceChat`).
- **Transcript in the Feed.**
  - Spoken turns become a `realtime-transcript` Feed item, with `entries` and a `handoffId`.
  - It is a standalone unit that is never folded into "Worked for" (conversation-blocks `YG`).
- **Visual content.** The voice model shows exact Markdown, links, code or images by prefixing its output with `::codex-realtime-inline{}`, which the thread draws as `inline-markdown` (app-initial-bca4f920746a `pdt`). Voice can therefore put things on screen that it does not read aloud.

**Floating overlay (`global-overlay`)**

- **The window.**
  - In Electron it is an always-on-top, non-focusable window that does not resize. On macOS it has native glass and a non-activating panel bridge (main-BbeJ4AAR `avatarOverlay` window options).
  - It floats over other apps: "a pet can float above other app windows" ([Pets](https://learn.chatgpt.com/docs/pets.md)).
  - Option+Space shows the controls on macOS, Windows+Alt+P on Windows.
- **Controls.** Mute microphone, mute output, Stop voice chat, "Open voice chat", and "Resume voice chat" (`avatarOverlay.*`).
- **Handoff animation.** The orb flies between the overlay and the thread when the user switches surfaces (realtime-voice-handoff-target `m`, `data-realtime-voice-handoff-target`).
- **Codex activity caption.** A caption under the orb shows live work: "Thinking", "Running command", "Editing a file", "Searching the web for {query}", "Waiting for thread", "+{count} more" (`realtimeVoice.codexStatus.*`, avatar-overlay-native-page).
- **Delegation cards.** "Created task: {title}" (body: the prompt, or "Working on delegated request"), "Sent to {title}", "Returned from {title}", and "Update from {title}" with "Task finished / failed / stopped / is still working" (`realtimeVoice.task*`, avatar-overlay-native-page `xo`).
- **Activity tray.** Cards can be expanded or collapsed, and offer "Follow up on {title}", "Reply", "Stop {title}", "Mute task" and "Open notification" (`avatarOverlay.*Notification*`).
- **Pet status.** Running / Needs input / Ready / Blocked. Ordering: "the pet prioritizes chats that need input, followed by blocked, ready, and running" ([Pets](https://learn.chatgpt.com/docs/pets.md)).

**TUI**

- **Status strip.** A strip above the composer reads `voice ● listening   ⌃x mute   /voice stop`, with `mic ▁▁▇▇ codex ▁▁██` level meters. Its states are `connecting`, `listening`, `speaking`, `muted` and `heard` (after barge-in) (`tui/src/chatwidget/realtime/snapshots/…voice_footer_renders_the_main_conversation_states.snap`).
- **Reduced motion.** It hides the meters (`bottom_pane/voice_strip.rs:1-3`).
- **Transcripts.** Partial transcripts are hidden. The final spoken prompt becomes a user cell with a red `›` (`history_cell/messages.rs` `new_spoken_user_prompt`). File names in a spoken answer become links (`history_cell/spoken_artifacts.rs`).

## 4. Codex voice: handing work to the coding agent

- **Voice inside an existing task.** Voice "uses that task's conversation and selected model to carry out your requests" ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)).
  - The fallback start instructions keep the task's role and permissions.
  - Every backend reply must begin with `[STATUS]` (progress) or `[COMPLETE]` (final result, question, or blocker). `[ANALYSIS]` is silent (app-initial-a190b16fc630 `FT`).
  - These prefixes decide what the voice says aloud and when.
- **New voice chat = coordinator.** The fallback developer instructions begin "You are coordinating a voice chat" and pick one of three modes (app-initial-a190b16fc630, `new_thread_developer_instructions` fallback):
  - **Converse here**: brainstorming, prioritising, clarifying.
  - **Quick check here**: for example, the current branch or a short status.
  - **Delegate blocking mechanics**: implementation, deep investigation, browsing.
    - Delegation uses `list_projects`, `create_thread` (worktree when the Project is a git repo), `list_threads`, `send_message_to_thread` and `wait_threads`.
    - Each worker must "send a short message back to this coordinator thread" when done or blocked.
    - "If the task needs user choices, have the worker gather options and report back; keep the choice and confirmation in this coordinator thread."
- **App tools.** The voice can also drive the App: `navigate_to_codex_page` ("Opening chat"), `open_review`, `open_terminal`, `open_in_codex`, `set_thread_pinned`, `set_thread_archived`, `capture_screen_context`, `end_realtime_voice_call` and `transfer_voice_call` (`localConversation.codexTool.*`).
- **Transfer.** "Let me talk to the task reviewing the tests", then "Take me back to the previous task" ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)). In code, a transfer stops the call with `preserveGoal`, opens the target thread, and restarts voice there with `isTransfer` (avatar-overlay-native-page `onTransfer`).
- **Reporting back.**
  - The voice summarises and does not read structured output: "Do not read out or recreate tables, diffs, plots, code blocks…" and "Briefly tell the user the key takeaway, status, or next step without repeating visible content" (`backend_prompt.md`).
  - Update frequency is a "task-level preference" that sticks once the user sets it (same file).
- **When a session ends.** The rest of the transcript is handed to the thread with "You probably do not have to do anything" (`core/src/realtime_conversation.rs:122`).

## 5. Codex voice: Permission requests, interruption, idle, background

- **Permission requests stay with the user, on screen.**
  - The coordinator must "leave approval or user-input requests for the user" (coordinator instructions above).
  - Voice "follows the same permissions as the tasks it directs" ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)).
  - The overlay draws the waiting request with buttons: "Allow", "Allow once", "Run once", "Deny", "Allow network", "Apply changes", "Implement plan", "Review command" (`avatarOverlay.waitingRequest.*`). The pet status becomes "Needs input".
  - I found no code path that approves by voice. Whether the voice reads the request aloud is set by server-side prompts that I could not read.
- **Barge-in.** "You can interrupt ChatGPT during a response" ([voice doc](https://learn.chatgpt.com/codex/features/voice.md)). Core truncates the spoken item with `conversation.item.truncate` (`realtime_conversation.rs:2534`). The TUI shows `heard`.
- **Ending.** The user taps End, or the model calls `end_realtime_voice_call`. Its prompt says "a request to stop work, stop speaking, or pause is not sufficient" to end (app-initial-a190b16fc630).
- **Idle auto-close.** The call closes after a quiet period that grows from 5 s to 60 s over the first 5 minutes of the call. It is blocked while `active-orchestrator-work` runs, and only applies to start sources that Statsig marks eligible (app-initial-a190b16fc630 `x2`, `eyn`).
- **Usage limit.** A warning reads "You're approaching your Codex usage limit, so this voice chat may end soon" (`composer.realtime.usageLimitApproaching`).
- **Background.** On desktop the always-on-top overlay is the background surface. Remote on iOS supports voice. I found no first-party statement about a Live Activity, lock screen or CarPlay for Codex voice.
- **Settings.** Voice choice: arbor, breeze, cove, ember, juniper, maple, sol, spruce, vale, each with a description (`settings.general.realtimeVoice.voice.*`). Hotkeys. Screen context ("Take a look at this" makes an appshot).
  - Push-to-talk exists only for dictation, which is a separate feature with "Hold-to-dictate hotkey" and "Listening / Transcribing…" in a global overlay window (`globalDictation.*`).
  - A notice suggests "Switch to Light for faster Voice replies" (`realtimeVoice.reasoningNotice.*`).

## 6. Other voice products

**ChatGPT (mobile and web)**

- **Inline voice.** Since 25 Nov 2025, voice runs "right inside the chat", with streamed text, images and widgets in the thread. "Separate mode" in Settings brings back the full-screen blue orb ([release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes), [Voice FAQ](https://help.openai.com/en/articles/8400625-voice-mode-faq)).
- **Controls.** Mic mute and Exit. A transcript is added to the chat.
- **Background.** "Background conversations" keeps voice running in other apps and on a locked phone, for up to 1 hour. iOS shows it as a Live Activity on the Lock Screen and in the Dynamic Island ([ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice)).
- **CarPlay** (iOS 26.4+): start voice, or continue recent or pinned chats ([CarPlay help](https://help.openai.com/en/articles/20001153-using-chatgpt-in-carplay)).

**Gemini Live**

- **Entry.** On Android, "Hey Google" or a long press of the power button opens an overlay above the current app ([help](https://support.google.com/gemini/answer/14554984?hl=en&co=GENIE.Platform%3DAndroid)).
- **Controls.** Hold (pauses the mic), Mute, End (shows the transcript), camera, screen share, and captions ([help](https://support.google.com/gemini/answer/15274899?hl=en&co=GENIE.Platform%3DAndroid)).
- **Barge-in.** You can speak over Gemini, and a setting turns this off. A tap always pauses.
- **Background.** It keeps running via the "Live with Gemini" notification. The iOS lock screen shows Hold and End ([iOS help](https://support.google.com/gemini/answer/15274899?hl=en&co=GENIE.Platform%3DiOS)).
- **App actions.** Undo comes after the action, with no prompt before it. Undo is not possible while Live runs in the background (same help).
- **2026 redesign** (secondary, [9to5google](https://9to5google.com/2026/04/19/gemini-live-app-redesign/)): full screen gave way to a floating pill inside the chat, which becomes a draggable circle over other apps.

**Claude**

- **Entry.** A sound-wave button next to the mic.
- **Talking.** Hands-free by default, with push-to-talk optional. You interrupt by talking, and "Stop" ends it. Your words fill the message box, and transcripts stay in the chat ([help](https://support.claude.com/en/articles/11101966-using-voice-mode-on-claude-mobile-apps)).
- **Connected tools.** Claude "will ask for permission before using one of your connected tools", and "not every result can be shown on screen in voice mode" ([blog](https://claude.com/blog/think-through-hard-problems-in-voice-mode)).
- **Coding CLI.** Claude Code `/voice` is dictation only, not conversation. Hold mode shows `listening…`; tap mode shows `● REC · tap to send` ([docs](https://code.claude.com/docs/en/voice-dictation)).

**Siri and Alexa+**

- **Siri.** A glow around the screen edge, and Type to Siri ([newsroom 2024](https://www.apple.com/newsroom/2024/06/introducing-apple-intelligence-for-iphone-ipad-and-mac/)). App actions confirm through App Intents `requestConfirmation`, a snippet with a confirm button that can be shown or spoken ([docs](https://developer.apple.com/documentation/appintents/appintent/requestconfirmation())). iOS 27 adds a standalone Siri app with history ([newsroom 2026](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/)).
- **Alexa+.** Works "behind the scenes" and comes "back to tell you it's done" ([Amazon](https://www.aboutamazon.com/news/devices/new-alexa-generative-artificial-intelligence)).

**Copilot, Perplexity, Meta, Grok**

- **Copilot.** "Hey, Copilot" on Windows opens a floating voice UI at the bottom of the screen, with chimes. It ends with X or a few seconds of silence ([Windows blog](https://blogs.windows.com/windows-insider/2025/05/14/copilot-on-windows-hey-copilot-begins-rolling-out-to-windows-insiders/)).
- **Perplexity.** On Android it is the default assistant, "a layer on top of your device" ([help](https://www.perplexity.ai/help-center/en/articles/10450852-how-to-use-the-perplexity-android-assistant)). On iOS it starts from the Action button ([help](https://www.perplexity.ai/help-center/en/articles/11132456-how-to-use-the-perplexity-voice-assistant-for-ios)).
- **Meta AI.** A "Ready to talk" setting, a mic-in-use icon, and conversations that move between glasses and app ([Meta](https://about.fb.com/news/2025/04/introducing-meta-ai-app-new-way-access-ai-assistant/)).
- **Grok.** Has voice with camera ([xAI](https://x.ai/news/grok-4)). Its controls are not documented.

**Embeddable agents**

- **ElevenLabs widget.**
  - Placement: one of six corners or edges. Size: `tiny`, `compact` or `full`.
  - States: "Connecting", "Listening", and "Talk to interrupt" while it speaks.
  - Optional transcript and text input. Mute and End buttons.
  - Tool calls appear as a transcript row: "Working..." → "Completed" / "Error occurred".
  - Ends with "You ended the conversation" or "The agent ended the conversation" ([docs](https://elevenlabs.io/docs/agents-platform/customization/widget); `elevenlabs/packages` `convai-widget-core/src/types/config.ts`, `widget/TranscriptMessage.tsx`).
- **ElevenLabs UI** ([github.com/elevenlabs/ui](https://github.com/elevenlabs/ui), `registry/elevenlabs-ui/ui/`):
  - `Orb`, with `agentState` null / `thinking` / `listening` / `talking`.
  - `BarVisualizer`: connecting / initializing / listening / speaking / thinking.
  - `VoiceButton`: idle / recording / processing / success / error.
  - `ConversationBar`: waveform, mute, keyboard toggle, hang-up.
  - Plus `LiveWaveform`, `TranscriptViewer` and `MicSelector`, and blocks `voice-chat-01..03`.
- **Vapi and Retell.** Floating corner widgets with the same size ladder, a voice/chat switch, mute, end, and an optional transcript ([Vapi](https://docs.vapi.ai/chat/web-widget), [Retell](https://docs.retellai.com/deploy/chat-widget)).
- **Hume EVI.** Start/end, mute, a mic visualiser, a message list, and a `hang_up` tool ([docs](https://dev.hume.ai/docs/speech-to-speech-evi/configuration/tools)).
- **Sesame.** iOS preview with 30-minute calls and a summary after each call (secondary).

**Dictation-first**

- **Wispr Flow.**
  - A "Flow Bar" pill at the bottom of the screen, which can be dragged to an edge.
  - Push-to-talk, or hands-free via Fn+Space or a double tap. Esc cancels. It auto-stops on silence.
  - On Android, a shrinking "Flow Bubble" ([docs](https://docs.wisprflow.ai/articles/6391241694-use-flow-hands-free)).
- **Superwhisper.** A recording window with a waveform and the mode, which shrinks to a persistent mini window ([docs](https://superwhisper.com/docs/get-started/interface-rec-window)).
- **macOS Dictation.** A pulsing insertion point; stops after 30 s of silence ([Apple](https://support.apple.com/guide/mac-help/use-dictation-mh40584/mac)).
- **Cursor.** Hold Ctrl+M: waveform, timer, cancel/confirm. The mic stays usable while an agent runs ([changelog](https://cursor.com/changelog/3-1)).

## 7. Platform surfaces for hands-free use

**iOS**

- **Live Activity** ([ActivityKit](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)):
  - Up to 8 h in the Dynamic Island, plus up to 4 h on the Lock Screen. 4 KB of data.
  - Presentations: compact, minimal, expanded.
  - Buttons via App Intents. They do not act in CarPlay.
  - The HIG names apps "that access the microphone to record live audio" as a fit for controls ([HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)).
- **AudioRecordingIntent** (iOS 18). The app "must start a Live Activity when recording begins and keep it running, or recording stops" ([docs](https://developer.apple.com/documentation/appintents/audiorecordingintent)). A Live Activity is therefore required, not optional, for background voice started by an intent.
- **Background audio.** `playAndRecord` plus the `audio` background mode keeps the mic open while the phone is locked. The orange dot shows ([AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playandrecord), [Apple Support](https://support.apple.com/en-us/108331)).
- **Starting points.** `ControlWidget` (iOS 18) puts a start button in Control Center, on the Lock Screen, and on the Action button ([docs](https://developer.apple.com/documentation/swiftui/controlwidget)).
- **AirPods mute.** The stem press mutes through `AVAudioApplication.setInputMuteStateChangeHandler` ([docs](https://developer.apple.com/documentation/avfaudio/avaudioapplication)).
- **CallKit / LiveCommunicationKit.** Built for VoIP calls ([docs](https://developer.apple.com/documentation/livecommunicationkit)). Showing an AI session as a phone call is an App Review risk. I could not confirm a rule either way.
- **CarPlay.**
  - There is a "voice-based conversational apps" category, with the entitlement `com.apple.developer.carplay-voice-based-conversation`, iOS 26.4+ ([CarPlay](https://developer.apple.com/carplay/), [entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.carplay-voice-based-conversation)).
  - From iOS 27 the Voice Control template has a prompt, an animated state icon, and up to 2 action buttons ([WWDC26 212](https://developer.apple.com/videos/play/wwdc2026/212/)).
  - Live Activities appear in CarPlay.

**Android**

- **Foreground services.** A `microphone` foreground service cannot start from the background on Android 14+ ([restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)). Exemptions: tapping a notification, widget or bubble; being the `VoiceInteractionService` / `ROLE_ASSISTANT` holder; or a visible overlay window (Android 15+). Each foreground service needs a notification.
- **Notification styles.** `CallStyle.forOngoingCall` ([docs](https://developer.android.com/reference/androidx/core/app/NotificationCompat.CallStyle)). Live Updates promote "ongoing phone calls" and user-started activities to a status-bar chip ([docs](https://developer.android.com/develop/ui/views/notifications/live-update)).
- **Bubbles** are for ongoing conversations ([docs](https://developer.android.com/develop/ui/views/notifications/bubbles)).
- **Android Auto** has no conversational category yet. "Conversational templates" are announced without a date ([blog](https://android-developers.googleblog.com/2026/05/android-for-cars-unifying-platforms-premium-experiences.html)).

**Web**

- **Media Session.** `togglemicrophone` and `hangup` action handlers, with uneven browser support ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler)).
- **Document Picture-in-Picture.** An always-on-top HTML window, desktop Chrome 116+ only, opened by a user gesture ([Chrome](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)).
- **Background tabs.** A tab playing audio is not throttled ([Chrome](https://developer.chrome.com/blog/background_tabs)).
- **Wake Lock.** Released when the tab is hidden ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)).

**macOS (Electron)**

- **Floating panel.** `type: 'panel'` makes a non-activating panel that floats over full-screen apps on every Space ([BaseWindowOptions](https://github.com/electron/electron/blob/main/docs/api/structures/base-window-options.md)). `setAlwaysOnTop` takes a level ([docs](https://www.electronjs.org/docs/latest/api/base-window)). Codex uses exactly this for its overlay (section 3).
- **Menu bar.** `Tray` ([docs](https://www.electronjs.org/docs/latest/api/tray)).
- **Shortcuts.** `globalShortcut` has no key-up event, so push-to-talk needs a native module (inferred from the [docs](https://www.electronjs.org/docs/latest/api/global-shortcut)).

**Expo**

- **Live Activities.** `expo-widgets` builds iOS widgets and Live Activities in a development build ([docs](https://docs.expo.dev/versions/latest/sdk/widgets/)).
- **No first-party modules** for an Android foreground service, ControlWidget or AudioRecordingIntent. Argo would need its own native module.

## 8. Comparison

| Product | Entry point | Live surface | Transcript | Interruption | Background / lock | Shows agent work | Confirmation |
|---|---|---|---|---|---|---|---|
| Codex App | Composer button, global hotkey, pet icon | Orb above the composer in the thread; or always-on-top pet overlay | Spoken turns as a Feed row; visuals via inline Markdown | Barge-in | Desktop overlay; Remote on iOS (surface unknown) | Overlay caption ("Running command", "Waiting for thread") and task cards ("Created task", "Returned from") | On-screen buttons; the coordinator leaves approvals to the user |
| Codex TUI | `/voice` | Strip above the composer with meters | Final prompt as a user cell | `heard` state | None | Normal Feed | Normal TUI |
| ChatGPT mobile | Voice button in the composer | Inline in the chat (full-screen orb optional) | Yes, in the chat | Barge-in | Live Activity, Lock Screen, CarPlay | Widgets and search results inline | Not documented |
| Gemini Live | Button, "Hey Google", power key | Overlay or pill; full screen earlier | After End; captions optional | Barge-in, tap to pause, Hold | Notification card; iOS lock screen | Connected-app results | Undo afterwards |
| Claude | Sound-wave button | Message box fills while you speak | Yes | Barge-in | Not documented | Partial on screen | Asks before using a tool |
| Siri | Side button, voice, Island swipe | Edge glow; panel | Type to Siri | – | System | App snippets | `requestConfirmation` snippet |
| Copilot Windows | "Hey, Copilot" | Floating bar at bottom | Afterwards | Barge-in | PC must be unlocked | Not documented | Not documented |
| Perplexity | Default assistant, Action button | Overlay on top of the device | Yes | Not documented | Not documented | Action cards (not confirmed) | Not confirmed for voice |
| ElevenLabs / Vapi / Retell | Corner trigger | Floating sheet | Optional | "Talk to interrupt" | Web page only | Inline "Working…" row | Consent modal only |
| Wispr Flow | Hotkey, pill | Bottom pill | Pasted text | Esc cancels | Pill stays | None | None |

## 9. Patterns

- **P1, full-screen orb.** The old ChatGPT mode, now opt-in. It is clear while you look at it, but it hides the work, and coding output needs the screen.
- **P2, voice inline in the thread.** Used by ChatGPT since 2025, Claude, the Codex `main-thread` surface and the Codex TUI. The composer turns into a voice bar, spoken turns land in the Feed, and visual output stays on screen.
- **P3, floating pill or companion.** Codex pet overlay, Gemini pill/bubble, Wispr bar, Copilot bar. A small always-on-top object that summarises state and holds Mute/End/Open.
- **P4, edge glow.** Siri. The whole screen signals "listening" without taking space. It cannot carry controls.
- **P5, system surfaces.** Live Activity / Dynamic Island, the ongoing notification, CarPlay templates, Media Session. These are the only place hands-free UI can live when the App is not in the foreground. On iOS, AudioRecordingIntent requires one.
- **P6, coordinator plus workers.** Codex alone does this. A voice thread delegates to worker threads and reports back with "Created / Sent to / Returned from / Update from" cards.
- **P7, speak the gist and show the detail.** Codex prompts and Claude ("not every result can be shown") agree: summarise aloud, and put diffs, tables and code on screen.
- **P8, approvals by tap or undo.** No product approves a risky action by voice alone. Codex and Siri confirm on screen; Gemini offers undo afterwards.

## 10. Options for Argo

**Scope of voice**

- **A. Voice attached to one Session.** Voice becomes a mode of that Session's Turns: spoken input becomes the prompt and Agent messages are spoken back. This is simple and matches "any Session can turn into voice mode". It cannot start other Sessions or answer "what is blocked?".
- **B. One app-wide Voice session that focuses one Session at a time.** This is Codex's model.
  - Started inside a Session, it is focused on that Session (A's behaviour).
  - Started from anywhere else, it is a coordinator. It can list Sessions, start a Session in a Project, send a prompt, wait, switch focus ("talk to the test-fix Session", "take me back"), open screens, and end itself.
  - Only one exists at a time.
- **C. One voice per Session.** Rejected: several mics and voices at once, and Codex already allows only one.

**Recommendation: B.** It contains A as its focused case, and it is the only option that controls "the Argo app hands-free". Specifics:

1. **Location.** The Voice session lives on the Server (ADR 0002), so a phone and a desktop see the same Voice session and Turns go on when an App closes. The App owns only the mic, the speaker and the surfaces.
2. **Glossary.** "Voice session" would be a new term. It is not a Session, because it has no Agent; or it becomes a Session kind. Owner decision.

**Live surfaces per platform**

| Context | Surface |
|---|---|
| Focused Session on screen (both layouts) | P2. The composer slot becomes a voice bar: state (listening / thinking / speaking / muted), Mute, End, and a keyboard button to type. Spoken user turns and spoken summaries land in the Feed. The Live header keeps showing Agent work. |
| Elsewhere in the App, desktop ≥720 px | A voice pill in a fixed place in the shell, perhaps in the rail. It shows the focused Session's name, Live header and state, with Mute / End / Open. |
| Elsewhere in the App, phone | A floating pill above content, with the same contents. It opens the focused Session. A popover lists the Sessions that need you. |
| macOS, another app in front | An Electron always-on-top non-activating panel, the Codex pattern, plus a Tray icon. Same pill contents. Needs a decision under ADR 0001. |
| iOS locked, backgrounded, in a pocket | Live Activity. Compact: state glyph + Session name. Expanded: Live header, the waiting Permission request, Mute / End buttons. Also AirPods stem mute, a ControlWidget / Action button to start, and later CarPlay through the voice-conversation entitlement. |
| Android backgrounded or locked | A `microphone` foreground service with an ongoing CallStyle notification (Mute / End), promoted to a Live Update chip. A bubble is optional. |
| Web tab hidden | Keep the call alive with audio playing, and register Media Session `togglemicrophone` / `hangup`. Document PiP is optional on desktop Chrome. |

**Speaking and showing**

- **Permission requests.**
  - Speak them at once, ahead of other speech: "Claude wants to run `pnpm test` in argo. Allow once, or reject?"
  - Show the same card in the Feed, the pill, the Live Activity (buttons) and the notification.
  - Accept spoken "allow once" or "reject" only after a read-back, and never "always allow" by voice (P8).
  - Codex keeps approvals on screen only. Allowing voice approval is an owner decision.
- **Long-running Turns.**
  - Stay quiet while a Turn runs, unless the user asked for updates; Codex treats that as a sticky preference.
  - Speak at a Permission request, an Elicitation, the stop reason, or when asked "how's it going".
  - On the screen, the Live header is the progress line, as in the Codex overlay caption.
- **Several running Sessions.**
  - The focused Session speaks freely. Others speak only one-line events, queued and never over the user: "test-fix needs permission", "docs Session finished".
  - Priority follows Codex's pet: needs input, then blocked, ready, running.
  - Sessions with a running Voice session carry a badge in the list (Codex: "Voice chat active").
- **Glanceable screen.** One line of state ("Listening" / "Thinking" / "Speaking" / "Muted"), the focused Session's name and Live header, a count of Sessions waiting on you, and Mute / End. Code, diffs and tables appear on screen but are never read aloud (P7).
- **Ending.**
  - The user says "end voice", taps End, or a quiet timeout fires. The timeout is blocked while a focused Turn runs, as in Codex.
  - "Stop" means cancel the Turn, not end voice. Codex draws the same line.

## 11. ADRs these ideas touch

- **ADR 0004** (subscription logins, no `OPENAI_API_KEY`). A realtime speech model needs some vendor's account.
  - Codex's realtime accepts ChatGPT login, but only inside a Codex vendor session.
  - A voice layer that serves Claude Sessions too needs either a speech provider outside the Agent adapters or on-device speech recognition and synthesis.
  - Either way it conflicts with ADR 0004 and the vendor-name rule unless it sits behind an adapter.
- **ADR 0012** (only human-typed text becomes a user message). A spoken prompt is not typed. Argo needs a rule, such as a `user_message` with `_meta.argo.spoken`, like the Codex TUI's spoken cell. Or the ADR needs an amendment.
- **ADR 0001** (desktop has no UI of its own). An always-on-top panel or Tray menu is a second Electron surface. It can load an Expo web route, but a native Tray menu is desktop-only UI.
- **ADR 0002** (Server owns machine work). This supports keeping the Voice session on the Server. Audio capture and playback must stay in the App.
- **ADR 0003** (XState for every lifecycle). The Voice session lifecycle needs its own machine with model-based tests: connecting, listening, thinking, speaking, muted, transferring, ending.
- **ADR 0015** (one Agent machine). A coordinator Voice session is not an Agent. Keep it out of `agentMachine`, or model it as an adapter. Owner decision.

## Open questions for the owner

1. Option B (an app-wide Voice session that focuses a Session) or A (voice per Session only) for the first version?
2. Should a Voice session be a Session kind with its own Feed, as in Codex, or a separate thing with no Feed?
3. Where does speech come from, given ADR 0004: OpenAI realtime through the Codex adapter only, a separate speech vendor, or on-device speech recognition and synthesis?
4. May Permission requests be answered by voice ("allow once" or "reject" after a read-back), or only on screen, as in Codex?
5. Should other Sessions be allowed to interrupt with spoken events, or only show them?
6. Should a Live Activity, an Android ongoing notification and a macOS floating panel all be in the first version, or the in-App pill first?
7. Should push-to-talk exist alongside hands-free, as in Claude, or hands-free only, as in Codex voice?
8. Is dictation in the composer (Codex's ⌃⇧D, Claude Code `/voice`) a separate, earlier feature?
9. Should spoken prompts appear in the Feed as user messages, which needs an ADR 0012 amendment, or as a separate transcript row, as Codex's `realtime-transcript` does?
10. Should CarPlay through the iOS 26.4 voice-conversation entitlement be in scope at all?
