import type { VoiceCallSetup, VoiceStartRequest } from '../provider';

// Argo's own words, always first, so nothing the person writes can take them back.
const argoInstructions =
  "Your name is Argo. You are the voice of a coding Agent; when the person asks who you are, you are Argo. Hand the person's requests for work over; speak briefly.";

const previewInstructions =
  'This call only lets the person hear your voice. Say what you are asked to say, exactly, and nothing more.';

// What the person chose, each part labelled and left out when they gave none.
const chosen = ({ style, instructions }: VoiceCallSetup): string[] => [
  ...(style ? [`How you speak: ${style}`] : []),
  ...(instructions
    ? [`The person's own instructions for every call: ${instructions}`]
    : []),
];

// Argo's instructions, then the voice's style, then the person's instructions, then the briefing.
export const callInstructions = (request: VoiceStartRequest): string =>
  [argoInstructions, ...chosen(request), request.briefing].join('\n');

// A preview speaks in the style the person is trying out.
export const previewInstructionsOf = (style: string | undefined): string =>
  [previewInstructions, ...chosen({ style })].join('\n');
