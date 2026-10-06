import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  recordedAgentMessage,
  recordedUserMessage,
  redSquareDataUrl,
  streamingAgentMessage,
} from './feed-message-mock';

describe('Feed message mocks', () => {
  it('serves the bytes the recorded image block names', () => {
    const bytes = Buffer.from(redSquareDataUrl.split(',')[1] ?? '', 'base64');
    const image = recordedUserMessage('agent-1', 'image-prompt').content.find(
      (block) => block.type === 'image',
    );
    expect(image?.blob.blobId).toBe(
      createHash('sha256').update(bytes).digest('hex'),
    );
  });

  it.each(['agent-1', 'agent-2'] as const)(
    'replays %s mid-stream to a prefix of the settled answer',
    (agent) => {
      const streaming = streamingAgentMessage(agent, 'markdown-answer');
      const settled = recordedAgentMessage(agent, 'markdown-answer');
      const [streamed] = streaming.content;
      const [answer] = settled.content;
      if (streamed?.type !== 'text' || answer?.type !== 'text')
        throw new Error('Expected text');
      expect(streaming.state).toBe('open');
      expect(answer.text.startsWith(streamed.text)).toBe(true);
      expect(streamed.text.length).toBeLessThan(answer.text.length);
    },
  );
});
