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
- **Call options are Argo's, unless the service honours them.** `voice.setCallOptions` keeps the filler words, an opening note, the idle timeout, the volume and the microphone gain. Only two go to GPT-Live: the filler words (`delegation.ack_filler`) and the opening note (a developer item in `initial_items`), both proven on the live service. Other session fields we probed, such as noise reduction, turn detection and text output, break the call, so Argo does not offer them.
- **Volume and microphone gain reach a running call at once.** The App applies them to its own sound, so they travel in the Voice status every App already watches, and a change from an Agent or the CLI is heard without a new call. Everything else in the call options applies from the next call.
- **Microphone and speaker stay each Device's own.** A Device keeps its own choice, since another Device has other microphones and speakers. Each App that can carry a call reports its microphones, speakers and choice to the Server over its own Connection (the `voice.devices` stream, App plumbing like `navigation.requests`), and subscribes again when they change. `voice.listDevices` and `voice.chooseDevices` act on one App: the one carrying the running call, else the one that started the last call, else the one that connected last. The Server pushes the choice to that App, which keeps it as if chosen in Settings › Voice; a running call moves to it at once.

## Screen sight (#2473)

Owner spec, 2026-11-19. An Agent and the voice can see the person's whole screen as one still picture. Owner amendment, 2026-11-20: no permission prompt. Nothing asks the person before a capture, not a Permission request, not a spoken ask and not the system's display picker; the safeguards are the Device switch, which is off until the person turns it on, the one Notice shown for each attempt, and that the picture is never kept.

- **The Voice provider interface gains one optional capability: send an image.** A call that can carries `look`, which gives the voice one still frame as background it may look at, never as something to say. The call tells the Engine when it answers whether it has `look`. A call without it changes nothing else: the Engine takes no picture for it, and Agents still see the screen through the Operation.
- **The voice asks for a frame through the request-for-work path.** A `frame.requested` event reaches the call's relay as a `work.requested` does, and the call's relay answers it. The Engine asks the App, then hands the image to the provider.
- **The Operation `app.screenshot` is `act`.** An Agent calls it with no Permission request, as does the person. It answers `captured` with the image, `refused` (`off`), `not_opened` or `not_available`, and never claims a picture it did not take.
- **The Server asks the one desktop App on the Server Device.** The App tells the desktop main process each change of its Device preference, off by default and reported again at startup, and main answers `refused` with `off` to every capture until it is told yes, so no caller of the preload can skip the switch and turning it on or off needs no new subscription. The desktop App takes the picture of the main display itself, through its preload, with no picker, and owns the words about system permission; it answers each capture request over its own Connection; only the Connection that was asked can answer. With no such App the answer is `not_opened`. A browser share-prompt fallback was removed: the web has no capture path, because the Server asks only the desktop App.
- **The picture is never stored and never drawn in the Feed.** An Agent's Tool call settles as `captured` without the image; the image reaches the Agent as an image through its MCP result, and reaches the voice through `look`. The Feed gets one Notice that a capture was taken, and by whom.
- **GPT-Live reports that it cannot send an image** until a still frame is sent on a live call and the voice describes it (`docs/research/voice-mode.md`, section 15). Until then this ships as the Operation alone for Agents.

## The voice watches the Sessions its Session started

Owner amendment, 2026-11-20 (#2506, #2507). A Session started on a call stopped on an Elicitation, and the voice never said so: the decision above left watching other Sessions to the Session's Agent, and an Agent only looks when it is asked. Codex desktop pushes a child's final status and last message into its parent's context without starting a Turn, and sends a child's approvals to the person, not to the parent's model ([research](../research/codex-subagent-notifications.md)). Argo does the same for the voice.

- **The Server tells the voice; nothing is polled.** While a call runs, the Engine watches the Started Sessions and Agents of the call's Session: those running when the call starts and any started during it. It does not watch the ones they start. What it hears goes to the voice as speech, never as a Prompt, so no Agent Turn starts and no Agent tokens are spent.
- **What the voice says:** a watched Session or Agent finished, with its last Agent message; it failed, with why; or it is stopped on an Input request, a Permission request or an Elicitation, with its title or question, which the person answers on screen. Each is said once. The call's own Session's Elicitation is said the same way.
- **Stuck means waiting on the person.** A watched Session that waits on an Input request is said; there is no timer for a Turn that is merely slow, as Codex has none.
- **What the Agent says outside a Turn is read whole.** A reply to a hand-back or a task notification can settle with no Turn and keep growing while the Agent streams it, so the voice hears it once it stops growing. A result is spoken; progress and silent analysis stay background, since no Turn end comes to speak them.
- **Nothing new is drawn.** What the voice says is stored as the voice's transcript rows, as before.
