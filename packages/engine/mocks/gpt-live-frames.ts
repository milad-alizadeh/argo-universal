/*
 * Control-link text frames as the live GPT-Live service sent them in a recorded call (#2405, 2026-11-19; audio frames removed).
 * The person asked for the project's files and the voice answered "Okay, I'll take a look."
 */

export const sessionStarted =
  '{"type":"session.started","session":{"id":"rtc_u32_ElnYgp3oMyAgM167hTZLqGRdoshK34iv","status":"active","expires_at":1795067826}}';

export const personTurnId = 'turn_ElnYlypvAPD0BSDR0Haeg';

export const personSaid =
  'Hi, please list the files in the root folder of this project';

// The person's words arrive a chunk at a time, each under its own item id.
export const personWords =
  '{"type":"input_transcript.added","end_ms":1400,"item":{"id":"item_ElnYl1s1aVXniJngfZ2Sz","type":"input_transcript","text":" Hi, please"},"start_ms":1200}';

export const personTurnOpens =
  '{"type":"turn.created","turn":{"id":"turn_ElnYlypvAPD0BSDR0Haeg","end_ms":1400,"role":"user","start_ms":1200,"transcript":" Hi, please"}}';

export const personMoreWords =
  '{"type":"input_transcript.added","end_ms":1600,"item":{"id":"item_ElnYlzPXvOktphQ09kM3T","type":"input_transcript","text":" list"},"start_ms":1400}';

export const personTurnGrows =
  '{"type":"turn.delta","delta":" list","end_ms":1600,"start_ms":1400,"turn_id":"turn_ElnYlypvAPD0BSDR0Haeg"}';

// The user turn's own transcript holds the whole utterance.
export const personTurnDone =
  '{"type":"turn.done","turn":{"id":"turn_ElnYlypvAPD0BSDR0Haeg","end_ms":5400,"role":"user","start_ms":1200,"transcript":" Hi, please list the files in the root folder of this project"}}';

export const delegationItem = 'item_ElnYohAk9JK8CbduolcvV';

// The recording cut this frame off after `offset_ms`; its value here is a stand-in.
export const delegationCreated =
  '{"type":"delegation.created","item":{"id":"item_ElnYohAk9JK8CbduolcvV","type":"delegation","content":[{"type":"input_text","text":"Hi, please list the files in the root folder of this project"}],"handoff_id":"handoff_1","target":"client","user_bidi_turn_id":"turn_ElnYlypvAPD0BSDR0Haeg"},"offset_ms":4000}';

export const voiceTurnId = 'turn_ElnYpcwGda0vchfrIUvO2';

export const voiceSaid = "Okay, I'll take a look.";

export const voiceWords =
  '{"type":"output_transcript.added","end_ms":5200,"item":{"id":"item_ElnYp73GvhRUuMawnfzrq","type":"output_transcript","text":" Okay"},"start_ms":5000}';

export const voiceMoreWords =
  '{"type":"output_transcript.added","end_ms":5400,"item":{"id":"item_ElnYpjVGjAoheNIcBxSoB","type":"output_transcript","text":","},"start_ms":5200}';

export const voiceTurnOpens =
  '{"type":"turn.created","turn":{"id":"turn_ElnYpcwGda0vchfrIUvO2","end_ms":5400,"role":"assistant","start_ms":5200,"transcript":" Okay"}}';

export const voiceTurnGrows =
  '{"type":"turn.delta","delta":",","end_ms":5400,"start_ms":5200,"turn_id":"turn_ElnYpcwGda0vchfrIUvO2"}';

export const voiceTurnDone =
  '{"type":"turn.done","turn":{"id":"turn_ElnYpcwGda0vchfrIUvO2","end_ms":8400,"role":"assistant","start_ms":5200,"transcript":" Okay, I\'ll take a look."}}';

// The service reports audio time used, not tokens, every fifteen seconds; the allowance fields were null throughout.
export const usageUpdated =
  '{"type":"session.usage.updated","usage":{"audio_duration_ms":11800,"backend_model_usage":[]},"usage_limit":{"status":null,"reset_seconds":null}}';

/*
 * How the live service closed calls on its own (#2405 probes, 2026-11-19). With no audio reaching it, it sent
 * `session.closed` with `expired` about 30 s in, then dropped the link without a close frame (1006); a dropped
 * peer connection dropped the link the same way with no `session.closed` at all. A link asked for again after either
 * was refused with 404 `session_id_not_found`.
 */
export const sessionClosedFor = (reason: string): string =>
  `{"type":"session.closed","reason":"${reason}","usage":{"audio_duration_ms":0,"backend_model_usage":[]}}`;

export const sessionClosedSilently =
  '{"type":"session.closed","usage":{"audio_duration_ms":0,"backend_model_usage":[]}}';

// A session that expires at `expiresAt`, in seconds since the epoch.
export const sessionStartedUntil = (expiresAt: number): string =>
  `{"type":"session.started","session":{"id":"rtc_u32_EloR0p3oNNKkPmpaqCjruZBPqJQOFvS1","status":"active","expires_at":${expiresAt}}}`;
