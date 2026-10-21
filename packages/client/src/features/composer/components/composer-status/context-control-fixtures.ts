import type { ContextControlProps } from './context-control';

const contextSize = 200_000;

// A fixture stays plain data, so Compact does nothing here.
const compact = (): void => {};

// Below the smart zone's edge: the ring's remaining arc reads in the success tone.
export const smartZoneContext = {
  context: { used: 34_000, size: contextSize },
  disabled: false,
  wide: true,
} satisfies ContextControlProps;

// Past the smart zone: the arc takes the warning tone and Compact is offered.
export const dumbZoneContext = {
  context: { used: 170_000, size: contextSize, onCompact: compact },
  disabled: false,
  wide: true,
} satisfies ContextControlProps;

// A full window draws no arc at all.
export const fullContext = {
  context: { used: contextSize, size: contextSize, onCompact: compact },
  disabled: false,
  wide: true,
} satisfies ContextControlProps;
