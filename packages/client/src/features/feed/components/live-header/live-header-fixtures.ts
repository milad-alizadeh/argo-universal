import type { OrbState } from '@repo/kit/primitives/status/orb';
import type { LiveHeaderProps } from './live-header';
import {
  liveHeaderNow,
  requestHeader,
  retryHeader,
  thoughtHeader,
  toolCallStep,
  toolCallStepMoving,
  workingHeader,
} from './live-header.mocks';

// Every fixture reads the same fixed clock, so the elapsed time never moves between stories.

export const waitingHeader = {
  liveHeader: requestHeader,
  now: liveHeaderNow,
} satisfies LiveHeaderProps;

export const retryingHeader = {
  liveHeader: retryHeader,
  now: liveHeaderNow,
} satisfies LiveHeaderProps;

export const workingLiveHeader = {
  liveHeader: workingHeader,
  now: liveHeaderNow,
} satisfies LiveHeaderProps;

export const thinkingHeader = {
  liveHeader: thoughtHeader,
  now: liveHeaderNow,
} satisfies LiveHeaderProps;

export const toolCallHeader = {
  liveHeader: toolCallStep.liveHeader,
  toolCall: toolCallStep.toolCall,
  now: liveHeaderNow,
} satisfies LiveHeaderProps;

// A running Tool call of one kind, for the Orb that kind moves.
const movingHeader = (state: OrbState): LiveHeaderProps => {
  const step = toolCallStepMoving(state);

  return {
    liveHeader: step.liveHeader,
    toolCall: step.toolCall,
    now: liveHeaderNow,
  };
};

// Reading a file: the Orb scans as a globe.
export const searchingHeader = movingHeader('searching');

// Editing a file: the Orb writes as a ribbon.
export const composingHeader = movingHeader('composing');

// Running a command: the Orb morphs.
export const shapingHeader = movingHeader('shaping');
