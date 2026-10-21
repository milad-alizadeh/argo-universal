import type { LiveHeaderProps } from './live-header';
import {
  liveHeaderNow,
  requestHeader,
  retryHeader,
  thoughtHeader,
  toolCallStep,
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
