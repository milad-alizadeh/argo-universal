---
status: accepted
---

# A Voice call belongs to the Server and speaks for one Session

Owner-approved decision, 2026-11-18, reached in a grilling Session after two spikes against the live service. The pipeline evidence is in [`docs/research/voice-mode.md`](../research/voice-mode.md), section 13.

A person can talk to a Session instead of typing. A Voice call is attached to one Session on any Agent. A voice model hears the person and speaks back; when the person asks for work, the Server sends it to the Session's Agent as a Prompt and tells the voice what the Agent answered. The Server owns the Voice call and the App only carries sound, so one design serves every Agent and every Voice provider.

## Decision

- **The Engine owns the Voice call.** Its lifecycle is one XState machine in the Engine (ADR-0003). The Engine holds the Voice provider's control link, receives what the person asked for, and sends replies back. A Voice call ends when the person ends it, when the Agent ends it, after an idle stretch, when its Session closes or is archived, when the App quits, when the Engine restarts, and when the control link is lost for more than a few seconds.
- **The App carries only sound.** It captures the microphone, plays the voice, and draws the call. Audio travels straight between the App and the Voice provider; the Engine relays only the connection offer and answer. The Engine receives raw audio on the control link as a side effect and discards it. Audio is never written anywhere.
- **A Voice call is attached to one Session.** It stays with that Session when the person looks at another one. One Voice call runs per App. The Session's Agent already has Argo's Operations, so it can start, prompt and watch other Sessions with no voice-specific work.
- **Voice providers sit behind one interface.** A provider starts a call from an offer, reports what the person and the voice said, reports each request for work, accepts text to speak or to keep as background, and ends the call. The interface names no vendor; only the provider module does.
- **A request for work is a Prompt sent by the Voice call.** The Voice call is a Prompt sender (ADR-0012). The Prompt goes through the Server's prompt queue (ADR-0054) like any other: it steers a running Turn when the Agent supports that, and otherwise waits its turn. Because Argo sent the Prompt, the Turn has a start, a user side and a stop reason like every other Turn.
- **The Feed is the transcript of the person and the voice, plus the Agent's work.** What the person said and what the voice said are stored as Feed rows. The Agent's Turn is drawn as usual. The text passed between the voice and the Agent is stored and never drawn.
- **The Session is the Voice call's memory.** A Voice call keeps nothing between calls. A new call is briefed from the Session's title, working folder and recent Feed, which includes the earlier call's transcript.
- **Every Agent is told how to answer a voice.** The first Prompt of each Voice call carries an instruction to mark each message as progress, as a result, or as silent analysis. The Feed strips the marks. An unmarked message counts as progress until the Turn ends.
- **Spoken consent is the person's own.** The voice announces a Permission request in plain words from the request's title, kind and target. The person's spoken allow-once or reject is applied through the same path a click uses (ADR-0044), and only when a spoken turn of the person's arrived after the announcement. Always-allow stays a click. Saying "stop" cancels the Turn.
- **GPT-Live is the first Voice provider and runs on the ChatGPT subscription.** The Engine asks the installed Codex for a ChatGPT token, holds it in memory for the length of a call, never stores it and never refreshes it (ADR-0004). The provider is usable only when Codex is installed and signed in. It uses a private ChatGPT endpoint, so Settings labels it experimental.
- **Desktop first.** The first version runs in the desktop App only. Mobile needs a native audio module and its own drawing of the call.

## Considered options

- **Let Codex's app-server run the call, on a socket shared with the Codex adapter.** Spiked and working, but it serves Codex Sessions only, and a Turn the voice starts reaches ACP with no start, no stop reason and no user side. Rejected for the direct route, which costs about the same and serves every Agent.
- **A hidden Codex Session that coordinates other Sessions through Operations.** Works with what was already proven, but every request takes two hops, spends Codex tokens on relaying, and the voice never talks to the Session on screen. Kept only as the fallback if the private endpoint closes.
- **The public OpenAI Realtime API.** Documented and stable, but it bills an API key, against ADR-0004's subscription rule. It stays available as a later Voice provider.
- **An app-wide voice assistant attached to no Session.** Rejected for the first version: the Composer button implies the Session in front of the person, and a second kind of target can be added later without changing the provider interface.
- **An Operation that answers a Permission request.** Rejected: any Agent, and anything holding the control token, could then approve an Agent's own request. ADR-0044's exception for consent stands.
- **Argo's own OAuth sign-in to ChatGPT.** Rejected: OpenAI registers no third-party client, so Argo would present Codex's client id, and two refreshers of one rotating token sign each other out.

