import type { FeedContext } from '../feed-machine-types';
import type { AssembledContent } from './assembly';

export const acceptedStreams = (
  context: FeedContext,
  result: Pick<AssembledContent, 'streams' | 'toolContents'>,
): Pick<FeedContext, 'messageStreams' | 'toolContents'> => ({
  messageStreams: result.streams ?? context.messageStreams,
  toolContents: result.toolContents ?? context.toolContents,
});
