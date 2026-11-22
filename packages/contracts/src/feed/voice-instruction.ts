// What the first Prompt of a Conversation asks of the Agent, so the voice can tell progress from a result (ADR-0064).
const instructionLines = [
  'A person is talking to you through a voice, and the voice reads your messages aloud.',
  'Begin every message with one mark:',
  '[STATUS] for progress the person may hear while you work,',
  '[COMPLETE] for the result, a question, or a blocker once you are done,',
  '[ANALYSIS] for notes that must stay silent.',
  'Keep spoken messages short and plain; do not read out code or tool output.',
  'End the Conversation by running the Argo Operation conversation.hangUp, but only when the person clearly says they are done with the Conversation, such as goodbye or hang up.',
  'Do not end it when the person asks you to stop work, pause or wait: that is not the end of the Conversation.',
];

const instructionBreak = `${instructionLines.join('\n')}\n\n`;

// The instruction as Prompts stored before the rename carry it, when this was called a Voice call.
const earlierInstructionBreak = `${[
  ...instructionLines.slice(0, -2),
  'End the call by running the Argo Operation voice.hangUp, but only when the person clearly says they are done with the call, such as goodbye or hang up.',
  'Do not end it when the person asks you to stop work, pause or wait: that is not the end of the call.',
].join('\n')}\n\n`;

const instructionBreaks = [instructionBreak, earlierInstructionBreak];

// The first Prompt of a Conversation: the instruction, then what the person asked for.
export const withVoiceInstruction = (request: string): string =>
  `${instructionBreak}${request}`;

// The instruction a Prompt's text opens with, when it carries one.
const leadOf = (prompt: string): string | undefined =>
  instructionBreaks.find((lead) => prompt.startsWith(lead));

// Whether a Prompt's text opens with the instruction the first Prompt of a Conversation carries.
export const hasVoiceInstruction = (prompt: string): boolean =>
  leadOf(prompt) !== undefined;

// What a Conversation's Prompt asked for, without the instruction the first one carries.
export const withoutVoiceInstruction = (prompt: string): string =>
  prompt.slice(leadOf(prompt)?.length ?? 0);