## Consequences

- The private endpoint can change without notice, and its use from a client other than OpenAI's may be against OpenAI's terms. The owner accepted this. A breakage shows as GPT-Live being unavailable, never as a broken Session.
- The voice hands over work only while the Engine holds the control link. If the link drops and the call continues, the voice keeps saying it is working while nothing happens. Ending the call on a lost link is therefore a rule, not a nicety.
- A person with a Claude Session and GPT-Live spends two subscriptions: voice on ChatGPT, work on Claude.
- The Engine handles the person's voice in passing even though it stores none of it.

## Custom voices and instructions, open to Agents and the CLI

Owner amendment, 2026-11-19 (#2469). The Voice call's Operations stay App-only, with these exceptions beside `voice.hangUp`: `voice.getSettings`, `voice.listVoices`, `voice.setVoice`, `voice.saveCustomVoice`, `voice.deleteCustomVoice`, `voice.setInstructions`, `voice.setCallOptions`, `voice.listDevices` and `voice.chooseDevices`. Agents and the CLI run them like any other settings change: reading is `read`, changing is `confirm`. They grant nothing, and change only what the next call speaks with and is told, except volume and microphone gain (below). Starting, ending and previewing a call, reading its status, turning Voice calls on or off and choosing the Voice provider stay the App's.

- **A custom voice is a built-in voice plus a description.** GPT-Live cannot make a voice from a description; it has a fixed set of voices. A custom voice is therefore a name, one of the provider's built-in voices, and a description of how it speaks, which is sent with the call's instructions.
- **Argo's own instructions always come first.** A call is told Argo's fixed instructions, then the custom voice's description, then the person's custom instructions, then the Session's briefing. Nothing the person writes comes before Argo's words.
- **Settings are kept on the Server.** Custom voices, custom instructions and the chosen voice live in the Server's settings, so every Device reads the same values.
- **A change applies from the next call.** GPT-Live refuses new instructions on a running call: a `session.update` sent on the control link is answered with `immutable_field_update`, "Instructions cannot be updated after initialization" (live probe, 2026-11-19, #2469). Codex never sends one on a WebRTC call either. So the voice, a custom voice and the instructions are read when a call is created.
- **Call options are Argo's, unless the service honours them.** `voice.setCallOptions` keeps the filler words, an opening note, what the voice reads out, the idle timeout, the volume and the microphone gain. Only two go to GPT-Live: the filler words (`delegation.ack_filler`) and the opening note (a developer item in `initial_items`), both proven on the live service. Other session fields we probed, such as noise reduction, turn detection and text output, break the call, so Argo does not offer them. What the voice reads out is decided by Argo's relay: with final answers only, the relay passes on the Agent's answer of a Turn and holds back its progress.
- **Volume and microphone gain reach a running call at once.** The App applies them to its own sound, so they travel in the Voice status every App already watches, and a change from an Agent or the CLI is heard without a new call. Everything else in the call options applies from the next call.
- **Microphone and speaker stay each Device's own.** A Device keeps its own choice, since another Device has other microphones and speakers. Each App that can carry a call reports its microphones, speakers and choice to the Server over its own Connection (the `voice.devices` stream, App plumbing like `navigation.requests`), and subscribes again when they change. `voice.listDevices` and `voice.chooseDevices` act on one App: the one carrying the running call, else the one that started the last call, else the one that connected last. The Server pushes the choice to that App, which keeps it as if chosen in Settings › Voice; a running call moves to it at once.
